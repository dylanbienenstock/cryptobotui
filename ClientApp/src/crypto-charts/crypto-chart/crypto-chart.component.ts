import { Component, AfterViewInit, HostListener, ViewChild, ElementRef, Input, Output, EventEmitter, ChangeDetectorRef, NgZone } from '@angular/core';
import { Indicator } from '../lib/Indicator';
import { Renderer, Point } from '../lib/Renderer';
import { IndicatorFormats } from '../lib/IndicatorFormats';
import { Colors } from '../lib/Colors';
import { ScaleRenderer } from '../lib/Renderers/ScaleRenderer';

const Hz = 60;

export interface SharedState {
    offsetX: number;
    scaleX: number;
    hovered: boolean;
    changed: boolean;
    mouseDown: boolean;
    reset: boolean;
}

@Component({
    selector: 'crypto-chart',
    templateUrl: './crypto-chart.component.html',
    styleUrls: ['./crypto-chart.component.scss']
})
export class CryptoChartComponent implements AfterViewInit {

    constructor(private changeDetector: ChangeDetectorRef) { }

    @Input() state: SharedState;
    @Input() primary: boolean = false;
    @Input() showTimeScale: boolean = false;

    @Output() setState = new EventEmitter<SharedState>();

    private _indicators: Indicator[];
    get indicators(): Indicator[] { return this._indicators; }
    @Input() set indicators(val: Indicator[]) {
        this._indicators = val;
        this.setupRenderers();
    }

    private get indicatorsChanged(): boolean {
        for (let indicator of this.indicators)
            if (indicator.changed) return true;

        return false;
    }

    @ViewChild("chart", { static: true })
    public chartRef: ElementRef;
    public get chart(): HTMLCanvasElement {
        return this.chartRef.nativeElement;
    }

    @ViewChild("scale", { static: true })
    public scaleRef: ElementRef;
    public get scale(): HTMLCanvasElement {
        return this.scaleRef.nativeElement;
    }

    public chartBounds: ClientRect;
    public scaleBounds: ClientRect;
    public chartCtx: CanvasRenderingContext2D;
    public scaleCtx: CanvasRenderingContext2D;
    public chartRenderer: Renderer;
    public scaleRenderer: Renderer;

    public minScaleX: number = 0.125;
    public minScaleY: number = 0.01;

    public get offsetX(): number { return this.state.offsetX; }
    public set offsetX(val: number) { this.setState.emit({ ...this.state, offsetX: val }); }

    public get scaleX(): number { return this.state.scaleX; }
    public set scaleX(val: number) { this.setState.emit({ ...this.state, scaleX: val }); }

    public get hovered(): boolean { return this.state.hovered; }

    public get changed(): boolean { return this.state.changed; }
    public set changed(val: boolean) { this.setState.emit({ ...this.state, changed: val }); }

    private lastKeyboardHandleTime;
    private keyboard = {
        up: false, down: false,
        left: false, right: false,
        shift: false
    };

    private get mouseDownOutside(): boolean {
        return this.state.mouseDown && !this.mouseDown;
    }

    private get mouseDownArea(): "chart" | "time" | "price" | "outside" {
        return this.mouseDownOutside 
            ? "outside"
            : (this.draggingScale
                ? this.scaleAxis
                : "chart");
    }

    private offsetY: number = 0;
    private scaleY: number = 1;
    
    private mouseDown: boolean = false;
    private preventContextMenu: boolean = false;
    private draggingScale: boolean = false;
    private lastMousePos: Point;
    private mousePosRelative: Point = { x: -10, y: -10 };
    private scaleAxis: "price" | "time";

    ngAfterViewInit() {
        setTimeout(() => {
            this.setupCanvas();
        });
    }

