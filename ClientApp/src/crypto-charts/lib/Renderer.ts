import { RenderContext } from "./RenderContext";
import { IndicatorDataAggregate } from "./IndicatorDataAggregate";
import { Range } from "./Range";
import { TimeSeriesEntry } from "./TimeSeries";
import { IndicatorData } from "./IndicatorData";
import { TimeWindow } from "./TimeWindow";
import { Indicator } from "./Indicator";
import { range } from "rxjs";

export interface Point {
    x: number;
    y: number;
}

export interface Rectangle extends Point {
    w: number;
    h: number;
}

export interface RendererConstructor {
    rendererClass: typeof Renderer;
    fieldNames: string[];
    settings?: any;
}

export class Renderer {
    public fieldNames:   string[];
    public context:      RenderContext;
    public children:     Renderer[] = [];
    public settings:     any;
    public depth: number = 0;

    public range: Range;
    public rangeOverridden: boolean = false;

    // public get indicator():     Indicator                { return this.context.indicator;       }
    public indicator: Indicator;
    public get timeFrame():     number                   { return this.context.indicators[0].timeFrame; }
    public get dataAggregate(): IndicatorDataAggregate   { return this.indicator.dataAggregate; }
    public get bounds():        Rectangle                { return this.context.bounds;          }
    public get outerBounds():   Rectangle                { return this.context.outerBounds;     }
    public get background():    string                   { return this.context.background;      }
    public get canvasCtx():     CanvasRenderingContext2D { return this.context.canvasCtx;       }
    public get now():           number                   { return this.context.currentTime;     }

    public get x(): number { return this.bounds.x; }
    public get y(): number { return this.bounds.y; }
    public get w(): number { return this.bounds.w; }
    public get h(): number { return this.bounds.h; }

    public get outerX(): number { return this.outerBounds.x };
    public get outerY(): number { return this.outerBounds.y };
    public get outerW(): number { return this.outerBounds.w };
    public get outerH(): number { return this.outerBounds.h };

    public padding: number = 0.15;
    public get paddedH(): number { return this.outerH * (1 - this.padding * 2) };
    public get offsetY(): number {
        if (this.context.showTimeScale)
            return this.context.offsetY - this.outerH * this.padding - 15;

        return this.context.offsetY - this.outerH * this.padding;
    }

    public get cursorX(): number { return Math.round(this.context.mousePos.x - this.x); }
    public get cursorY(): number { return Math.round(this.context.mousePos.y - this.y); }

    public get periodWidth(): number {
        return Math.abs(this.mapX(0) - this.mapX(this.timeFrame));
    }

    public get scaleX() {
        return this.outerW / (this.timeFrame * 60) * this.context.scaleX;
    }

    public get scaleY() {
        return this.paddedH / (this.range.max - this.range.min) * this.context.scaleY;
    }

    public get renderTime() {
        let padding = 80 / this.scaleX + this.timeFrame;
        return Math.round(this.context.currentTime + this.context.offsetX + padding);
    }

    public get timeWindow(): TimeWindow {
        let widthTime = this.quantize(this.outerW / this.periodWidth * this.timeFrame, this.timeFrame);
        let endTime = this.quantize(this.renderTime, this.timeFrame);
        let startTime = this.quantize(endTime - widthTime, this.timeFrame);
        return { startTime, endTime };
    }

    public boundsArray(): [number, number, number, number] {
        return [this.x, this.y, this.w, this.h];
    }

    constructor(options: RendererConstructor = null) {
        if (options == null) return;
        
        this.fieldNames = options.fieldNames;
    }

    public setRange(range: Range, isDefault: boolean = false) {
        if (isDefault && this.rangeOverridden) return;
        
        this.range = range;
        this.rangeOverridden = !isDefault;

        if (this.context && this.context.scaleRenderer)
            this.context.scaleRenderer.setRange(range);

        if (this.children)
            this.children.forEach(c => c.setRange(range));
    }

