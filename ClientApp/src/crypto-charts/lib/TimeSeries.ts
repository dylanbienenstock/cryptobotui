import { Range } from "./Range";

export interface TimeSeriesEntry {
    value: number;
    time: number;
}

export interface TimeSeriesRange {
    low: number;
    high: number;
}

type TimeSeriesEvent = 
    "pre-add"    | "post-add"    | 
    "pre-update" | "post-update" |
    "pre-remove" | "post-remove" |
    "complete"   | "finalize-record";
    
type TimeSeriesEventCallback = (entry: TimeSeriesEntry) => void;

export class TimeSeries {
    public arr: TimeSeriesEntry[];

    public timespan: number;
    public complete: boolean;

    private eventCallbacks: { [event: string]: TimeSeriesEventCallback[] };

    constructor(timespan: number) {
        this.arr            = [];
        this.timespan       = timespan;
        this.complete       = false;
        this.eventCallbacks = { };
    }

    public on(event: TimeSeriesEvent, cb: TimeSeriesEventCallback): void {
        if (!this.eventCallbacks[event])
            this.eventCallbacks[event] = [];

        this.eventCallbacks[event].push(cb);
    }

    public off(event: TimeSeriesEvent, cb: TimeSeriesEventCallback): void {
        if (!this.eventCallbacks[event]) return;

        let index = this.eventCallbacks[event].indexOf(cb);

        if (index == -1) return;

        this.eventCallbacks[event].splice(index, 1);
    } 

    private emit(event: TimeSeriesEvent, entry: TimeSeriesEntry): void {
        if (!this.eventCallbacks[event]) return;
        this.eventCallbacks[event].forEach(cb => cb(entry));
    }

    public record(entry: TimeSeriesEntry): void {
        this.arr.push(entry);
        this.emit("finalize-record", entry);
    }

    public prependHead(entry: TimeSeriesEntry): void {
        this.arr = [entry, ...this.arr];
        this.emit("finalize-record", entry);
    }

    public updateTail(value: number): void {
        this.arr[this.arr.length - 1].value = value;
    }

    public forEach(cb: (entry: TimeSeriesEntry, i?: number) => void): void {
        this.arr.forEach(cb);
    }

    public get min(): number {
        if (this.arr.length == 0) return 0;
        
        let min = this.arr[0].value;
        this.forEach(entry => min = Math.min(entry.value, min));

        return min;
    }

    public get max(): number {
        if (this.arr.length == 0) return 0;
        
        let max = this.arr[0].value;
        this.forEach(entry => max = Math.max(entry.value, max));

        return max;
    }

    public get range(): Range {
        return { min: this.min, max: this.max };
    }

    public toArray(): TimeSeriesEntry[] {
        return this.arr;
    }
}