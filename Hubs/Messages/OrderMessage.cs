using System;
using CryptoBot.Exchanges.Currencies;
using CryptoBot.Exchanges.Orders;
using CryptoBotUI.Hubs.Types;
using MessagePack;

namespace CryptoBotUI.Hubs.Messages {
    [MessagePackObject]
    public class OrderMessage
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

        public OrderMessage() { }

        public OrderMessage(CurrencyOrder order)
        {
            MarketRef = new MarketReference(order.Market);
            Price     = order.Price;
            Amount    = order.Amount;
            Side      = order.Side == OrderSide.Bid ? "bid" : "ask";
            Time      = order.Time;
        }
    }
}