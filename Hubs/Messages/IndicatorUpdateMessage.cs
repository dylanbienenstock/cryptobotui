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
    // public class IndicatorManifoldChange
    // {
    //     [Key("manifoldId")]
    //     public string ManifoldId;

    //     [Key("indicatorChanges")]
    //     public IndicatorChange[] IndicatorChanges;
    // }

    [MessagePackObject]
    public class IndicatorChange
    {
        [Key("indicatorId")]
        public string IndicatorId;

        [Key("fieldChanges")]
        public IndicatorFieldChange[] FieldChanges;

        public IndicatorChange(string indicatorId, IndicatorFieldChange[] changes)
        {
            IndicatorId = indicatorId;
            FieldChanges = changes;
        }
    }

    [MessagePackObject]
    public class IndicatorFieldChange
    {
        [Key("fieldName")]
        public string FieldName;

        [Key("changes")]
        public TimeSeriesChange[] TimeSeriesChanges;

        public IndicatorFieldChange(string fieldName, TimeSeriesChange[] changes)
        {
            FieldName = fieldName;
            TimeSeriesChanges = changes;
        }
    }

    [MessagePackObject]
    public class TimeSeriesChange
    {
        [Key("time")]
        public DateTime Time;

        [Key("value")]
        public object Value;

        public TimeSeriesChange(DateTime time, object value)
        {
            Time = time;
            Value = value;
        }
    }
}