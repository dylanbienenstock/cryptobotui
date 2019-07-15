import { MarketReference } from "./signalr.types";

export interface ExchangeNetworkSnapshot {
    exchangeSnapshots: ExchangeSnapshot[];
}

export interface ExchangeSnapshot {
    name:    string;
    fee:     number;
    marketRefs: MarketReference[];
    currencyMinNotionals: [string, number][];
}

export interface BacktestDataCompletion {
    marketRef:    MarketReference;
    completeDays: number;
    totalDays:    number;
    ratio:        number;
    collecting:   boolean;
}

export interface MarketTicker {
    marketRef: MarketReference;
    priceChange: string;
    priceChangePercentage: string;
    lastPrice: string;
    volume: string;
}