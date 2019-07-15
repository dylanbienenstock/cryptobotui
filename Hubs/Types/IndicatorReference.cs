using System;
using System.Dynamic;
using CryptoBot.Exchanges;
using CryptoBot.Indicators;
using MessagePack;

namespace CryptoBotUI.Hubs.Types
{
    [MessagePackObject]
    public class IndicatorReference
    {
        [Key("indicatorName")]
        public string IndicatorName;

        [Key("marketRef")]
        public MarketReference MarketRef;

        [Key("timeFrame")]
        public Int64 TimeFrame;

        [Key("settings")]
        public ExpandoObject Settings;

        public IndicatorReference() { }

        public IndicatorReference(Indicator indicator)
        {
            IndicatorName = indicator.Name;
            MarketRef     = new MarketReference(indicator.Market);
            TimeFrame     = indicator.TimeFrame;
            Settings      = indicator.Settings;
        }
    }
}