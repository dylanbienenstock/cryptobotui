import { Component, Input, ElementRef, HostListener, OnInit, OnDestroy, Output, EventEmitter, HostBinding } from '@angular/core';
import { ExchangeSnapshot, BacktestDataCompletion } from 'src/app/services/exchange-network.types';
import { ExchangeNetworkService } from 'src/app/services/exchange-network.service';
import { InterfaceService } from 'src/app/services/interface.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-backtest-database-grid',
    templateUrl: './backtest-database-grid.component.html',
    styleUrls: ['./backtest-database-grid.component.scss']
})
export class BacktestDatabaseGridComponent implements OnInit, OnDestroy {
    constructor(
        public exchangeNetwork: ExchangeNetworkService,
        public _interface: InterfaceService,
        public hostRef: ElementRef
    ) {
        this.backtestDataCompletionReceivedSub = 
        this.exchangeNetwork.backtestDataCompletionReceived
            .subscribe(val => this.onBacktestDataCompletionReceived(val));

        if (this._interface.ready) 
            setTimeout(() => this.exchangeNetwork.streamBacktestDataCompletion());
    }

    public get host(): HTMLElement {
        return this.hostRef.nativeElement;
    }

    public backtestDataCompletion: { [marketRefKey: string]: BacktestDataCompletion } = { };
    private backtestDataCompletionReceivedSub: Subscription;

    // * Interface properties
    public itemsPerPage     = 0;
    public rowsPerPage      = 7; // ! This must match $rows in SCSS
    public containerPadding = 16;
    public parentPadding    = 64;
    public barWidth         = 250;
    public barHeight        = 48 + this.containerPadding;

    @Input() page: number = 0;
    @Input() exchangeSnapshot: ExchangeSnapshot;
    @Output() pageCountChanged = new EventEmitter<number>();

    @HostListener("window:load")
    onWindowLoad() {
        setTimeout(() => this.exchangeNetwork.streamBacktestDataCompletion());
    }

    @HostListener("window:resize")
    onWindowResize() {
        this.itemsPerPage = this.getItemsPerPage();
        this.pageCountChanged.emit(this.getPageCount());
    }

    ngOnInit(): void {
        this.onWindowResize();
    }

    ngOnDestroy(): void {
        if (this.backtestDataCompletionReceivedSub)
            this.backtestDataCompletionReceivedSub.unsubscribe();
    }

    private getContainerHeight(): number {
        return this.barHeight * this.rowsPerPage;
    }

    private getItemsPerPage(): number {
        let containerWidth = this.host.clientWidth
            - this.containerPadding;
        let barWidth = this.barWidth + this.containerPadding;
        let columns = Math.floor(containerWidth / barWidth);

        return columns * this.rowsPerPage;
    }

    private getPageCount(): number {
        if (!this.exchangeSnapshot) return 0;

        let marketCount = this.exchangeSnapshot.marketRefs.length;

        return Math.ceil(marketCount / this.itemsPerPage);
    }

    private onBacktestDataCompletionReceived(val: BacktestDataCompletion): void {
        this.backtestDataCompletion[val.marketRef.key] = val;
    }

    public isCollecting(exchangeName: string, symbol: string): boolean {
        return this.exchangeNetwork.isCollectingBacktestData(exchangeName, symbol);
    }

    public async toggleCollecting(exchangeName: string, symbol: string): Promise<void>
    {
        if (!this.exchangeNetwork.isCollectingBacktestData(exchangeName, symbol))
            return this.exchangeNetwork
                .startCollectingBacktestData(exchangeName, symbol);

        return await this.exchangeNetwork
            .stopCollectingBacktestData(exchangeName, symbol);
    }

}
