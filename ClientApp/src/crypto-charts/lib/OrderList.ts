import { OrderNode, OrderSide, Order, AggregatedOrder } from "./types";
import { TimeSeries } from "./TimeSeries";

export enum BindMode {
    Best = "best",
    Newest = "newest"
}

/** 
 * Stores open orders for one side of an order book 
 * (bids / asks), for one market, as a doubly linked list
 */
export class OrderList {
    /**
     * The worst open order, either the 
     * lowest bid price or the highest ask price
     */
    public head: OrderNode;

    /**
     * The best open order, either the
     * highest bid price or the lowest ask price
     */
    public tail: OrderNode;

    /**
     * The number of open orders stored
     */
    public length: number;

    public side: OrderSide;

    public boundTimeSeries: {
        best: TimeSeries[];
        newest: TimeSeries[];
    }

    /**
     * Constructs a new OrderList
     * 
     * @param side 
     * Whether this order list represents bids or asks,
     * orders will be sorted accordingly
     */
    constructor(side: OrderSide) {
        this.length = 0;
        this.side = side;
        this.boundTimeSeries = { best: [], newest: [] };
    }

    public bindTimeSeries(timeSeries: TimeSeries, bindMode: BindMode) {
        let boundTimeSeries = bindMode == BindMode.Best
            ? this.boundTimeSeries.best
            : this.boundTimeSeries.newest;

        boundTimeSeries.push(timeSeries);
    }

    public unbindTimeSeries(timeSeries: TimeSeries, bindMode: BindMode) {
        let boundTimeSeries = bindMode == BindMode.Best
            ? this.boundTimeSeries.best
            : this.boundTimeSeries.newest;

        boundTimeSeries = boundTimeSeries
            .filter(ts => ts != timeSeries);
    }

    /**
     * Inserts, updates, or removes an order.
     * 
     * If an order with the same price as the given order
     * is present in the list, the amount will be updated.
     * 
     * If the given order's amount is 0, an order with
     * the same price will be removed from the list
     * 
     * @param order
     * The order to record
     */
    public record(order: Order): void {
        this.length += ((): number => {
            // If the order's amount is 0, remove the node with that price
            if (order.amount == 0) return this.delete(order.price);

            // Create a new node from the order
            let node = this.createNode(order);

            // Insert the order into all time series bound to "newest"
            this.updateBoundTimeSeries(node, BindMode.Newest);

            if (this.tail) {
                if ((this.side == OrderSide.Bid && order.price > this.tail.price) ||
                    (this.side == OrderSide.Ask && order.price < this.tail.price)) {
                        // Insert the order into all time series bound to "best"
                        this.updateBoundTimeSeries(node, BindMode.Best);
                    }
            }

            // If the list is empty, add node as Head & Tail
            if (this.length == 0) return this.insertInitialNode(node);

            let seqNode = this.findSequentialNode(node);

            if (!seqNode) return this.insertNodeBeforeHead(node);

            if (seqNode.price == node.price) return this.updateNode(seqNode, order.amount);

            return this.insertNodeAfter(node, seqNode);
        })();
    }

    private updateBoundTimeSeries(node: OrderNode, bindMode: BindMode) {
        let boundTimeSeries = bindMode == BindMode.Best
            ? this.boundTimeSeries.best
            : this.boundTimeSeries.newest;

        boundTimeSeries.forEach(ts => {
            ts.record({ value: node.price, time: node.time});
        });
    }

    /**
     * Converts an Order to an OrderNode
     * 
     * @param order
     * The order to convert
     * 
     * @returns
     * The converted OrderNode
     */
    private createNode(order: Order): OrderNode {
        return {
            price: order.price,
            amount: [order.amount],
            time: order.time
        };
    }

    /**
     * Inserts the given node as the first to ever be inserted 
     * into the list, points both [[head]] and [[tail]] at the given node
     * 
     * @param node
     * The node to insert
     */
    private insertInitialNode(node: OrderNode): number {
        this.head = node;
        this.tail = node;
        return 1;
    }

    /**
     * Finds a node that, if the list were sorted, 
     * would come before the given node
     * 
     * @param beforeNode
     * The node that should come before the returned node
     * 
     * @returns
     * The node that should come after the given node
     */
    private findSequentialNode(beforeNode: OrderNode): OrderNode {
        let node = this.tail;
        let found = false;

        while (node && !found) {
            found = this.side == OrderSide.Bid
                ? (Number(node.price) <= Number(beforeNode.price))
                : (Number(node.price) >= Number(beforeNode.price));

            if (found) break;

            node = node.prev;
        }

        if (!found) return null;

        return node;
    }

    /**
     * Inserts the given node at the start of the list,
     * and points [[head]] at the given node
     * 
     * @param node
     * The node to insert as [[head]]
     * 
     * @returns
     * 1, this operation adds 1 node
     */
    private insertNodeBeforeHead(node: OrderNode): number {
        if (!this.head) return this.insertInitialNode(node);

        node.next = this.head;
        this.head.prev = node;
        this.head = node;
        return 1;
    }

    /**
     * Inserts the first given node after the second given node
     * 
     * @param insertNode
     * The node to insert
     * 
     * @param afterNode
     * The node that [[insertNode]] should be inserted after
     * 
     * @returns 1, this operation adds 1 node
     */
    private insertNodeAfter(insertNode: OrderNode, afterNode: OrderNode): number {
        if (afterNode == this.tail) {
            this.tail.next = insertNode;
            insertNode.prev = this.tail;
            this.tail = insertNode;
        } else {
            insertNode.next = afterNode.next;
            insertNode.next.prev = insertNode;
            afterNode.next = insertNode;
            insertNode.prev = afterNode;
        }

        return 1;
    }

    /**
     * Updates the given node's amount to the given amount
     * 
     * @param node 
     * The node to update
     * 
     * @param amount 
     * The node's new amount
     * 
     * @returns
     * 0, this operation doesn't affect the total number of nodes     * 
     */
    private updateNode(node: OrderNode, amount: number): number {
        node.amount.push(amount);
        return 0;
    }

    /**
     * Finds and removes a node based on the given price
     * 
     * @param price
     * The pricepoint to remove
     * 
     * @returns
     * -1, this operation removes 1 node
     */
    public delete(price: number): number {
        if (this.length == 0) return 0;

        let node = this.tail;
        let found = false;

        while (node && !found) {
            if (node.price == price) {
                found = true;
                break;
            }

            node = node.prev;
        }

        if (!found) return 0;

        if (node == this.head) {
            this.head = this.head.next;
            this.head.prev = null;
        }
        else if (node == this.tail) {
            this.tail = this.tail.prev;
            this.tail.next = null;
        }
        else {
            node.next.prev = node.prev;
            node.prev.next = node.next;
        }

        return -1;
    }

    public clear(): void {
        this.head = null;
        this.tail = null;
        this.length = 0;
    }

    /**
     * Converts the OrderList to an array
     * 
     * @returns
     * An array of [[AggregatedOrder]]'s
     */
    public toArray(limit: number = 0): AggregatedOrder[] {
        let arr: AggregatedOrder[] = [];
        let node = this.tail;

        while (node && (limit == 0 || arr.length < limit)) {
            arr.push({
                price: node.price,
                amount: node.amount,
                time: node.time
            });

            node = node.prev;
        }

        return arr;
    }
}