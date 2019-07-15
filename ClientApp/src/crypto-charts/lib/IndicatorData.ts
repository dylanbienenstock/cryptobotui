import { TimeSeriesEntry, TimeSeries } from "./TimeSeries";
import { Range } from "./Range";
import { TimeWindow } from "./TimeWindow";
import { IndicatorDataAggregate } from "./IndicatorDataAggregate";

export class IndicatorData {
    public fieldName: string;
    public values: { [time: number]: number };
    public lastValue: number;
    public endTime: number = 0;
    public dataAggregate: IndicatorDataAggregate;

    public get timeFrame(): number {
        return this.dataAggregate.timeFrame;
    }

    constructor(fieldName: string, dataAggregate: IndicatorDataAggregate) {
        this.fieldName = fieldName;
        this.dataAggregate = dataAggregate;
        this.values = [];
    }

    public record(entries: TimeSeriesEntry[]): void {
        for (let entry of entries) {
            let time = this.quantize(entry.time, this.timeFrame, false);
            this.values[time] = entry.value;
            this.lastValue = entry.value;
            this.endTime = Math.max(time, this.endTime);
        }

        this.dataAggregate.changed = true;
    }

    public timeSlice(window: TimeWindow): TimeSeriesEntry[] {
        window.startTime = this.quantize(window.startTime, this.timeFrame, false);
        window.endTime = this.quantize(window.endTime, this.timeFrame, true);

        let arr = [];

        for (let time = window.startTime; time <= window.endTime; time += this.timeFrame) {
            if (this.values[time])
                arr.push({ time, value: this.values[time] });
        }

        return arr;
    }

    public findGaps(window: TimeWindow): TimeWindow {
        let gap = { startTime: null, endTime: null };
        let endTime = Math.min(window.endTime, this.endTime);

        for (let time = window.startTime; time <= endTime; time += this.timeFrame) {
            if (this.values[time]) continue;

            if (gap.startTime == null) 
                gap.startTime = Math.min(time, this.endTime);

            gap.endTime = Math.min(window.endTime, Math.max(time, this.endTime));
        }

        return gap;
    }

    private quantize(time: number, interval: number, ceil: boolean = null): number {
        if (ceil === null)  return Math.round(time / interval) * interval;
        if (ceil === true)  return Math.ceil (time / interval) * interval;
        if (ceil === false) return Math.floor(time / interval) * interval;
    }

    public min(window: TimeWindow): number {
        let values = this.timeSlice(window)
            .map(v => v.value);

        if (values.length == 0) return 0;
        
        let min = values.find(val => val != 0);
        values.forEach(value => min = Math.min(value || min, min));

        return min;
    }

    public max(window: TimeWindow): number {
        let values = this.timeSlice(window)
            .map(v => v.value);

        if (values.length == 0) return 0;
        
        let max = values.find(val => val != 0);
        values.forEach(value => max = Math.max(value || max, max));

        return max;
    }

    public range(window: TimeWindow): Range {
        return { min: this.min(window), max: this.max(window) };
    }
}