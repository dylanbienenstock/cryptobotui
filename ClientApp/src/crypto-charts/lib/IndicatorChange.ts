export interface IndicatorChange {
    indicatorId: string;
    fieldChanges: IndicatorFieldChange[];
}

export interface IndicatorFieldChange {
    fieldName: string;
    timeSeriesChanges: TimeSeriesChanges[];
}

export interface TimeSeriesChanges {
    time: number;
    value: number;
}