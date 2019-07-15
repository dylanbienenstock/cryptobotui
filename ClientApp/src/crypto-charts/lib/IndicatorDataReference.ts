import { MarketReference } from "./MarketReference";
import { IndicatorReference } from "./IndicatorReference";

export class IndicatorDataReference {
    public indicatorRef: IndicatorReference;
    public startMinute: number;
    public endMinute: number;

    constructor(
        exchangeName: string,
        symbol: string,
        indicatorName: string,
        timeFrame: number,
        settings: any,
        startMinute: number,
        endMinute: number
    ) {
        this.indicatorRef = new IndicatorReference(exchangeName, symbol, indicatorName, timeFrame, settings);
        this.startMinute = startMinute;
        this.endMinute = endMinute;
    }
}