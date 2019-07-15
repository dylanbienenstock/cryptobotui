import { Renderer, Rectangle, Point } from "../Renderer";
                                                                                                                            import { Colors } from "../Colors";

import { checkIntersection } from "line-intersect";

export interface Threshold {
    max: number;
    high: number;
    low: number;
    min: number;
}

export interface ThresholdBool {
    high: boolean;
    normal: boolean;
    low: boolean;
}

export interface ThresholdPoints {
    high: Point[];
    normal: Point[];
    low: Point[];
}

export interface ThresholdPaths {
    high: Path2D[];
    normal: Path2D[];
    low: Path2D[];
}

export class ThresholdLineRenderer extends Renderer {
    private intersectionPoints: Point[] = [];

    private renderZone(paths: Path2D[], color: string, fillColor: string = null, closeAt: Point = null) {
        this.canvasCtx.lineWidth = 1;
        this.canvasCtx.strokeStyle = color;
        this.canvasCtx.fillStyle = fillColor;

        for (let i = 0; i < paths.length; i++) {
            if (fillColor) {
                let closedPath = new Path2D();
                /// @ts-ignore
                closedPath.addPath(paths[i]);
                
                if (closeAt) {
                    closedPath.lineTo(closeAt.x, closeAt.y);
                }

                closedPath.closePath();
                this.canvasCtx.fill(closedPath);
            }

            this.canvasCtx.stroke(paths[i]);
        }
    }

    private renderLine(y: number) {
        this.canvasCtx.lineWidth = 0.5;
        this.canvasCtx.strokeStyle = Colors.Neutral;
        this.canvasCtx.beginPath();
        this.canvasCtx.moveTo(0, y);
        this.canvasCtx.lineTo(this.w, y);
        this.canvasCtx.stroke();
    }

    private buildZonePath(points: Point[], levels: Threshold): ThresholdPaths {
        let zonePoints: { point: Point, zone: "high" | "normal" | "low" }[] = [];

        let paths: ThresholdPaths = {
            high:   [new Path2D()],
            normal: [new Path2D()],
            low:    [new Path2D()]
        };
            
        for (let i = 0; i < points.length; i++) {
            let point = points[i];
            let zone: "normal" | "high" | "low" = "normal";

            if      (point.y < levels.high) zone = "high";
            else if (point.y > levels.low)  zone = "low";
            
            zonePoints.push({ point, zone });
        }

        this.intersectionPoints = [];

        for (let i = 0; i < zonePoints.length; i++) {
            let curr = zonePoints[i];
            let next = zonePoints[i + 1];

            if (!next || next.zone == curr.zone)
            {
                paths[curr.zone][0].lineTo(curr.point.x, curr.point.y);
            } 
            else if (next)
            {
                let line = (point: Point, zone = null) => {
                    if (zone == null) zone = next.zone;

                    paths[curr.zone][0].lineTo(point.x, point.y);
                    
                    paths[zone].unshift(new Path2D());
                    paths[zone][0].lineTo(Math.max(0, point.x), point.y);
                    paths[zone][0].lineTo(next.point.x, next.point.y);

                    this.intersectionPoints.push(point);
                }

                if ((curr.zone == "normal" && next.zone == "high") || (curr.zone == "high" && next.zone == "normal")) {
                    let result = checkIntersection(
                        curr.point.x, curr.point.y, next.point.x, next.point.y,
                        -this.outerW, levels.high, this.outerW, levels.high
                    );

                    if (result.type == "intersecting")
                        line(result.point);
                }

                if ((curr.zone == "normal" && next.zone == "low") || (curr.zone == "low" && next.zone == "normal")) {
                    let result = checkIntersection(
                        curr.point.x, curr.point.y, next.point.x, next.point.y,
                        -this.outerW, levels.low, this.outerW, levels.low
                    );

                    if (result.type == "intersecting")
                        line(result.point);
                }

                if ((curr.zone == "low" && next.zone == "high") || (curr.zone == "high" && next.zone == "low")) {
                    let lowResult = checkIntersection(
                        curr.point.x, curr.point.y, next.point.x, next.point.y,
                        -this.outerW, levels.low, this.outerW, levels.low
                    );

                    let highResult = checkIntersection(
                        curr.point.x, curr.point.y, next.point.x, next.point.y,
                        -this.outerW, levels.high, this.outerW, levels.high
                    );

                    let firstResult = curr.zone == "low"
                        ? lowResult : highResult;

                    let secondResult = curr.zone == "low"
                        ? highResult : lowResult;

                    paths[curr.zone][0].lineTo(firstResult.point.x, firstResult.point.y);
                    paths[curr.zone].unshift(new Path2D());
                    paths["normal"].unshift(new Path2D());
                    paths["normal"][0].lineTo(firstResult.point.x, firstResult.point.y);
                    paths["normal"][0].lineTo(secondResult.point.x, secondResult.point.y);
                    paths["normal"].unshift(new Path2D());
                    paths[next.zone].unshift(new Path2D());
                    paths[next.zone][0].lineTo(secondResult.point.x, secondResult.point.y);
                    paths[next.zone][0].lineTo(next.point.x, next.point.y);

                    this.intersectionPoints.push(firstResult.point);
                    this.intersectionPoints.push(secondResult.point);
                }
            }
        }

        return paths;
    }

    public render(): void {
        let spread = this.settings.max - this.settings.min;
        let padding = spread * 0.05;
        this.setRange({ min: this.settings.min - padding, max: this.settings.max + padding });
        
        this.canvasCtx.strokeStyle = "red";
        this.canvasCtx.lineWidth = 1;

        for (let fieldName of this.fieldNames) {
            let path = new Path2D();
            let points = this.getPointArray(this.field(this.fieldNames[0]))

            if (points.length == 0) return;

            let levels: Threshold = {
                max:  this.mapY(this.settings.max),
                high: this.mapY(this.settings.high),
                low:  this.mapY(this.settings.low),
                min:  this.mapY(this.settings.min)
            };

            let zones: { [zone: string]: Rectangle } = {
                high: {
                    x: 0, 
                    y: levels.max,
                    w: this.outerW,
                    h: levels.high - levels.max
                },
                normal: {
                    x: 0,
                    y: levels.high,
                    w: this.outerW,
                    h: levels.low - levels.high
                },
                low: {
                    x: 0,
                    y: levels.low,
                    w: this.outerW,
                    h: levels.min - levels.low
                }
            };

            let paths = this.buildZonePath(points, levels);
            let closeAtY = points[points.length - 1].y <= levels.high 
                ? levels.high : (points[points.length - 1].y >= levels.low
                    ? levels.low : null)
            let closeAt: Point = { x: points[points.length - 1].x, y: closeAtY };

            this.renderLine(levels.high);
            this.renderLine(levels.low);
            this.renderZone(paths.high, Colors.Bearish, Colors.BearishTransparent, closeAtY == levels.high ? closeAt : null); // High
            this.renderZone(paths.normal, Colors.Neutral, null); // Normal
            this.renderZone(paths.low, Colors.Bullish, Colors.BullishTransparent, closeAtY == levels.low ? closeAt : null); // Low
        }
    }
}