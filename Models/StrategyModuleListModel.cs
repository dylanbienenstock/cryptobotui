using MessagePack;

namespace CryptoBotUI.Models
{
    [MessagePackObject]
    public class StrategyModuleListModel
    {
        public StrategyModuleModel PairSelector;
        public StrategyModuleModel SignalEmitter;
        public StrategyModuleModel OrderManager;
    }
}