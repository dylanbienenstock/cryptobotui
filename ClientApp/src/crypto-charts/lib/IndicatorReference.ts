import { MarketReference } from "./MarketReference";

export class IndicatorReference {
    public marketRef: MarketReference;
    public indicatorName: string;
    public timeFrame: number;
    public settings: any;

    constructor(exchangeName: string, symbol: string, indicatorName: string, timeFrame: number, settings: any) {
        this.marketRef = new MarketReference(exchangeName, symbol);
        this.indicatorName = indicatorName;
        this.timeFrame = timeFrame;
        this.settings = settings;
    }
}