    private setupCanvas(): void {
        this.chart.style.position = "absolute";
        this.chart.style.top = "0";
        this.chart.style.left = "0";

        this.scale.style.position = "absolute";
        this.scale.style.top = "0";
        this.scale.style.left = "0";

        this.chartCtx = this.chart.getContext("2d", { alpha: true });
        this.scaleCtx = this.scale.getContext("2d", { alpha: true });

        this.resizeCanvas();
        this.renderChart();
    }

    private setupRenderers(): void {
        this.chartRenderer = null;
        this.scaleRenderer = null;

        this.chartRenderer = new Renderer();
        this.chartRenderer.children = [];

        for (let indicator of this.indicators) {
            let renderConstructors = IndicatorFormats[indicator.indicatorRef.indicatorName].renderers;

            for (let rendererConstructor of renderConstructors) {
                let renderer = Renderer.create(indicator, rendererConstructor);
                this.chartRenderer.children.push(renderer)
            }
        }

        this.scaleRenderer = new Renderer();
        this.scaleRenderer.children = IndicatorFormats["Scale"].renderers
            .map(r => Renderer.create(null, r));
    }

    @HostListener("window:resize")
    private resizeCanvas(): void {
        if (!this.chartCtx) return;

        let dpr = window.devicePixelRatio || 1;

        this.chartBounds = this.chart.parentElement.getBoundingClientRect();
        this.scaleBounds = this.scale.parentElement.getBoundingClientRect();

        this.chart.width = this.chartBounds.width * dpr;
        this.chart.height = this.chartBounds.height * dpr;

        this.scale.width = this.scaleBounds.width * dpr;
        this.scale.height = this.scaleBounds.height * dpr;

        this.chartCtx.scale(dpr, dpr);
        this.scaleCtx.scale(dpr, dpr);
    }

    private requestAnimationFrame(): number {
        if (Hz >= 60) return requestAnimationFrame(() => this.renderChart());
        return Number(setTimeout(() => this.renderChart(), 1000 / Hz));
    }

    private cancelAnimationFrame(frameHandle: number) {
        if (Hz >= 60) return cancelAnimationFrame(frameHandle);
        clearTimeout(frameHandle);
    }

    private renderScale(): void {
        if (this.indicators.length == 0) return;
            
        let bounds = {
            x: this.scaleBounds.left - this.chartBounds.left,
            y: 0,
            w: this.scaleBounds.width,
            h: this.scaleBounds.height
        };

        this.scaleRenderer.context = {
            indicators:      this.indicators,
            bounds:          bounds,
            outerBounds:     bounds,
            background:      Colors.Background,
            canvasCtx:       this.scaleCtx,
            currentTime:     Date.now(),
            offsetX:         this.offsetX,
            offsetY:         this.offsetY,
            scaleX:          this.scaleX,
            scaleY:          this.scaleY,
            mousePos:        this.mousePosRelative,
            hovered:         this.hovered,
            mouseDown:       this.mouseDown,
            mouseDownGlobal: this.state.mouseDown,
            mouseDownArea:   this.mouseDownArea,
            draggingScale:   this.draggingScale,
            showTimeScale:   this.showTimeScale,
        };

        this.scaleRenderer.render();
    }
    flash = false;
    private renderChart(): void {
        if (this.state.reset) {
            this.onResetScaleY();
            setTimeout(() => this.state.reset = false);
        }

        let frameHandle;
        let shouldRenderChart = this.indicatorsChanged || this.changed || 
            !!Object.keys(this.keyboard).find(key => this.keyboard[key]);

        try {
            frameHandle = this.requestAnimationFrame();
    
            if (this.indicators.length == 0) return;
    
            if (shouldRenderChart) {

                if (this.showTimeScale)
                    this.changed = false;

                let bounds = {
                    x: 0,
                    y: 0,
                    w: this.chartBounds.width,
                    h: this.chartBounds.height
                };

                let outerBounds = {
                    x: 0,
                    y: 0,
                    w: this.scaleBounds.width,
                    h: this.scaleBounds.height
                };

                this.chartRenderer.context = {
                    indicators:      this.indicators,
                    bounds:          bounds,
                    outerBounds:     outerBounds,
                    background:      Colors.Background,
                    canvasCtx:       this.chartCtx,
                    currentTime:     Date.now(),
                    offsetX:         this.offsetX,
                    offsetY:         this.offsetY,
                    scaleX:          this.scaleX,
                    scaleY:          this.scaleY,
                    mousePos:        this.mousePosRelative,
                    hovered:         this.hovered,
                    mouseDown:       this.mouseDown,
                    mouseDownGlobal: this.state.mouseDown,
                    mouseDownArea:   this.mouseDownArea,
                    draggingScale:   this.draggingScale,
                    showTimeScale:   this.showTimeScale,
                    scaleRenderer:   this.scaleRenderer.children[0] as ScaleRenderer
                };

                (this.scaleRenderer.children[0] as ScaleRenderer).clearMarkedPrices();
                this.chartRenderer.render();

                this.changeDetector.detectChanges();

                if (this.flash) {
                    this.chartCtx.fillStyle = "yellow";
                    this.chartCtx.fillRect(10, 10, 20, 20);
                }

                this.flash = !this.flash;
                this.indicators.forEach(ind => ind.changed = false);
            }
        } catch (err) {
            this.cancelAnimationFrame(frameHandle);
            throw err;
        }

        this.renderScale();
        this.handleKeyboard();
    }

