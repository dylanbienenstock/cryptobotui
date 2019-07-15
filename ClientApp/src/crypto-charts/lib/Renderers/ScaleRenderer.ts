import { Renderer, Point, Rectangle } from "../Renderer";
import { Decimal } from "decimal.js";

Decimal.set({ toExpNeg: -100, toExpPos: 100 })

interface TimeScaleLevel {
    x: number;
    textX: number;
    text: string;
}

interface PriceScaleLevel {
    y: number;
    textY: number;
    text: string;
}

interface MarkedPrice {
    price: number;
    color: string;
}

export class ScaleRenderer extends Renderer {
    private minPriceCellSize = 32;
    private minTimeCellSize = 64;
    private priceScaleWidth = 80;
    private scaleBackground = "#242424";
    private hoverBackground = "#444";
    private tickStroke = "#777";

    private lastBounds: Rectangle;

    private lastTimeMin;
    private lastTimeMax;
    private timeStep = 60000;

    private lastPriceMin;
    private lastPriceMax;
    private priceStep;

    private timeScaleLevels: TimeScaleLevel[];
    private priceScaleLevels: PriceScaleLevel[];

    private markedPrices: MarkedPrice[] = [];

    private get timeScaleWidth(): number {
        return this.priceScaleX;
    }

    private get timeScaleHeight(): number {
        return this.context.showTimeScale
            ? 30 : 0;
    }

    private get timeScaleY(): number {
        return this.h - this.timeScaleHeight;
    }

    private get timeScaleTextY(): number {
        return this.timeScaleY + 21;
    }

    private get priceScaleHeight(): number {
        return this.h - this.timeScaleHeight;
    }

    private get priceScaleX(): number {
        return Math.round(this.w - this.priceScaleWidth);
    }

    private get priceTextX(): number {
        return this.priceScaleX + 12;
    }

    public render(): void {
        this.canvasCtx.lineWidth = 2;
        this.canvasCtx.strokeStyle = this.scaleBackground;

        if (!this.lastBounds)
            this.lastBounds = this.bounds;

        if (this.lastBounds.w != this.w || this.lastBounds.h != this.h) {
            this.calculateTimeStep();
            this.calculatePriceStep();
        }
        
        this.lastBounds = this.bounds;
        
        this.calculatePriceScale();
        this.renderPriceScaleLines();

        this.calculateTimeScale();
        this.renderTimeScaleLines();

        // this.canvasCtx.fillStyle = "rgba(255, 255, 255, 0.05)";
        // this.canvasCtx.font = "64px Roboto";
        // this.canvasCtx.textAlign = "center";
        // this.canvasCtx.textBaseline = "middle";
        // this.canvasCtx.fillText("BTCUSDT, 1m", this.w / 2, this.h / 2);
    }

    public renderOverCursor() {
        this.renderPriceScaleBackground();
        this.renderPriceScaleLabels();
        this.renderPriceScaleCursor();

        if (this.context.showTimeScale) {
            this.renderTimeScaleBackground();
            this.renderTimeScaleLabels();
            this.renderTimeScaleCursor();
        }
    }

    public markPrice(price: number, color: string): void {
        this.markedPrices.push({ price, color });
    }

    public clearMarkedPrices(): void {
        this.markedPrices = [];
    }

    private get timeScaleBackground(): string {
        if (this.context.mouseDownGlobal && this.context.mouseDownArea != "time")
            return this.scaleBackground;

        return (this.cursorX < this.priceScaleX
            && this.cursorX > 0
            && this.cursorY > this.timeScaleY
            && this.cursorY < this.h) 
            || (this.context.mouseDown && this.context.draggingScale)
                ? this.hoverBackground
                : this.scaleBackground;
    }

    private get priceScaleBackground(): string {
        if (this.context.mouseDownGlobal && this.context.mouseDownArea != "price")
            return this.scaleBackground;

        return (this.cursorX >= this.priceScaleX
            && this.cursorX < this.w
            && this.cursorY < this.h - this.timeScaleHeight
            && this.cursorY > 0)
            || (this.context.mouseDown && this.context.draggingScale)
                ? this.hoverBackground
                : this.scaleBackground;
    }

    private renderTimeScaleBackground(): void {
        this.canvasCtx.fillStyle = this.timeScaleBackground;
        this.canvasCtx.fillRect(0, this.timeScaleY, this.w, this.timeScaleHeight);
    }
    
    private renderPriceScaleBackground(): void {
        this.canvasCtx.fillStyle = this.priceScaleBackground;
        this.canvasCtx.fillRect(this.priceScaleX, 0, this.priceScaleWidth, this.priceScaleHeight);
    }

