using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using CryptoBot.Exchanges;
using CryptoBotUI.Services;
using CryptoBotUI.Hubs.Types;
using System.Linq;
using CryptoBot.Storage;
using System.Threading.Channels;
using CryptoBot.Exchanges.Currencies;
using MessagePack;
using System.Reactive.Linq;
using CryptoBotUI.Hubs.Messages;
using CryptoBot.Indicators;
using System.Collections.Generic;
using System.Threading;
using CryptoBot.Exchanges.Orders;

namespace CryptoBotUI.Hubs
{
    public class MainHub : Hub
    {
        private ExchangeNetworkService _exchangeNetworkService;
        private ExchangeNetwork _network => _exchangeNetworkService.Network;
        private TimeSpan _bufferTime = TimeSpan.FromMilliseconds(500);

        public MainHub(ExchangeNetworkService exchangeNetworkService)
        {
            _exchangeNetworkService = exchangeNetworkService;
        }

        public static class Data
        {
            [MessagePackObject]
            public class ExchangeSnapshot
            {
                [Key("name")]
                public string Name;

                [Key("fee")]
                public decimal Fee;

                [Key("marketRefs")]
                public MarketReference[] MarketRefs;

                // [Key("currencyPrecisions")]
                // public (string, int)[] CurrencyPrecisions;

                public ExchangeSnapshot() { }

                public ExchangeSnapshot(Exchange exchange)
                {
                    Name = exchange.Name;
                    Fee  = exchange.Fee;
                    MarketRefs = exchange.Markets.Values
                        .Select(m => new MarketReference(m))
                        .ToArray();
                    // CurrencyPrecisions = exchange..Markets.Values
                    //     .Select(c => (Enum.GetName(typeof(Currency), c), exchange.GetAmountStepSize(c)))
                    //     .ToArray();
                }
            }

            [MessagePackObject]
            public class BacktestDataCompletion
            {
                [Key("marketRef")]
                public MarketReference MarketRef;

                [Key("completeDays")]
                public int CompleteDays;

                [Key("totalDays")]
                public int TotalDays;

                [Key("ratio")]
                public double Ratio;

                [Key("collecting")]
                public bool Collecting;

                public BacktestDataCompletion() { }

                public BacktestDataCompletion(Market market, CompletionTuple completion)
                {
                    MarketRef    = new MarketReference(market);
                    CompleteDays = (int)Math.Round(completion.CompleteDays);
                    TotalDays    = (int)Math.Round(completion.TotalDays);
                    Ratio        = completion.CompleteDays / completion.TotalDays;
                    Collecting   = completion.Collecting;
                }
            }
        }

        public static class Responses
        {
            [MessagePackObject]
            public class NetworkSnapshot
            {
                [Key("exchangeSnapshots")]
                public Data.ExchangeSnapshot[] ExchangeSnapshots;

                public NetworkSnapshot() { }

                public NetworkSnapshot(ExchangeNetwork network)
                {
                    ExchangeSnapshots = network.Exchanges
                        .Select(e => new Data.ExchangeSnapshot(e))
                        .ToArray();
                }
            }
        }

        private Task StreamClosed<T>(Channel<T> stream, CancellationToken token)
        {
            var closed = new TaskCompletionSource<int>();

            void Done(int completionCode) =>
                closed.TrySetResult(completionCode);

            try
            {
                Context.ConnectionAborted.Register(() => Done(1));
            }
            catch
            {
                // ! Do nothing?
            }

            token.Register(() => Done(2));
            stream.Reader.Completion.ContinueWith(_ => Done(3));

            return closed.Task;
        }

        public HubResponse<Responses.NetworkSnapshot> GetExchangeNetworkSnapshot()
        {
            try
            {
                var snapshot = new Responses.NetworkSnapshot(_network);
                return new SuccessResponse<Responses.NetworkSnapshot>(snapshot);
            }
            catch (Exception ex)
            {
                return new FailureResponse<Responses.NetworkSnapshot>(ex.Message);
            }
        }