    public onChartMouseDown(pos: Point, button: number) {        
        this.mouseDown = true;
        this.lastMousePos = pos;

        if (button == 2) this.preventContextMenu = true;
    }

    @HostListener("window:contextmenu", ["$event"])
    public shouldPreventContextMenu(e: Event) {
        if (this.preventContextMenu)
            e.preventDefault();
    }

    public onScaleMouseDown(pos: Point, button: number) {
        this.mouseDown = true;
        this.draggingScale = true;
        this.lastMousePos = pos;

        this.scaleAxis = this.showTimeScale
            && this.mousePosRelative.y > this.scaleBounds.height - 30
                ? "time" : "price";

        if (button == 2) {
            this.preventContextMenu = true;

            if (this.scaleAxis == "time")
                this.onResetScaleX();
            else
                this.onResetScaleY();
        }
    }
    
    @HostListener("window:mouseup")
    public onMouseUp() {
        this.mouseDown = false;
        this.draggingScale = false;
        this.lastMousePos = null;

        setTimeout(() => this.preventContextMenu = false);
    }

    @HostListener("window:mousemove", ["{ x: $event.clientX, y: $event.clientY }"])
    public onMouseMove(pos: Point) {
        if (this.hovered || this.state.mouseDown)
            this.changed = true;

        if (this.chartBounds) {
            this.mousePosRelative = { 
                x: pos.x - this.chartBounds.left,
                y: pos.y - this.chartBounds.top
            };
        }

        if (this.mouseDown) {
            let delta = {
                x: pos.x - this.lastMousePos.x,
                y: pos.y - this.lastMousePos.y
            };
    
            if (this.draggingScale) {
                this.onScaleMouseMove(delta)
            } else {
                this.onChartMouseMove(delta);
            }
    
            this.lastMousePos = pos;
        }
    }

    public onChartMouseWheel(delta: Point) {
        let scaleXDelta = -delta.y / 1000;
        let dragTime = this.indicators[0].timeFrame * delta.x / this.chartRenderer.periodWidth;

        this.setState.emit({
            ...this.state,
            scaleX: Math.max(this.scaleX + scaleXDelta, 0.2),
            offsetX: this.offsetX + dragTime / 3,
            changed: true
        });
    }

    public onChartMouseMove(delta: Point) {
        let dragTime = this.indicators[0].timeFrame * delta.x / this.chartRenderer.periodWidth;

        this.setState.emit({
            ...this.state,
            offsetX: this.offsetX - dragTime,
            changed: true
        });

        if (this.scaleY == 1) return;

        this.offsetY += delta.y;
    }

