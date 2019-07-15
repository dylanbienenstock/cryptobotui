import { IndicatorData  } from "./IndicatorData";
import { TimeSeriesEntry } from "./TimeSeries";
import { RendererConstructor } from "./Renderer";
import { Range } from "./Range";
import { IndicatorChange } from "./IndicatorChange";
import { TimeWindow } from "./TimeWindow";
import { Observable, Subject } from "rxjs";

export interface IndicatorDataAggregateConstructor {
    primaryFieldName: string;
    fieldNames: string[];
    nonPriceFieldNames?: string[];
    renderers: RendererConstructor[];
}

export class IndicatorDataAggregate {
    public fields: { [fieldName: string]: IndicatorData };
    public nonPriceFieldNames: string[];
    public primaryFieldName: string;
    public dataMissing: Subject<TimeWindow>;
    public changed: boolean = false;
    public timeFrame: number;

    constructor(options: IndicatorDataAggregateConstructor, timeFrame: number) {
        this.fields = { };
        this.primaryFieldName = options.primaryFieldName.toLowerCase();
        this.dataMissing = new Subject<TimeWindow>();
        this.timeFrame = timeFrame;
        
        for (let fieldName of options.fieldNames.map(f => f.toLowerCase()))
            this.fields[fieldName] = new IndicatorData(fieldName, this);

        if (options.nonPriceFieldNames)
            this.nonPriceFieldNames = options.nonPriceFieldNames.map(f => f.toLowerCase());
    }

    public get primaryField(): IndicatorData {
        return this.fields[this.primaryFieldName];
    }

    public isPriceField(field: IndicatorData) {
        return !this.nonPriceFieldNames || !this.nonPriceFieldNames.includes(field.fieldName.toLowerCase());
    }

    public min(window: TimeWindow): number {
        return Object.values(this.fields)
            .filter(field => this.isPriceField(field))
            .map(field => field.range(window).min)
            .reduce((accum, val) => Math.min(accum, val || accum));
    }

    public max(window: TimeWindow): number {
        return Object.values(this.fields)
            .filter(field => this.isPriceField(field))
            .map(field => field.range(window).max)
            .reduce((accum, val) => Math.max(accum, val || accum));
    }

    public getRange(window: TimeWindow): Range {
        return { min: this.min(window), max: this.max(window) };
    }

    public findGaps(window: TimeWindow): void {
        let gap = this.primaryField.findGaps(window);

        // if (gap.startTime != null)
            this.dataMissing.next(gap);
    }

    public record(change: IndicatorChange): void {
        for (let fieldChange of change.fieldChanges) {
            let entries: TimeSeriesEntry[] = fieldChange.timeSeriesChanges
                .map(timeSeriesChange => ({
                    time:  new Date(timeSeriesChange.time).getTime(),
                    value: timeSeriesChange.value
                }))

            let normalizedFieldName = fieldChange.fieldName.toLowerCase();
            this.fields[normalizedFieldName].record(entries);
        }

        this.changed = true;
    }
}