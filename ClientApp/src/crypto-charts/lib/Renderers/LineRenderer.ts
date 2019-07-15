import { Renderer } from "../Renderer";

export class LineRenderer extends Renderer {
    public render(): void {
        this.canvasCtx.strokeStyle = "red";
        this.canvasCtx.lineWidth = 1;

        for (let fieldName of this.fieldNames) {
            let path = new Path2D();
            let points = this.getPointArray(this.field(this.fieldNames[0]))
                
            let firstPoint = points.shift();
            path.moveTo(firstPoint.x, firstPoint.y);
            points.forEach(p => path.lineTo(p.x, p.y));
    
            this.canvasCtx.stroke(path);
        }
    }
}