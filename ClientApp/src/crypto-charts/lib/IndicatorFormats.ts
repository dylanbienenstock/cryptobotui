import { IndicatorDataAggregateConstructor } from "./IndicatorDataAggregate";
import { RendererType } from "./RendererType";
import { LineRenderer } from "./Renderers/LineRenderer";
import { PriceRenderer } from "./Renderers/PriceRenderer";
import { ScaleRenderer } from "./Renderers/ScaleRenderer";
import { ThresholdLineRenderer } from "./Renderers/ThresholdLineRenderer";
import { FractalRenderer } from "./Renderers/FractalRenderer";
import { FractalChannelRenderer } from "./Renderers/FractalChannelRenderer";

export const IndicatorFormats: { [indicatorName: string]: IndicatorDataAggregateConstructor } = {
    "Candlestick": {
        primaryFieldName: "Close",
        fieldNames: ["Open", "High", "Low", "Close"],
        renderers: [
            {
                rendererClass: PriceRenderer,
                fieldNames: ["Open", "High", "Low", "Close"]
            }
        ]
    },
    "Scale": {
        primaryFieldName: "Close",
        fieldNames: ["Open", "High", "Low", "Close"],
        renderers: [
            {
                rendererClass: ScaleRenderer,
                fieldNames: ["Open", "High", "Low", "Close"]
            }
        ]
    },
    "Relative Strength Index": {
        primaryFieldName: "rsi",
        fieldNames: ["rsi"],
        renderers: [
            {
                rendererClass: ThresholdLineRenderer,
                fieldNames: ["rsi"],
                settings: {
                    max:  100,
                    high: 70,
                    low:  30,
                    min:  0
                }
            }
        ]
    },
    "Moving Average Convergence Divergence": {
        primaryFieldName: "Histogram",
        fieldNames: ["MACD", "Signal", "Histogram"],
        renderers: [
            {
                rendererClass: LineRenderer,
                fieldNames: ["MACD"]
            },
            {
                rendererClass: LineRenderer,
                fieldNames: ["Signal"]
            },
            {
                rendererClass: LineRenderer,
                fieldNames: ["Histogram"]
            }
        ]
    },
    "Williams' Fractals": {
        primaryFieldName: "Last Up Fractal Time",
        nonPriceFieldNames: [
            "Last Up Fractal Time",
            "Last Down Fractal Time"
        ],
        fieldNames: [
            "Last Up Fractal Time",
            "Last Up Fractal Price",
            "Last Down Fractal Time",
            "Last Down Fractal Price"
        ],
        renderers: [
            {
                rendererClass: FractalChannelRenderer,
                settings: { direction: "up" },
                fieldNames: [
                    "Last Up Fractal Time",
                    "Last Up Fractal Price"
                ]
            },
            {
                rendererClass: FractalChannelRenderer,
                settings: { direction: "down" },
                fieldNames: [
                    "Last Down Fractal Time",
                    "Last Down Fractal Price"
                ]
            }
        ]
    }
};