    private calculateTimeScale() {
        let min = this.unmapX(0);
        let max = this.unmapX(this.timeScaleWidth);

        let spread = max - min;
        let median = min + spread / 2;
        let labels = Math.ceil(this.timeScaleWidth / this.minPriceCellSize);

        if (min != this.lastTimeMin || max != this.lastTimeMax)
            this.calculateTimeStep();

        this.lastTimeMin = min;
        this.lastTimeMax = max;

        this.timeScaleLevels = [];

        for (let i = -labels; i < labels; i++) {
            let time = median + this.timeStep * i;
            let quantized = this.quantize(time, this.timeStep);
            let x = this.mapX(quantized);
            let text = this.formatTime(quantized);
            let textSize = this.canvasCtx.measureText(text);
            let textX = x - textSize.width / 2;

            this.timeScaleLevels.push({ x, textX, text });
        }
    }

    private renderTimeScaleLines() {
        for (let level of this.timeScaleLevels) {
            if (level.x < this.priceScaleX) {
                this.canvasCtx.beginPath();
                this.canvasCtx.moveTo(level.x, 0);
                this.canvasCtx.lineTo(level.x, this.timeScaleY);
                this.canvasCtx.stroke();
            }
        }
    }

    private renderTimeScaleLabels() {
        this.canvasCtx.font = "14px Roboto";
        this.canvasCtx.fillStyle = "#CCCCCC";
        this.canvasCtx.lineWidth = 1;
        this.canvasCtx.strokeStyle = this.tickStroke;

        for (let level of this.timeScaleLevels) {
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(level.x, this.timeScaleY);
            this.canvasCtx.lineTo(level.x, this.timeScaleY + 4);
            this.canvasCtx.stroke();
            this.canvasCtx.fillText(level.text, level.textX, this.timeScaleTextY);
        }
    }

    private isMidnight(date: Date) {
        return date.getUTCHours() == 0 && date.getUTCMinutes() == 0;
    }

    private getTimeStr(date: Date): string {
        if (date.getUTCMinutes().toString().length == 1)
            return `${date.getUTCHours()}:0${date.getUTCMinutes()}`;
        return `${date.getUTCHours()}:${date.getUTCMinutes()}`;
    }

    private getDateStr(date: Date): string {
        let weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        let months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"]
        return `${weekdays[date.getUTCDay()]}, ${months[date.getUTCMonth()]} ${date.getUTCDate()}`;
    }

    private getDateTimeStr(date: Date): string {
        return `${this.getDateStr(date)}, ${this.getTimeStr(date)}`;
    }
    
    private formatTime(quantized: number, full: boolean = false): string {
        let date = new Date(quantized);

        if (full)                       return this.getDateTimeStr(date);
        else if (this.isMidnight(date)) return this.getDateStr(date);
        else                            return this.getTimeStr(date);
    }

    private calculatePriceScale() {
        let min = this.unmapY(this.priceScaleHeight);
        let max = this.unmapY(0);
        let spread = max - min;
        let median = min + spread / 2;
        let labels = Math.ceil(this.priceScaleHeight / this.minPriceCellSize);

        if (min != this.lastPriceMin || max != this.lastPriceMax)
            this.calculatePriceStep();

        this.lastPriceMin = min;
        this.lastPriceMax = max;

        this.priceScaleLevels = [];

        for (let i = -labels; i < labels; i++) {
            let price = median + this.priceStep * i;
            let quantized = this.quantize(price, this.priceStep);
            let y = this.mapY(quantized);
            let text = this.formatPrice(quantized);
            let textY = y + 5;

            this.priceScaleLevels.push({ y, textY, text });
        }
    }

    private renderPriceScaleLines() {
        this.canvasCtx.lineWidth = 1;
        this.canvasCtx.strokeStyle = this.scaleBackground;

        for (let level of this.priceScaleLevels) {
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(0, level.y);
            this.canvasCtx.lineTo(this.priceScaleX, level.y);
            this.canvasCtx.stroke();
        }
    }

    private renderPriceScaleLabels() {
        this.canvasCtx.font = "14px Roboto";
        this.canvasCtx.fillStyle = "#CCCCCC";
        this.canvasCtx.lineWidth = 1;
        this.canvasCtx.strokeStyle = this.tickStroke;
        
        for (let level of this.priceScaleLevels) {
            this.canvasCtx.beginPath();
            this.canvasCtx.moveTo(this.priceScaleX, level.y);
            this.canvasCtx.lineTo(this.priceScaleX + 4, level.y);
            this.canvasCtx.stroke();
            this.adjustPriceLabelFontSize(level.text);
            this.canvasCtx.fillText(level.text, this.priceTextX, level.textY);
        }

        for (let markedPrice of this.markedPrices)
            this.renderMarkedPrice(markedPrice.price, markedPrice.color);
    }

