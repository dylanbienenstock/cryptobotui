import { Component, ElementRef, Input, OnInit, HostListener } from '@angular/core';
import { IndicatorService, IndicatorDetails } from 'src/app/services/indicator.service';
import { SignalRService } from 'src/app/services/signalr.service';
import { Indicator } from 'src/crypto-charts/lib/Indicator';
import { MarketReference } from 'src/crypto-charts/lib/MarketReference';
import { MenuMarkup, MenuOptionMarkup } from '../ui/menu/menu.component';
import { ButtonMarkup } from '../ui/button/button.component';

@Component({
    selector: 'app-chart',
    templateUrl: './chart.component.html',
    styleUrls: ['./chart.component.scss']
})
export class ChartComponent implements OnInit {

    constructor(
        private hostRef: ElementRef,
        private signalR: SignalRService,
        private _indicators: IndicatorService
    ) { }

    private get host(): HTMLElement {
        return this.hostRef.nativeElement;
    }

    private _marketRef: MarketReference;
    get marketRef(): MarketReference {
        return this._marketRef;
    }
    @Input() set marketRef(val: MarketReference) {
        this._marketRef = val;
        this.setMarketRef(val);
    }

    public charts: Indicator[][] = [];

    public state: "chart" | "menu" = "chart";
    public menu: "timeframe" | "indicators" = "timeframe";

    public timeFrame: number = 60000;
    public timeFrameScale: string = "Minutes";
    public timeFrames = [
        {
            scale: "Minutes",
            duration: 60000,
            multiples: [ 1, 3, 5, 15, 30 ]
        },
        {
            scale: "Hours",
            duration: 60000 * 60,
            multiples: [ 1, 2, 4, 6, 12 ]
        },
        {
            scale: "Days",
            duration: 60000 * 60 * 24,
            multiples: [ 1, 3, 7, 30 ]
        }
    ];

    async setMarketRef(val: MarketReference) {
        await this.signalR.connected;

        for (let chart of this.charts) {
            for (let indicator of chart) {
                indicator.dispose();
            }
        }

        this.charts = [
            [this._indicators.get(val.exchangeName, val.symbol, "Candlestick", 60000, {})],
            // [this._indicators.get("Binance", val.symbol, "Relative Strength Index", 60000, { Periods: 14, Aspect: "Close" })]
        ];
    }

    public ngOnInit() {

    }

    @HostListener("window:keypress", ["$event.key"])
    public onKeyPress(key: string) {
        switch (key) {
            case "f": this.onToggleFullscreen(); break;
            case "t":
                if (this.state == "chart") {
                    this.state = "menu";
                    this.menu = "timeframe";
                } else this.state = "chart";
                break;
        }
    }

    public onToggleFullscreen() {
        if (document.fullscreenElement)
            document.exitFullscreen();
        else
            this.host.requestFullscreen();
    }

    public onToggleMenu = () => {
        this.state = this.state == "chart" ? "menu" : "chart";
    }

    public onToggleTimeFrameMenu = () => {
        if (this.state == "menu") {
            if (this.menu == "indicators") {
                this.menu = "timeframe";
            } else {
                this.state = "chart";
            }
        } else {
            this.state = "menu";
            this.menu = "timeframe";
        }
    }

    public onToggleIndicatorsMenu = () => {
        if (this.state == "menu") {
            if (this.menu == "timeframe") {
                this.menu = "indicators";
            } else {
                this.state = "chart";
            }
        } else {
            this.state = "menu";
            this.menu = "indicators";
        }
    }

    public onSetTimeFrame(scale: string, timeFrame: number): void {
        this.timeFrame = timeFrame;
        this.timeFrameScale = scale;
        this.state = "chart";
        let newCharts = this.charts.map(chart => ([
            ...chart.map(indicator => 
                this._indicators.get(
                    indicator.indicatorRef.marketRef.exchangeName,
                    indicator.indicatorRef.marketRef.symbol,
                    indicator.indicatorRef.indicatorName, 
                    timeFrame,
                    indicator.indicatorRef.settings))
        ]));
        this.charts.forEach(chart => chart.forEach(indicator => indicator.dispose()));
        this.charts = newCharts;
    }

    public onAddIndicator(details: IndicatorDetails) {
        this.state = "chart";
        let chartIndex = details.isOscillator ? 1 : 0;

        if (!this.charts[chartIndex])
            this.charts[chartIndex] = [];

        let settings = {};
        details.settings.forEach(setting => settings[setting.key] = setting.defaultValue);

        this.charts[chartIndex] = [
            ...this.charts[chartIndex], 
            this._indicators.get(
                this.marketRef.exchangeName,
                this.marketRef.symbol,
                details.name,
                this.timeFrame,
                settings
            )
        ];

        this.charts = [...this.charts];

        setTimeout(() => dispatchEvent(new Event("resize")));
    }
}
