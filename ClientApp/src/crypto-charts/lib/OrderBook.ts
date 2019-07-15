import { OrderSide, Order } from "./types";
import { OrderList } from "./OrderList";

export interface BookOrderContext { side: OrderSide };
export interface BookOrder extends Order, BookOrderContext { };

export class OrderBook {
    public bids: OrderList;
    public asks: OrderList;

    constructor() {
        this.bids = new OrderList(OrderSide.Bid);
        this.asks = new OrderList(OrderSide.Ask);
    }

    public record(bookOrder: BookOrder) {
        let order: Order = {
            price: bookOrder.price,
            amount: bookOrder.amount,
            time: bookOrder.time
        };

        bookOrder.side == OrderSide.Bid
            ? this.bids.record(order)
            : this.asks.record(order);
    }

    public delete(price: number, side: OrderSide) {
        side == OrderSide.Bid
            ? this.bids.delete(price)
            : this.asks.delete(price);
    }

    public getList(side: OrderSide): OrderList {
        return side == OrderSide.Bid
            ? this.bids
            : this.asks;
    }

    public getBestPrice(side: OrderSide): Order {
        let order = (side == OrderSide.Bid)
            ? this.bids.tail
            : this.asks.tail;

        if (!order) return null;

        return {
            price: order.price,
            amount: order.amount[order.amount.length - 1],
            time: order.time
        };
    };

    public getBestBid(): Order { return this.getBestPrice(OrderSide.Bid); };
    public getBestAsk(): Order { return this.getBestPrice(OrderSide.Ask); };

    public getSpread(): number {
        let bestBid = this.getBestBid().price;
        let bestAsk = this.getBestAsk().price;

        return Math.abs(bestAsk - bestBid);
    }
}