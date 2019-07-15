import { Renderer, Point } from "../Renderer";
import { Colors } from "../Colors";
import { TimeSeriesEntry } from "../TimeSeries";

const fractalSize = 8;
const fractalGap = 10;

export class FractalRenderer extends Renderer {
    public render(): void {
        let timesEntriesRaw = this.field(0)
            .timeSlice(this.timeWindow);

        let priceField = this.field(1);
        let timeEntries: TimeSeriesEntry[] = [];
        
        for (let timeEntry of timesEntriesRaw) {
            if (!timeEntries[timeEntries.length - 1] || 
                this.quantize(timeEntry.value, this.timeFrame, "floor") != 
                this.quantize(timeEntries[timeEntries.length - 1].value, this.timeFrame, "floor")) {
                    timeEntries.push({
                        time: this.quantize(timeEntry.time, this.timeFrame, "floor"),
                        value: this.quantize(timeEntry.value, this.timeFrame, "round")
                    });
                }
        }

        let points = timeEntries
            .filter((entry, i) => i == 0 || Math.abs(timeEntries[i - 1].value - entry.value) >= this.timeFrame * 3)
            .map(entry => this.mapXY(entry.value, priceField.values[entry.time] || 0));

        this.canvasCtx.strokeStyle = this.settings.direction == "up"
            ? Colors.Bullish : Colors.Bearish;

        for (let point of points) {
            this.canvasCtx.beginPath();

            if (this.settings.direction == "up") {
                this.canvasCtx.moveTo(point.x, point.y - fractalGap - fractalSize);
                this.canvasCtx.lineTo(point.x - fractalSize / 2, point.y - fractalGap);
                this.canvasCtx.lineTo(point.x + fractalSize / 2, point.y - fractalGap);
            } else {
                this.canvasCtx.moveTo(point.x, point.y + fractalGap + fractalSize);
                this.canvasCtx.lineTo(point.x + fractalSize / 2, point.y + fractalGap);
                this.canvasCtx.lineTo(point.x - fractalSize / 2, point.y + fractalGap);
            }

            this.canvasCtx.closePath();
            this.canvasCtx.stroke();
        }

        this.postRender(points);
    }

    public postRender(points: Point[]): void { }
}