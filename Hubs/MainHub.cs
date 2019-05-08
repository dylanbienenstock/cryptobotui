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

namespace CryptoBotUI.Hubs
{
    public class MainHub : Hub
    {
        private ExchangeNetworkService _exchangeNetworkService;
        private ExchangeNetwork _network => _exchangeNetworkService.Network;

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

                public ExchangeSnapshot() { }

                public ExchangeSnapshot(Exchange exchange)
                {
                    Name = exchange.Name;
                    Fee  = exchange.Fee;
                    MarketRefs = exchange.Markets.Values
                        .Select(m => new MarketReference(m))
                        .ToArray();
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

                public BacktestDataCompletion() { }

                public BacktestDataCompletion(Market market, CompletionTuple completion)
                {
                    MarketRef    = new MarketReference(market);
                    CompleteDays = (int)Math.Round(completion.CompleteDays);
                    TotalDays    = (int)Math.Round(completion.TotalDays);
                    Ratio        = completion.CompleteDays / completion.TotalDays;
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
                foreach (var exchange in _network.Exchanges)
                {
                    var markets = exchange.Markets.Values
                        .OrderBy(m => m.Symbol);

                    foreach (var market in markets)
                    {
                        await Task.Delay(100);

                        await BacktestDatabase.GetDataCompletion(market)
                            .ContinueWith(async (rawStatusTask) => {
                                var rawStatus = await rawStatusTask;
                                var status = new Data.BacktestDataCompletion(market, rawStatus);
                                await stream.Writer.WriteAsync(status);
                            });
                    }
                }
            });

            return stream.Reader;
        }

        public ChannelReader<Data.BacktestDataCompletion> StartCollectingBacktestData(MarketReference marketRef)
        {
            var stream = Channel.CreateUnbounded<Data.BacktestDataCompletion>();

            Task.Run(() =>
            {
                var market = _network.GetMarket(marketRef.ExchangeName, marketRef.Symbol, true);

                try
                {
                    var subject = BacktestDatabase.StartCollectingData(market);

                    subject.Subscribe
                    (
                        onNext: async (rawStatus) =>
                        {
                            var status = new Data.BacktestDataCompletion(market, rawStatus);
                            await stream.Writer.WriteAsync(status);
                        },
                        onCompleted: () =>   stream.Writer.Complete(),
                        onError:     (ex) => stream.Writer.Complete(ex)
                    );
                }
                catch (Exception ex)
                {
                    Console.WriteLine(ex);
                }

            });

            return stream.Reader;
        }

        public HubResponse StopCollectingBacktestData(MarketReference marketRef)
        {
            try
            {
                Console.WriteLine($"{marketRef.ExchangeName} | {marketRef.Symbol}");
                var market = _network.GetMarket(marketRef.ExchangeName, marketRef.Symbol, true);
                BacktestDatabase.StopCollectingData(market);
                Console.WriteLine("STOP COLLECTING: " + marketRef.Symbol);

                return new SuccessResponse();
            }
            catch (Exception ex)
            {
                throw ex;
                // return new FailureResponse(ex);
            }
        }
    }
}