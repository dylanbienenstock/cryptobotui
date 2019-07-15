import { FractalRenderer } from "./FractalRenderer";
import { Point } from "../Renderer";
import { Colors } from "../Colors";

export class FractalChannelRenderer extends FractalRenderer {
    public postRender(points: Point[]): void {
        if (points.length < 2) return; 
        
        this.canvasCtx.strokeStyle = "white";
        this.canvasCtx.lineWidth = 1;

        this.canvasCtx.beginPath();

        for (let point of points)
            this.canvasCtx.lineTo(point.x, point.y);

        this.canvasCtx.stroke();

        let lastLastFractal = points[points.length - 2];
        let lastFractal = points[points.length - 1];
        let trendDirection = {
            x: lastFractal.x - lastLastFractal.x, 
            y: lastFractal.y - lastLastFractal.y
        };
        let trendDirectionNormalized = {
            x: trendDirection.x / (trendDirection.x + trendDirection.y),
            y: trendDirection.y / (trendDirection.x + trendDirection.y)
        };
        if (trendDirectionNormalized.x < 0) {
            trendDirectionNormalized.x *= -1;
            trendDirectionNormalized.y *= -1;
        }

        let trendLineEnd = {
            x: lastFractal.x + trendDirectionNormalized.x * 2000,
            y: lastFractal.y + trendDirectionNormalized.y * 2000
        };

        // let trendLineColor = this.settings.direction == "up"
        //     ? Colors.Bullish : Colors.Bearish;

        this.canvasCtx.save();
        // this.canvasCtx.strokeStyle = trendLineColor;
        this.canvasCtx.beginPath();
        this.canvasCtx.setLineDash([1, 2]);
        this.canvasCtx.moveTo(lastFractal.x, lastFractal.y);
        this.canvasCtx.lineTo(trendLineEnd.x, trendLineEnd.y);
        this.canvasCtx.stroke();
        this.canvasCtx.restore();

    }
}