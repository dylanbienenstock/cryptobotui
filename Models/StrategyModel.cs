using MessagePack;

namespace CryptoBotUI.Models
{
    [MessagePackObject]
    public class StrategyModel
    {
        public string StrategyName;
        public StrategyModuleListModel Modules;
    }
}