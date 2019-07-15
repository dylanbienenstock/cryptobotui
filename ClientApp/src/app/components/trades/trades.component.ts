import { Component, ElementRef, Input } from '@angular/core';
import { SignalRService } from 'src/app/services/signalr.service';
import { TradesService, TradeMessage } from 'src/app/services/trades.service';
import { MarketReference } from 'src/crypto-charts/lib/MarketReference';

@Component({
    selector: 'app-trades',
    templateUrl: './trades.component.html',
    styleUrls: ['./trades.component.scss']
})
export class TradesComponent {

    constructor(
        private hostRef: ElementRef,
        private signalR: SignalRService,
        public trades: TradesService
    ) { }

    private get host(): HTMLElement {
        return this.hostRef.nativeElement;
    }

    @Input() set marketRef(val: MarketReference) {
        this.trades.subscribe(val.exchangeName, val.symbol);
    }

    public height: number;

    public trackByFn(index: number, item: TradeMessage) {
        if (!item) return null;
        return item.id;
    }
}
