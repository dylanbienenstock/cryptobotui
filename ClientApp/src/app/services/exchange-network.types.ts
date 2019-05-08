import { MarketReference } from "./signalr.types";

export interface ExchangeNetworkSnapshot {
    exchangeSnapshots: {
        name:    string;
        fee:     number;
        marketRefs: MarketReference[];
    }[];
}

export interface BacktestDataCompletion {
    marketRef:    MarketReference;
    completeDays: number;
    totalDays:    number;
    ratio:        number;
}