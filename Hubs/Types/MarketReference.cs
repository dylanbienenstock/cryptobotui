using CryptoBot.Exchanges;
using MessagePack;
// using MessagePack;

namespace CryptoBotUI.Hubs.Types
{
    [MessagePackObject]
    public class MarketReference
    {
        [Key("exchangeName")]
        public string ExchangeName;

        [Key("symbol")]
        public string Symbol;

        [Key("key")]
        public string Key;

        public MarketReference() { }

        public MarketReference(Market market)
        {
            ExchangeName = market.Exchange.Name;
            Symbol = market.Pair.ToGenericSymbol();
            Key = $"{ExchangeName}::{Symbol}";
        }
    }
}