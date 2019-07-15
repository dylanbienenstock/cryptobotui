import { Component, OnInit, ElementRef, ViewChild, HostListener, OnDestroy, Input } from '@angular/core';
import { OrderbookService } from 'src/app/services/orderbook.service';
import { SignalRService } from 'src/app/services/signalr.service';
import { Order, OrderSide } from 'src/crypto-charts/lib/types';
import { ScaleService } from 'src/app/services/scale.service';
import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { MarketReference } from 'src/app/services/signalr.types';

@Component({
    selector: 'app-orderbook',
    templateUrl: './orderbook.component.html',
    styleUrls: ['./orderbook.component.scss']
})
export class OrderbookComponent implements OnInit, OnDestroy {

    constructor(
        private hostRef: ElementRef,
        private scale: ScaleService,
        private signalR: SignalRService,
        public orderbook: OrderbookService
    ) { }

    private get host(): HTMLElement {
        return this.hostRef.nativeElement;
    }

    @Input() set marketRef(val: MarketReference) {
        this.orderbook.setMarketRef(val.exchangeName, val.symbol);
    }

    @ViewChild("container") containerRef: ElementRef;
    private get container(): HTMLElement {
        return this.containerRef.nativeElement;
    }

    public itemHeight: number;
    public listHeight: number;
    public totalHeight: number;
    
    public scroll: number = 0;
    public autoScroll: boolean = true;
    public scrollReady: boolean = false;

    private resetScroll: Subject<void> = new Subject<void>();
    private resetScrollSub: Subscription;
    private scaleSub: Subscription;

    private get scrollMiddle(): number {
        return this.host.clientHeight / 2 - this.totalHeight / 2;
    }

    async ngOnInit() {
        this.setScale(this.scale.current);
        this.scroll = this.scrollMiddle;
        setTimeout(() => this.scrollReady = true);

        this.resetScrollSub = this.resetScroll
            .pipe(debounceTime(2000))
            .subscribe(() => this.onResetScroll())

        this.scaleSub = this.scale.changed
            .subscribe(scale => this.setScale(scale));
    }

    ngOnDestroy() {
        if (this.resetScrollSub)
            this.resetScrollSub.unsubscribe();

        if (this.scaleSub)
            this.scaleSub.unsubscribe();
    }

    private setScale(scale: number): void {
        this.itemHeight = 28 * scale;
        this.listHeight = this.itemHeight * this.orderbook.limit;
        this.totalHeight = this.listHeight * 2 + this.itemHeight;
        this.scroll = this.scrollMiddle;
    }

    public onResetScroll(): void {
        this.scroll = this.scrollMiddle;
        this.autoScroll = true;
    }

    @HostListener("window:resize")
    public onResize(): void {
        this.resetScroll.next();
    }

    @HostListener("mousewheel", ["$event"])
    public onScroll(e: MouseWheelEvent) {
        this.scroll -= e.deltaY;
        let minScroll = -this.listHeight;
        let maxScroll = this.host.clientHeight - this.listHeight - this.itemHeight;

        this.scroll = Math.min(Math.max(this.scroll, minScroll), maxScroll);
        this.autoScroll = false;
        this.resetScroll.next();
    }

    public wallSize(order: Order, side: OrderSide) {
        let depth = side == OrderSide.Bid 
            ? this.orderbook.bidDepth
            : this.orderbook.askDepth;
        let ratio = order.amount / depth;
        let easeOutQuint = t => 1+(--t)*t*t*t*t;
        return easeOutQuint(ratio) * 100;
    }

    public trackByFn(index: number, item: Order) {
        if (!item) return null;
        return item.price.valueOf();
    }
}
