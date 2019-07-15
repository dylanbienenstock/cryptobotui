using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using CryptoBot.Exchanges;
using CryptoBot.Indicators;
using CryptoBotUI.Hubs;
using CryptoBotUI.Hubs.Messages;
using CryptoBotUI.Hubs.Types;
using Konsole;
using Microsoft.AspNetCore.SignalR;

namespace CryptoBotUI.Services
{
    public class ExchangeNetworkService
    {
        public ExchangeNetwork   Network    { get; private set; }
        public bool              Connected  { get; private set; }
        public IndicatorManifold Indicators => Network.Indicators;

        private IHubContext<MainHub> _hubContext;

        public ExchangeNetworkService(IHubContext<MainHub> hubContext)
        {
            _hubContext = hubContext;

            Network = new ExchangeNetwork
            (
                exchanges: new Exchange[]
                {
                    new Binance()
                }
                // currencies: new Currency[] {
                //     Currency.BTC, Currency.USDT
                // },
                // filter: CurrencyFilter.Both
            );

            Connect();
            SpinWait.SpinUntil(() => Connected);
        }

        public async void Connect()
        {
            await Network.Connect();
            Console.Clear();

            Console.WriteLine(@"
00000000   01 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00   ................
00000010   00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00   ................
00000020   00 00 00 00 3B A3 ED FD  7A 7B 12 B2 7A C7 2C 3E   ....;£íýz{.²zÇ,>
00000030   67 76 8F 61 7F C8 1B C3  88 8A 51 32 3A 9F B8 AA   gv.a.È.ÃˆŠQ2:Ÿ¸ª
00000040   4B 1E 5E 4A 29 AB 5F 49  FF FF 00 1D 1D AC 2B 7C   K.^J)«_Iÿÿ...¬+|
00000050   01 01 00 00 00 01 00 00  00 00 00 00 00 00 00 00   ................
00000060   00 00 00 00 00 00 00 00  00 00 00 00 00 00 00 00   ................
00000070   00 00 00 00 00 00 FF FF  FF FF 4D 04 FF FF 00 1D   ......ÿÿÿÿM.ÿÿ..
00000080   01 04 45 54 68 65 20 54  69 6D 65 73 20 30 33 2F   ..EThe Times 03/
00000090   4A 61 6E 2F 32 30 30 39  20 43 68 61 6E 63 65 6C   Jan/2009 Chancel
000000A0   6C 6F 72 20 6F 6E 20 62  72 69 6E 6B 20 6F 66 20   lor on brink of 
000000B0   73 65 63 6F 6E 64 20 62  61 69 6C 6F 75 74 20 66   second bailout f
000000C0   6F 72 20 62 61 6E 6B 73  FF FF FF FF 01 00 F2 05   or banksÿÿÿÿ..ò.
000000D0   2A 01 00 00 00 43 41 04  67 8A FD B0 FE 55 48 27   *....CA.gŠý°þUH'
000000E0   19 67 F1 A6 71 30 B7 10  5C D6 A8 28 E0 39 09 A6   .gñ¦q0·.\Ö¨(à9.¦
000000F0   79 62 E0 EA 1F 61 DE B6  49 F6 BC 3F 4C EF 38 C4   ybàê.aÞ¶Iö¼?Lï8Ä
00000100   F3 55 04 E5 1E C1 12 DE  5C 38 4D F7 BA 0B 8D 57   óU.å.Á.Þ\8M÷º..W
00000110   8A 4C 70 2B 6B F1 1D 5F  AC 00 00 00 00            ŠLp+kñ._¬....");
            Console.WriteLine("\n\"The Times 03/Jan/2009 Chancellor on brink of second bailout for banks\"\n");
            Console.WriteLine(new String('-', Console.WindowWidth) + "\n");

            var n = Network.Exchanges.Length;
            var s = n != 1 ? "s" : "";
            Console.WriteLine($"Connecting to {n} exchange{s}...\n");

            var progressBars = new Dictionary<Exchange, ProgressBar>();
            Network.SyncStatus.Subscribe
            (
                onNext: status => {
                    if (!progressBars.ContainsKey(status.Exchange))
                        progressBars[status.Exchange] = new ProgressBar(status.Total);

                    progressBars[status.Exchange]
                        .Refresh(status.Completed, status.Exchange.Name);
                },
                onError: _ => {},
                onCompleted: () => Console.WriteLine("\nConnected!\n\n\n")
            );

            Connected = true;
        }

        public Market GetMarket(MarketReference marketRef)
        {
            if (!Connected) SpinWait.SpinUntil(() => Connected);

            return Network.GetMarket
            (
                name:    marketRef.ExchangeName,
                symbol:  marketRef.Symbol,
                generic: true
            );
        }

        public async Task<Indicator> GetIndicator(IndicatorReference indicatorRef, bool getHistory = true)
        {
            if (!Connected) SpinWait.SpinUntil(() => Connected);

            return await Network.Indicators.GetIndicator
            (
                market:        GetMarket(indicatorRef.MarketRef),
                indicatorName: indicatorRef.IndicatorName,
                timeFrame:     indicatorRef.TimeFrame,
                settings:      indicatorRef.Settings,
                getHistory:    getHistory
            );
        }

        // public async void GetIndicatorData(IClientProxy client, IndicatorDataReference indicatorDataRef)
        // {
        //     var extraPeriods  = 250;
        //     var indicatorRef  = indicatorDataRef.IndicatorRef;
        //     var marketRef     = indicatorDataRef.IndicatorRef.MarketRef;
        //     var market        = GetMarket(marketRef);
        //     var startTime     = (double)indicatorDataRef.StartMinute - (double)extraPeriods * (double)indicatorRef.TimeFrame;
        //     var endTime       = Math.Ceiling((double)indicatorDataRef.EndMinute / (double)indicatorRef.TimeFrame) * (double)indicatorRef.TimeFrame;
        //     var periods       = await Network.GetTradingPeriods(market, startTime, endTime, indicatorRef.TimeFrame);
        //     var indicator     = await GetIndicator(indicatorRef);
        //     var dataAggregate = indicator.ProcessOutsideManifold(indicatorRef.TimeFrame, periods);
        //     var updates       = new IndicatorUpdateMessage(indicatorRef.Uuid, indicator, dataAggregate, false);

        //     await Task.Run(() => client.SendAsync("IndicatorData", updates));

        //     // var messages = updates.Split(5);

        //     // foreach (var message in messages)
        //     // {
        //     //     await client.SendAsync("IndicatorData", message);
        //     //     await Task.Delay(1000);
        //     // }
        // }
    }
}