    private renderMarkedPrice(price: number, color: string = "white"): void {
        if (!price) return;

        let x = Math.round(this.priceScaleX);
        let h = 20;
        let y = Math.round(this.mapY(price)) - h / 2;
        let w = this.priceScaleWidth - 0.5;
        let text =  new Decimal(price)
            .div(1 / 100_000_000)
            .round()
            .mul(1 / 100_000_000)
            .toString();

        let fontSize = this.adjustPriceLabelFontSize(text);

        let textY = y + h / 2 + (fontSize * 0.75) / 2;

        this.canvasCtx.fillStyle = this.scaleBackground;
        this.canvasCtx.fillRect(x, y, w, h);
        
        this.canvasCtx.strokeStyle = color;
        this.canvasCtx.strokeRect(x, y, w , h);
        
        this.canvasCtx.fillStyle = color;
        this.canvasCtx.fillText(text, this.priceTextX, textY);
    }

    private adjustPriceLabelFontSize(text: string): number {
        this.canvasCtx.font = "14px Roboto";
        this.canvasCtx.fillStyle = "#CCCCCC";

        let fontSize = 14;
        let textSize = this.canvasCtx.measureText(text);

        while (this.priceTextX + textSize.width > this.w - 8) {
            this.canvasCtx.font = `${--fontSize}px Roboto`;
            textSize = this.canvasCtx.measureText(text);
        }

        return fontSize;
    }

    private renderPriceScaleCursor() {
        if (this.context.hovered && this.cursorY < this.timeScaleY) {
            let cursorPrice = this.unmapY(this.context.mousePos.y);
            this.renderMarkedPrice(cursorPrice);
        }
    }

    private renderTimeScaleCursor() {
        if (this.context.hovered && this.cursorX < this.priceScaleX) {
            let cursorTime = this.unmapX(this.context.mousePos.x + this.periodWidth / 2);
            let cursorText = this.formatTime(cursorTime, true);
            let y = Math.round(this.timeScaleY) + 0.5;
            let padding = 8;
            let w = this.canvasCtx.measureText(cursorText).width + padding * 2;
            let x = Math.round(this.context.mousePos.x) - w / 2;
            let textX = x + padding;
            let h = this.timeScaleHeight - 2;

            this.canvasCtx.fillStyle = this.scaleBackground;
            this.canvasCtx.fillRect(x, y, w, h);

            this.canvasCtx.strokeStyle = "white";
            this.canvasCtx.strokeRect(x, y, w, h);
            
            this.canvasCtx.fillStyle = "#CCCCCC";
            this.canvasCtx.fillText(cursorText, textX, this.timeScaleTextY);
        }
    }

    private formatPrice(price: number): string {
        if (!this.priceStep) return "";

        return new Decimal(price)
            .div(this.priceStep)
            .round()
            .mul(this.priceStep)
            .div(1 / 100_000_000)
            .round()
            .mul(1 / 100_000_000)
            .toString();
    }

    private calculateTimeStep() {
        let timeSteps: number[] = [
            60000,       // 1m 
            300000,      // 5m 
            600000,      // 10m 
            900000,      // 15m
            1800000,     // 30m
            3600000,     // 1h
            7200000,     // 2h
            14400000,    // 4h
            21600000,    // 6h
            43200000,    // 12h
            86400000,    // 1D
            604800000,   // 1W
            2592000000,  // 1M
            31536000000, // 1Y
        ];

        for (let step of timeSteps) {
            let cellSize = this.mapX(step) - this.mapX(0);
            
            if (cellSize > this.minTimeCellSize) {
                this.timeStep = step;
                return;
            }
        }
    }

    private calculatePriceStep() {
        let stepDecimal;
        let digit = -9;
        let op = 0;

        while (digit < 15) {
            stepDecimal = new Decimal(`10E${digit}`);
            
            switch (op) {
                case 0: op++;                                       break;
                case 1: op++;   stepDecimal = stepDecimal.mul(2.5); break;
                case 2: op++;   stepDecimal = stepDecimal.mul(5);   break;
                case 3: op = 0; digit++;                            continue;
            }

            let cellSize = this.mapY(0) - this.mapY(stepDecimal.toNumber());

            if (cellSize > this.minPriceCellSize) {
                this.priceStep = stepDecimal.toNumber();
                return;
            }
        }
    }
}