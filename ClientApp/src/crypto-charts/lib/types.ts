export enum OrderSide { Bid = "bid", Ask = "ask" };
export type Currency = string | number;
export type Pair = { base: Currency, quote: Currency };
export type Order = { price: number, amount: number, time: number };
export type AggregatedOrder = { price: number, amount: number[], time: number };
export interface OrderNode extends AggregatedOrder { prev?: OrderNode, next?: OrderNode };