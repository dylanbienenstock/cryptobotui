using System.Collections.Generic;
using MessagePack;

namespace CryptoBotUI.Models
{
    [MessagePackObject]
    public class StrategyModuleModel
    {
        public string Name;
        public Dictionary<string, object> Inputs;
    }
}