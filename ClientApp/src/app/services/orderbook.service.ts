import { Injectable } from '@angular/core';
import { SignalRService } from './signalr.service';
import { OrderBook, BookOrder } from 'src/crypto-charts/lib/OrderBook';
import { MarketReference } from './signalr.types';
import { OrderSide, Order } from 'src/crypto-charts/lib/types';
import { ISubscription } from '@aspnet/signalr';

interface OrderMessage {
    marketRef: MarketReference;
    price:     number;
    amount:    number;
    side:      OrderSide;
    time:      Date;
}

@Injectable({
    providedIn: 'root'
})
export class OrderbookService {

    constructor(private signalR: SignalRService) { }

    public limit: number = 20;

    public bids: Order[] = [];
    public asks: Order[] = [];

    public amountFormat = "1.3";
    public priceFormat = "1.3";

    public bidDepth: number = 0;
    public askDepth: number = 0;
    public largestAsk: number = 0;
    public largestBid: number = 0;

    private orderbook: OrderBook;
    private stream: ISubscription<OrderMessage>;

    public async setMarketRef(exchangeName: string, symbol: string): Promise<void> {
        await this.signalR.connected;

        this.orderbook = new OrderBook();

        if (this.stream) {
            this.stream.dispose();
            this.stream = null;
        }

        let marketRef = new MarketReference(exchangeName, symbol);
        
        this.stream = this.signalR.stream<OrderMessage[]>("SubscribeToOrderbook", marketRef)
            .subscribe({
                next: msg => {
                    msg.forEach(o => {
                        this.orderbook.record({
                            price:  o.price,
                            amount: o.amount,
                            side:   o.side,
                            time:   new Date(o.time).getTime()
                        });
                    });

                    this.processOrderList(OrderSide.Bid);
                    this.processOrderList(OrderSide.Ask);
                },
                error: (err) => console.error(err),
                complete: null
            });
    }

    private sumArr(arr: number[]): number {
        if (arr.length == 0) return 0;
        return arr.reduce((accum, val) => Number(accum) + Number(val));
    }

    private maxArr(arr: number[]): number {
        if (arr.length == 0) return 0;
        return arr.reduce((largest, next) => Math.max(largest, next));
    }

    private getNumberFormat(arr: number[]): string {
        let getDecimalPlaces = (num: number): number =>
            ((((num.toString().match(/\d*\.(\d+)/)))||["", ""])[1]).length;
        let decimalPlaces: { [places: number]: number } = { };
        let maxOccurances = 0;
        let placesMode = 0;
        arr.forEach(num => {
            let places = getDecimalPlaces(num);
            decimalPlaces[places] = (decimalPlaces[places] || 0) + 1;
        });
        Object.keys(decimalPlaces).forEach(places => {
            let occurances = decimalPlaces[places];
            if (occurances > maxOccurances)
                placesMode = Number(places);
        });
        return `1.${placesMode}`;
    }

    private processOrderList(side: OrderSide): void {
        let rawOrders = this.orderbook.getList(side).toArray(this.limit);
        let resultOrders: Order[] = rawOrders.map(o => ({
            price:  o.price,
            time:   o.time,
            amount: o.amount[o.amount.length - 1]
        }));
        let amounts = resultOrders.map(o => o.amount);
        let depthSum = this.sumArr(amounts);
        let largestDepth = this.maxArr(amounts);

        if (side == OrderSide.Bid) {
            this.bids = resultOrders;
            this.bidDepth = depthSum;
            this.largestBid = largestDepth;
        } else {
            this.asks = resultOrders.reverse();
            this.askDepth = depthSum;
            this.largestAsk = largestDepth;
        }
    }

    private onOrderPlaced(order: BookOrder): void {
        this.orderbook.record(order);
    }
}
