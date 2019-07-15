import { Injectable, EventEmitter } from '@angular/core';
import { SignalRService } from './signalr.service';
import { Observable, observable, Subscription } from 'rxjs';
import { IndicatorReference } from 'src/crypto-charts/lib/IndicatorReference';
import { IndicatorChange } from 'src/crypto-charts/lib/IndicatorChange';
import { Indicator } from 'src/crypto-charts/lib/Indicator';
import { IndicatorDataReference } from 'src/crypto-charts/lib/IndicatorDataReference';
import { TimeWindow } from 'src/crypto-charts/lib/TimeWindow';
import * as uuidv4 from "uuid/v4";

enum IndicatorType {
    Price       = "Price",
    Trend       = "Trend",
    Momentum    = "Momentum",
    Volume      = "Volume",
    Volatility  = "Volatility",
    Combination = "Combination"
}

enum IndicatorSettingType {
    Int    = "Int",
    Float  = "Float",
    Aspect = "Aspect"
}

interface IndicatorSetting {
    key:          string;
    name:         string;
    type:         IndicatorSettingType;
    defaultValue: number | string;
}

export interface IndicatorDetails {
    name:         string;
    isOscillator: boolean;
    isLagging:    boolean;
    type:         IndicatorType;
    settings:     IndicatorSetting[];
}

@Injectable({
    providedIn: 'root'
})
export class IndicatorService {

    constructor(private signalR: SignalRService) {
        this.getIndicatorList();
    }

    public indicatorList: IndicatorDetails[] = [];

    private async getIndicatorList() {
        await this.signalR.connected;
        let res = await this.signalR.invoke<IndicatorDetails[]>("GetIndicatorList");

        if (!res.success) throw res.error;

        this.indicatorList = res.data;
    }
    
    public get(
        exchangeName: string,
        symbol: string,
        indicatorName: string,
        timeFrame: number,
        settings: { [key: string]: number | string }
    ): Indicator {
        let indicatorRef = new IndicatorReference(exchangeName, symbol, indicatorName, timeFrame, settings);
        let dataMissingSub: Subscription;
        let dataSource = new Observable<IndicatorChange>((subscriber) => {
            let stream = this.signalR
                .stream<IndicatorChange>("SubscribeToIndicator", indicatorRef)
                .subscribe({
                    next:  (val) => subscriber.next(val),
                    error: (err) => console.error(err),
                    complete: () => {}
                });

            return {
                unsubscribe: () => {
                    stream.dispose();
                    dataMissingSub.unsubscribe();
                }
            };
        });

        let indicator = new Indicator(indicatorRef, dataSource);
        dataMissingSub = indicator.dataMissing
            .subscribe(w => this.getHistoricalData(indicator, timeFrame, settings, w));

        return indicator;
    }

    public async getHistoricalData(
        indicator: Indicator,
        timeFrame: number,
        settings: any,
        window: TimeWindow
    ) {
        let indicatorDataRef = new IndicatorDataReference(
            indicator.indicatorRef.marketRef.exchangeName,
            indicator.indicatorRef.marketRef.symbol,
            indicator.indicatorRef.indicatorName,
            timeFrame,
            settings,
            window.startTime,
            window.endTime
        );

        console.log("ASDASd")
        let res = await this.signalR.invoke<IndicatorChange>("GetIndicatorData", indicatorDataRef);
        console.log(res)
        indicator.dataAggregate.record(res.data);
    }
}
