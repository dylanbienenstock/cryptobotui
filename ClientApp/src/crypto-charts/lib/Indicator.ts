import { IndicatorReference } from "./IndicatorReference";
import { IndicatorDataAggregate } from "./IndicatorDataAggregate";
import { IndicatorChange } from "./IndicatorChange";
import { Observable, Subscription, Subject } from "rxjs";
import { IndicatorFormats } from "./IndicatorFormats";
import { TimeWindow } from "./TimeWindow";
import { bufferTime, map, filter, tap } from "rxjs/operators";

export class Indicator {
    public timeFrame: number;
    public indicatorRef: IndicatorReference;
    public dataSource: Observable<IndicatorChange>;
    public dataAggregate: IndicatorDataAggregate;
    public hasRenderer: boolean = false;

    private dataSourceSub: Subscription;
    private lastGap: TimeWindow = { startTime: 0, endTime: 0 };

    public get changed(): boolean {
        if (!this.dataAggregate) return false;
        return this.dataAggregate.changed;
    }

    public set changed(val: boolean) {
        this.dataAggregate.changed = false;
    }
    
    public get dataMissing(): Observable<TimeWindow> {
        return this.dataAggregate.dataMissing
            .pipe(bufferTime(1000))
            .pipe(map   (b => this.mergeTimeWindows(b)))
            .pipe(filter(w => !!w && (w.startTime != 0 && w.endTime != 0)))
            .pipe(filter(_ => Object.keys(this.dataAggregate.primaryField.values).length > 0))
            .pipe(filter(w => w.startTime != this.lastGap.startTime || w.endTime != this.lastGap.endTime))
            .pipe(tap   (w => this.lastGap = w))
            .pipe(tap   (w => console.log(w)));
    }

    constructor(
        indicatorRef: IndicatorReference, 
        dataSource: Observable<IndicatorChange>
    ) {
        this.indicatorRef = indicatorRef;
        this.timeFrame = indicatorRef.timeFrame;
        this.dataSource = dataSource;

        let format = IndicatorFormats[this.indicatorRef.indicatorName];
        this.dataAggregate = new IndicatorDataAggregate(format, this.timeFrame);

        this.dataSourceSub = this.dataSource.subscribe(msg => {
            this.dataAggregate.record(msg);
        });
    }

    public dispose(): void {
        this.dataSourceSub.unsubscribe();
        this.dataAggregate.dataMissing.complete();
        this.dataSource = null;
        this.dataAggregate = null;
        this.dataSourceSub = null;
    }

    private mergeTimeWindows(windows: TimeWindow[]): TimeWindow {
        let merged = windows[0];
        
        for (let window of windows) {
            merged.startTime = Math.min(window.startTime, merged.startTime);
            merged.endTime = Math.max(window.endTime, merged.startTime);
        }

        return merged;
    }
}