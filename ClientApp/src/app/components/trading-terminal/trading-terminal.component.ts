import { Component, OnInit } from '@angular/core';
import { MarketReference } from 'src/app/services/signalr.types';

@Component({
    selector: 'app-trading-terminal',
    templateUrl: './trading-terminal.component.html',
    styleUrls: ['./trading-terminal.component.scss']
})
export class TradingTerminalComponent implements OnInit {

    constructor() { }

    public marketRef: MarketReference = new MarketReference("Binance", "BTC/USDT");

    ngOnInit() {
    }

    onSymbolClicked(symbol: string) {
        this.marketRef = new MarketReference(this.marketRef.exchangeName, symbol);
    }
}
