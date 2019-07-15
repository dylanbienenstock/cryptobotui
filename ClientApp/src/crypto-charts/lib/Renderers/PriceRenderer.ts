import { Renderer, Point } from "../Renderer";
import { Colors } from "../Colors";

interface Candle {
    upperShadow:    Point;
    realBodyTop:    Point;
    realBodyBottom: Point;
    lowerShadow:    Point;
    color:          string;
}

export class PriceRenderer extends Renderer {
    public render(): void {
        this.canvasCtx.lineWidth = 1;

        let openPoints  = this.getPointArray(this.field("Open"));
        let highPoints  = this.getPointArray(this.field("High"));
        let lowPoints   = this.getPointArray(this.field("Low"));
        let closePoints = this.getPointArray(this.field("Close"));
        
        let candles: Candle[] = [];
        let realBodyWidth = this.periodWidth * 0.6;

        for (let i = 0; i < openPoints.length; i++) {
            if (!openPoints[i] || !highPoints[i] || !lowPoints[i] || !closePoints[i]) continue;

            candles.push({
                upperShadow:    highPoints[i],
                realBodyTop:    this.minY(openPoints[i], closePoints[i]),
                realBodyBottom: this.maxY(openPoints[i], closePoints[i]),
                lowerShadow:    lowPoints[i],
                color: (openPoints[i].y >= closePoints[i].y)
                    ? Colors.Bullish : Colors.Bearish
            });
        }

        for (let candle of candles) {
            this.canvasCtx.strokeStyle = candle.color;
            this.canvasCtx.fillStyle = candle.color;

            let wickPath = new Path2D();
            wickPath.moveTo(candle.upperShadow.x, candle.upperShadow.y);
            wickPath.lineTo(candle.lowerShadow.x, candle.lowerShadow.y);
            this.canvasCtx.stroke(wickPath);

            this.canvasCtx.fillRect(
                candle.realBodyTop.x - realBodyWidth / 2,
                candle.realBodyTop.y,
                realBodyWidth,
                Math.max(1, candle.realBodyBottom.y - candle.realBodyTop.y)
            );
        }

        let currentPeriodOpenPrice = this.field("Open").lastValue;
        let currentPrice = this.field("Close").lastValue;
        let currentPriceY = this.mapY(currentPrice);
        let currentCandleBullish = currentPrice >= currentPeriodOpenPrice;
        let priceLineColor = currentCandleBullish ? Colors.Bullish : Colors.Bearish;
        let priceLineOffsetY = currentCandleBullish ? 0.5 : -0.5;

        this.canvasCtx.save();
        this.canvasCtx.strokeStyle = priceLineColor;
        this.canvasCtx.setLineDash([1, 2]);
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(0, currentPriceY + priceLineOffsetY);
        this.canvasCtx.lineTo(this.w, currentPriceY + priceLineOffsetY);
        this.canvasCtx.stroke();
        this.canvasCtx.restore();

        this.context.scaleRenderer.markPrice(currentPrice, priceLineColor);
    }

    private maxY(a: Point, b: Point) {
        if (a.y >= b.y) return a;
        return b;
    }

    private minY(a: Point, b: Point) {
        if (a.y < b.y) return a;
        return b;
    }
}