        public ChannelReader<Data.BacktestDataCompletion> StreamBacktestDataCompletion()
        {
            var stream = Channel.CreateUnbounded<Data.BacktestDataCompletion>();

            Task.Run(async () =>
            {
                try
                {
                    foreach (var exchange in _network.Exchanges)
                    {
                        var markets = exchange.Markets.Values
                            .OrderBy(m => m.Symbol);

                        foreach (var market in markets)
                        {
                            await Task.Delay(25);

                            await BacktestDatabase.GetDataCompletion(market)
                                .ContinueWith(async (rawStatusTask) => {
                                    var rawStatus = await rawStatusTask;
                                    var status = new Data.BacktestDataCompletion(market, rawStatus);
                                    await stream.Writer.WaitToWriteAsync();
                                    await stream.Writer.WriteAsync(status);
                                });
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }
                finally
                {
                    stream.Writer.Complete();
                }
            });

            return stream.Reader;
        }

        public ChannelReader<Data.BacktestDataCompletion> StartCollectingBacktestData(MarketReference marketRef)
        {
            var stream = Channel.CreateUnbounded<Data.BacktestDataCompletion>();
            var cancellationTokenSource = new CancellationTokenSource();

            Task.Run(() =>
            {
                var market = _network.GetMarket(marketRef.ExchangeName, marketRef.Symbol, true);

                try
                {
                    var subject = BacktestDatabase.StartCollectingData(market);

                    subject.Subscribe
                    (
                        onNext: async rawStatus =>
                        {
                            var status = new Data.BacktestDataCompletion(market, rawStatus);
                            await stream.Writer.WriteAsync(status);
                        },
                        onCompleted: () => {
                            stream.Writer.TryComplete();
                            cancellationTokenSource.Cancel();  
                        },
                        onError: ex => throw ex
                    );

                    Context.ConnectionAborted.WaitHandle.WaitOne();
                }
                catch (TaskCanceledException) { }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }
                finally
                {
                    cancellationTokenSource.Cancel();
                }
            }, cancellationTokenSource.Token);

            return stream.Reader;
        }

        public HubResponse StopCollectingBacktestData(MarketReference marketRef)
        {
            try
            {
                var market = _network.GetMarket(marketRef.ExchangeName, marketRef.Symbol, true);
                BacktestDatabase.StopCollectingData(market);
                return new SuccessResponse();
            }
            catch (Exception ex)
            {
                throw ex;
                // return new FailureResponse(ex);
            }
        }

        public ChannelReader<IndicatorChange> SubscribeToIndicator(IndicatorReference indicatorRef, CancellationToken token)
        {
            Console.WriteLine("Got request for indicator: " + Newtonsoft.Json.JsonConvert.SerializeObject(indicatorRef, Newtonsoft.Json.Formatting.Indented));

            var stream = Channel.CreateUnbounded<IndicatorChange>();

            Task.Run(async () =>
            {
                IDisposable subscription = null;

                try
                {
                    var indicator = await _exchangeNetworkService.GetIndicator(indicatorRef);

                    SpinWait.SpinUntil(() => indicator.DataAggregate.PrimaryField.Values.Complete);
                    
                    var initialChange = GetInitialIndicatorChange(indicator);
                    await stream.Writer.WriteAsync(initialChange);

                    subscription = indicator.Output
                        .Select(o => GetIndicatorChange(o, indicator))
                        .Subscribe
                        (
                            onNext: (msg) => stream.Writer.WriteAsync(msg),
                            onCompleted: () => stream.Writer.TryComplete(),
                            onError: (ex) => throw ex
                        );

                    await StreamClosed(stream, token);
                }
                catch (OperationCanceledException)
                {
                    // Do nothing
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }
                finally
                {
                    if (subscription != null) {
                        subscription.Dispose();
                        stream.Writer.Complete();
                    }
                }
            });

            return stream.Reader;
        }

        public HubResponse<IndicatorDetails[]> GetIndicatorList() =>
            new SuccessResponse<IndicatorDetails[]>(IndicatorList.GetAllIndicatorDescriptions());

        public async Task<HubResponse<IndicatorChange>> GetIndicatorData(IndicatorDataReference indicatorDataRef)
        {
            var extraPeriods  = 250;
            var indicatorRef  = indicatorDataRef.IndicatorRef;
            var marketRef     = indicatorDataRef.IndicatorRef.MarketRef;
            var market        = _exchangeNetworkService.GetMarket(marketRef);
            var startTime     = (double)indicatorDataRef.StartMinute - (double)extraPeriods * (double)indicatorRef.TimeFrame;
            var endTime       = Math.Ceiling((double)indicatorDataRef.EndMinute / (double)indicatorRef.TimeFrame) * (double)indicatorRef.TimeFrame;
            var periods       = await _network.GetTradingPeriods(market, startTime, endTime, indicatorRef.TimeFrame);
            var indicator     = await _exchangeNetworkService.GetIndicator(indicatorRef);
            var dataAggregate = indicator.ProcessOutsideManifold(indicatorRef.TimeFrame, periods);
            var change        = GetInitialIndicatorChange(indicator, dataAggregate);

            return new SuccessResponse<IndicatorChange>(change);
        }

        private static IndicatorChange GetIndicatorChange
        (
            IndicatorOutput output,
            Indicator indicator
        )
        {
            return new IndicatorChange
            (
                indicatorId: indicator.Id,
                changes: output.Changes.Select
                (
                    kv => new IndicatorFieldChange
                    (
                        fieldName: kv.Key,
                        changes: new[] { new TimeSeriesChange(output.Time, kv.Value) }
                    )
                )
                .ToArray()
            );
        }

        private static IndicatorChange GetInitialIndicatorChange
        (
            Indicator indicator,
            IndicatorDataAggregate dataAggregate = null
        )
        {
            return new IndicatorChange
            (
                indicatorId: indicator.Id,
                changes: (dataAggregate ?? indicator.DataAggregate).Fields.Values.Select
                (
                    field => new IndicatorFieldChange
                    (
                        fieldName: field.FieldName,
                        changes: field.Values.Select
                        (
                            node => new TimeSeriesChange
                            (
                                time: field.Values.GetTime(node),
                                value: node.Value
                            )
                        )
                        .ToArray()
                    )
                )
                .ToArray()
            );
        }

        public ChannelReader<OrderMessage[]> SubscribeToOrderbook(MarketReference marketRef, CancellationToken token)
        {
            var stream = Channel.CreateUnbounded<OrderMessage[]>();

            Task.Run(async () =>
            {
                IDisposable subscription = null;
                var market = _network.GetMarket(marketRef.ExchangeName, marketRef.Symbol, true);
                var pair = CurrencyPair.FromGenericSymbol(marketRef.Symbol);

                try
                {
                    var now = DateTime.UtcNow;
                    OrderMessage[] snapshot = null;
                    bool upToDate = false;

                    subscription = _network.MergedOrderStream
                        .Where (o => o.Exchange.Name == marketRef.ExchangeName)
                        .Where (o => o.Pair.Equals(pair))
                        .Select(o => new OrderMessage(o))
                        .Buffer(_bufferTime)
                        .Select(bf => bf.ToArray())
                        .Subscribe
                        (
                            onNext: async (msg) => {
                                SpinWait.SpinUntil(() => upToDate);
                                await stream.Writer.WaitToWriteAsync();
                                await stream.Writer.WriteAsync(msg);
                            },
                            onCompleted: ()    => stream.Writer.TryComplete(),
                            onError:     (ex)  => throw ex
                        );
                        
                    lock (market.Orders.Bids)
                    { 
                        lock (market.Orders.Asks)
                        {
                            // Send snapshot
                            OrderMessage[] partialSnapshot(OrderList orderList) => orderList
                                .ToArray()
                                .Select(node => new CurrencyOrder
                                (
                                    exchange: market.Exchange,
                                    symbol:   market.Symbol,
                                    side:     orderList.Side,
                                    price:    node.Price,
                                    amount:   node.Amount.Sum(),
                                    time:     now
                                ))
                                .Select(order => new OrderMessage(order))
                                .ToArray();

                            snapshot = partialSnapshot(market.Orders.Bids)
                                .Concat(partialSnapshot(market.Orders.Asks))
                                .ToArray();
                        }
                    }

                    await stream.Writer.WaitToWriteAsync();
                    await stream.Writer.WriteAsync(snapshot);

                    upToDate = true;

                    await StreamClosed(stream, token);
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }
                finally
                {
                    if (subscription != null) {
                        subscription.Dispose();
                        stream.Writer.Complete();
                    }
                }
            });

            return stream.Reader;
        }

        public ChannelReader<TradeMessage[]> SubscribeToTrades(MarketReference marketRef, CancellationToken token)
        {
            var stream = Channel.CreateUnbounded<TradeMessage[]>();

            Task.Run(async () =>
            {
                IDisposable subscription = null;
                var market = _network.GetMarket(marketRef.ExchangeName, marketRef.Symbol, true);
                var pair = CurrencyPair.FromGenericSymbol(marketRef.Symbol);

                try
                {
                    var now = DateTime.UtcNow;

                    subscription = _network.MergedTradeStream
                        .Where (o => o.Exchange.Name == marketRef.ExchangeName)
                        .Where (o => o.Pair.Equals(pair))
                        .Select(t => new TradeMessage(t))
                        .Buffer(_bufferTime)
                        .Select(bf => bf.ToArray())
                        .Subscribe
                        (
                            onNext:      (msg) => stream.Writer.WriteAsync(msg),
                            onCompleted: ()    => stream.Writer.TryComplete(),
                            onError:     (ex)  => throw ex
                        );

                    await StreamClosed(stream, token);
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }
                finally
                {
                    if (subscription != null) {
                        subscription.Dispose();
                        stream.Writer.Complete();
                    }
                }
            });

            return stream.Reader;
        }

        public ChannelReader<MarketTickerMessage[]> SubscribeToMarketTickers(string exchangeName, CancellationToken token)
        {
            var stream = Channel.CreateUnbounded<MarketTickerMessage[]>();
            var exchange = _network.GetExchange(exchangeName);
            var done = false;

            Task.Run(async () => {
                await StreamClosed(stream, token);
                done = true;
            });

            Task.Run(async () => {
                while (!done) {
                    var marketTickers = await exchange.GetMarketTickers();
                    var messages = marketTickers
                        .Select(mt => new MarketTickerMessage(mt))
                        .ToArray();

                    await stream.Writer.WaitToWriteAsync();
                    await stream.Writer.WriteAsync(messages);
                    await Task.Delay(60000, token);
                }
            });

            return stream.Reader;
        }
    }
}