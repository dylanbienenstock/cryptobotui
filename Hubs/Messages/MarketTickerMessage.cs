using System;
using System.Collections.Generic;
using System.Linq;
using CryptoBot.Exchanges;
using CryptoBot.Exchanges.Series;
using CryptoBot.Indicators;
using CryptoBotUI.Hubs.Types;
using MessagePack;

namespace CryptoBotUI.Hubs.Messages
{
    [MessagePackObject]
    public class MarketTickerMessage
    {
        [Key("marketRef")]
        public MarketReference MarketRef;

        [Key("priceChange")]
        public string PriceChange;

        [Key("priceChangePercentage")]
        public string PriceChangePercentage;

        [Key("lastPrice")]
        public string LastPrice;

        [Key("volume")]
        public string Volume;

        public MarketTickerMessage() { }

        public MarketTickerMessage(MarketTicker marketTicker)
        {
            MarketRef             = new MarketReference(marketTicker.Market);
            PriceChange           = (string)marketTicker.PriceChange;
            PriceChangePercentage = (string)marketTicker.PriceChangePercentage;
            LastPrice             = (string)marketTicker.LastPrice;
            Volume                = (string)marketTicker.Volume;
        }
    }
}