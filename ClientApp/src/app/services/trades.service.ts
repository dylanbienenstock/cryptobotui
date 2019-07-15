import { Injectable, EventEmitter } from '@angular/core';
import { MarketReference } from 'src/crypto-charts/lib/MarketReference';
import { OrderSide } from 'src/crypto-charts/lib/types';
import { ISubscription } from '@aspnet/signalr';
import { SignalRService } from './signalr.service';

export interface TradeMessage {
    marketRef: MarketReference;
    price:     number;
    amount:    number;
    side:      OrderSide;
    time:      Date;
    id?:       number;
}

@Injectable({
    providedIn: 'root'
})
export class TradesService {

    constructor(private signalR: SignalRService) { }

    public limit: number = 40;
    public list: TradeMessage[];

    private marketRef: MarketReference;
    private stream: ISubscription<TradeMessage>;
    private count: number;

    public async subscribe(exchangeName: string, symbol: string): Promise<void> {
        await this.signalR.connected;

        this.list = [];
        this.count = 0;

        if (this.stream) {
            this.stream.dispose();
            this.stream = null;
        }

        this.marketRef = new MarketReference(exchangeName, symbol);
        
        this.stream = this.signalR.stream<TradeMessage[]>("SubscribeToTrades", this.marketRef)
            .subscribe({
                next: msg => msg.forEach(t => this.onTrade(t)),
                error: (err) => console.error(err),
                complete: () => console.log("DONE")
            });
    }

    public onTrade(trade: TradeMessage) {
        if (trade.amount.toString() == "0") return;
        if (trade.marketRef.exchangeName != this.marketRef.exchangeName) return;
        if (trade.marketRef.symbol != this.marketRef.symbol) return;

        trade.id = this.count++;
        trade.side = (this.list.length == 0 || trade.price > this.list[this.list.length - 1].price)
            ? OrderSide.Bid : OrderSide.Ask;

        this.list.unshift(trade);

        if (this.list.length > this.limit)
            this.list.pop();
    }
}