    public onScaleMouseMove(delta: Point) {
        if (this.scaleAxis == "time")
            this.scaleX = Math.max(this.scaleX - delta.x * 0.002, this.minScaleX);
        else
            this.scaleY = Math.max(this.scaleY - delta.y * 0.002, this.minScaleY);

        this.changed = true;
    }

    @HostListener("window:keydown", ["$event.key"])
    public onKeyDown(key: string): void {
        if (!this.primary) return;

        switch (key) {
            case "ArrowLeft":  this.keyboard.left  = true; break;
            case "ArrowRight": this.keyboard.right = true; break;
            case "ArrowUp":    this.keyboard.up    = true; break;
            case "ArrowDown":  this.keyboard.down  = true; break;
            case "Shift":      this.keyboard.shift = true; break;
        }
    }

    @HostListener("window:keyup", ["$event.key"])
    public onKeyUp(key: string): void {
        if (!this.primary) return;

        switch (key) {
            case "ArrowLeft":  this.keyboard.left  = false; break;
            case "ArrowRight": this.keyboard.right = false; break;
            case "ArrowUp":    this.keyboard.up    = false; break;
            case "ArrowDown":  this.keyboard.down  = false; break;
            case "Shift":      this.keyboard.shift = false; break;
        }
    }

    @HostListener("window:blur")
    public onBlur() {
        if (!this.primary) return;

        this.keyboard.left  = false;
        this.keyboard.right = false;
        this.keyboard.up    = false;
        this.keyboard.down  = false;
        this.keyboard.shift = false;
    }

    public handleKeyboard() {
        if (!this.primary) return;

        if (!this.hovered) {
            this.lastKeyboardHandleTime = null;
            return;
        }

        let now = Date.now();
        let timeDelta = 1;
        
        if (this.lastKeyboardHandleTime)
            timeDelta = (now - this.lastKeyboardHandleTime) / (1000 / Hz);

        let changed = false;
        let offsetX = this.offsetX;
        let offsetXSpeed = 0.1 * timeDelta;
        let offsetXFactor = 1 / (this.scaleX * (1 - offsetXSpeed));
        let offsetYAmount = 12 * timeDelta;
        let scaleX = this.scaleX;

        if (this.keyboard.left && !this.keyboard.right) {
            if (this.keyboard.shift) scaleX *= 0.95;
            else offsetX -= this.indicators[0].timeFrame * offsetXFactor;
            changed = true;
        }
        else if (!this.keyboard.left && this.keyboard.right) {
            if (this.keyboard.shift) scaleX *= 1.05;
            else offsetX += this.indicators[0].timeFrame * offsetXFactor;
            changed = true;
        }

        if (this.keyboard.up && !this.keyboard.down) {
            if (this.keyboard.shift) this.scaleY *= 1.025;
            else this.offsetY += offsetYAmount;
            if (this.scaleY == 1) this.scaleY = 0.9999999;
            changed = true;
        }
        else if (!this.keyboard.up && this.keyboard.down) {
            if (this.keyboard.shift) this.scaleY = Math.max(this.scaleY * 0.975, 0.2);
            else this.offsetY -= offsetYAmount;
            if (this.scaleY == 1) this.scaleY = 0.9999999;
            changed = true;
        }

        if (changed) {
            this.setState.emit({
                ...this.state,
                offsetX: offsetX,
                scaleX: Math.max(scaleX, 0.2),
                changed: true
            });

            this.lastKeyboardHandleTime = now;
        } else {
            this.lastKeyboardHandleTime = null;
        }
    }
    
    public onResetScaleX() {
        this.scaleX = 1;
        this.offsetX = 0;
        this.changed = true;
    }

    public onResetScaleY() {
        this.setState.emit({
            ...this.state,
            scaleX: 1,
            offsetX: 0,
            changed: true
        });
    }

    public onResetScaleBoth() {
        this.onResetScaleX();
        this.onResetScaleY();
        this.state.reset = true;
    }
}