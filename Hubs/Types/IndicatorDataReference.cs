using System;
using CryptoBot.Exchanges;
using CryptoBot.Indicators;
using MessagePack;

namespace CryptoBotUI.Hubs.Types
{
    [MessagePackObject]
    public class IndicatorDataReference
    {
        [Key("indicatorRef")]
        public IndicatorReference IndicatorRef;

        [Key("startMinute")]
        public Int64 StartMinute;

        [Key("endMinute")]
        public Int64 EndMinute;

        public IndicatorDataReference() { }
    }
}