    public autoRange() {
        let totalRange = { min: Infinity, max: -Infinity };

        for (let indicator of this.context.indicators) {
            if (!indicator.dataAggregate) continue;
             
            let range = indicator.dataAggregate.getRange(this.timeWindow);
            totalRange.min = Math.min(totalRange.min, range.min);
            totalRange.max = Math.max(totalRange.max, range.max);
        }

        this.setRange(totalRange, true);
    }

    public mapX(timeOrNode: number | TimeSeriesEntry): number {
        let time = typeof(timeOrNode) == "object"
            ? this.renderTime - timeOrNode.time
            : this.renderTime - timeOrNode;

        return this.x + this.outerW - time * this.scaleX;
    }

    public unmapX(value: number) {
        return (value - this.outerW + this.renderTime * this.scaleX) / this.scaleX;
    }

    public mapY(valueOrNode: number | TimeSeriesEntry): number {
        let value = typeof(valueOrNode) == "object"
            ? valueOrNode.value
            : valueOrNode;

        return this.outerH - ((value - this.range.min) * this.scaleY) + this.offsetY;
    }

    public unmapY(value: number): number {
        return this.range.min + (-value + this.outerH + this.offsetY) / this.scaleY;
    }

    public mapXY(timeOrNode: number | TimeSeriesEntry, value: number = null): Point {
        if (typeof(timeOrNode) == "object") {
            return {
                x: this.mapX(timeOrNode),
                y: this.mapY(timeOrNode)
            };
        }

        if (value == null) throw Error("Value must be given if timeOrNode is a number");

        return {
            x: this.mapX(timeOrNode),
            y: this.mapY(value)
        };
    }

    public getPointArray(field: IndicatorData) {
        return field.timeSlice(this.timeWindow)
            .map(n => this.mapXY(n));
    }

    public field(indexOrName: number | string): IndicatorData {
        return typeof(indexOrName) == "number"
            ? this.dataAggregate.fields[this.fieldNames[indexOrName].toLowerCase()]
            : this.dataAggregate.fields[indexOrName.toLowerCase()];
    }

    public quantize(value: number, interval: number, op: string = null) {
        if (op === "ceil")  return Math.ceil(value / interval) * interval;
        if (op === "round") return Math.round(value / interval) * interval;


        return Math.floor(value / interval) * interval;
    }

    public deflateRelative(rect: Rectangle, ratio: number) {
        return {
            x: rect.x + rect.w * (ratio / 2),
            y: rect.y + rect.h * (ratio / 2),
            w: rect.w * (1 - ratio),
            h: rect.h * (1 - ratio),
        };
    }

    public deflateAbsolute(rect: Rectangle, padding: number) {
        return {
            x: rect.x + padding / 2,
            y: rect.y + padding / 2,
            w: rect.w - padding,
            h: rect.h - padding,
        };
    }

    public static create(indicator: Indicator, options: RendererConstructor): Renderer {
        let renderer = new options.rendererClass(options);
        renderer.indicator = indicator;
        renderer.settings = options.settings;
        return renderer;
    }

    public render() {
        this.context.currentTime = this.quantize(this.context.currentTime, this.timeFrame);

        if (this.context.scaleY == 1 && !this.rangeOverridden) 
            this.autoRange();

        this.canvasCtx.clearRect(0, 0, this.w, this.h);
        
        for (let child of this.children) {
            if (child.indicator)
                child.indicator.dataAggregate.findGaps(this.timeWindow);

            child.context = { ...this.context };
            child.context.bounds = this.bounds;
            child.setRange(this.range);
            child.render();
        }
        
        this.renderCursorCross();
        this.renderOverCursor();
    }

    public renderOverCursor() {
        for (let child of this.children)
            child.renderOverCursor();
    }

    public renderCursorCross() {
        if (!this.context.hovered) return;

        let x = Math.round(this.cursorX) + 0.5;
        let y = Math.round(this.cursorY) - 0.5;

        this.canvasCtx.lineWidth = 0.5;
        this.canvasCtx.strokeStyle = "white";
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(x, 0);
        this.canvasCtx.lineTo(x, Math.ceil(this.h));
        this.canvasCtx.moveTo(0, y);
        this.canvasCtx.lineTo(Math.ceil(this.w), y);
        this.canvasCtx.stroke();
    }
}