import { Rectangle, Point, Renderer } from "./Renderer";
import { Indicator } from "./Indicator";
import { ScaleRenderer } from "./Renderers/ScaleRenderer";

export interface RenderContext {
    indicators:       Indicator[];
    outerBounds:      Rectangle;
    bounds:           Rectangle;
    background:       string;
    canvasCtx:        CanvasRenderingContext2D;
    currentTime:      number;
    offsetX:          number;
    offsetY:          number;
    scaleX:           number;
    scaleY:           number;
    mousePos:         Point;
    hovered:          boolean;
    mouseDown:        boolean;
    mouseDownGlobal:  boolean,
    mouseDownArea:    "chart" | "time" | "price" | "outside";
    draggingScale:    boolean;
    showTimeScale:    boolean;
    scaleRenderer?:   ScaleRenderer;
}