using System;
using CryptoBot.Exchanges.Currencies;
using CryptoBot.Exchanges.Orders;
using CryptoBotUI.Hubs.Types;
using MessagePack;

namespace CryptoBotUI.Hubs.Messages {
    [MessagePackObject]
    public class TradeMessage
    {
        [Key("marketRef")]
        public MarketReference MarketRef;

        [Key("price")]
        public decimal Price;

        [Key("amount")]
        public decimal Amount;

        [Key("side")]
        public string Side;

        [Key("time")]
        public DateTime Time;

        public TradeMessage() { }

        public TradeMessage(CurrencyTrade trade)
        {
            MarketRef = new MarketReference(trade.Market);
            Price     = trade.Price;
            Amount    = trade.Amount;
            Side      = trade.Side == OrderSide.Bid ? "bid" : "ask";
            Time      = trade.Time;
        }
    }
}