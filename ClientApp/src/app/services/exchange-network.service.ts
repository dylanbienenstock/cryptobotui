import { Injectable, EventEmitter } from '@angular/core';
import { SignalRService } from './signalr.service';
import { BacktestDataCompletion, ExchangeNetworkSnapshot, MarketTicker } from './exchange-network.types';
import { HubResponse, MarketReference } from './signalr.types';
import { Observable, Subject } from 'rxjs';

const alphabetically = (a, b): number => {
    if (a.symbol > b.symbol) return 1;
    if (a.symbol < b.symbol) return -1;
};

@Injectable({
    providedIn: 'root'
})
export class ExchangeNetworkService {

    constructor(private signalR: SignalRService) { }
    
    public networkSnapshot: ExchangeNetworkSnapshot;
    public networkSnapshotReceived = new EventEmitter<void>();
    public marketTickers: { [marketRefKey: string]: MarketTicker } = {};

    private waiting: boolean = false;

    public get symbolCount(): number {
        return this.networkSnapshot.exchangeSnapshots
            .map(e => e.marketRefs.map(m => m.symbol))
            .reduce((accum, val) => [...accum, ...val])
            .length;
    }

    public backtestDataCompletion: { [marketRefKey: string]: BacktestDataCompletion } = { };
    public backtestDataCompletionReceived = new EventEmitter<BacktestDataCompletion>();
    public backtestDataCompletionEmpty: boolean = true;

    public async getSnapshot(): Promise<void> {
        if (this.networkSnapshot || this.waiting) return;
        
        this.waiting = true;

        await this.signalR.connected;

        let response = await this.signalR
            .invoke<ExchangeNetworkSnapshot>("GetExchangeNetworkSnapshot");

        if (!response.success)
            return console.error(response);

        response.data.exchangeSnapshots = response.data.exchangeSnapshots
            .map((exchangeSnapshot) => ({
                ...exchangeSnapshot,
                symbols: exchangeSnapshot.marketRefs
                    .sort(alphabetically)
            }));

        this.networkSnapshot = response.data;
        this.networkSnapshotReceived.emit();
    }

    public streamBacktestDataCompletion(force: boolean = false): void {
        if (!force && !this.backtestDataCompletionEmpty) {
            let i = 0;
            let vals = Object.values(this.backtestDataCompletion)
            let next = () => {
                this.onBacktestDataCompletionReceived(vals[i++]);
                if (i < vals.length) setTimeout(next, 25);
            };

            setTimeout(next);
            return;
        }

        this.backtestDataCompletionEmpty = false;

        this.signalR.stream<BacktestDataCompletion>("StreamBacktestDataCompletion")
            .subscribe({
                next:  (val) => this.onBacktestDataCompletionReceived(val),
                error: (err) => console.error(err),
                complete: null
            });
    }

    public isCollectingBacktestData(exchangeName: string, symbol: string): boolean
    {
        let marketRef = new MarketReference(exchangeName, symbol);
        return this.backtestDataCompletion[marketRef.key].collecting;
    }

    public startCollectingBacktestData(exchangeName: string, symbol: string): void {
        let marketRef = new MarketReference(exchangeName, symbol);

        this.onBacktestDataCollectionStarted(marketRef);

        this.signalR.stream<BacktestDataCompletion>("StartCollectingBacktestData", marketRef)
            .subscribe({
                next:  (val) => this.onBacktestDataCompletionReceived(val),
                error: (err) => console.error(err),
                complete: () => this.onBacktestDataCollectionStopped(marketRef)
            });
    }

    public async stopCollectingBacktestData(exchangeName: string, symbol: string): Promise<void> {
        let marketRef = new MarketReference(exchangeName, symbol);
        let response = await this.signalR
            .invoke<HubResponse<void>>("StopCollectingBacktestData", marketRef);

        if (!response.success)
            return console.error(response);

        this.onBacktestDataCollectionStopped(marketRef);
    }

    private onBacktestDataCompletionReceived(completion: BacktestDataCompletion): void {
        this.backtestDataCompletion[completion.marketRef.key] = completion;
        this.backtestDataCompletionReceived.emit(completion);
    }

    private onBacktestDataCollectionStarted(marketRef: MarketReference): void {
        console.log("onBacktestDataCollectionStarted", marketRef);
        this.backtestDataCompletion[marketRef.key].collecting = true;
    }
    
    private onBacktestDataCollectionStopped(marketRef: MarketReference): void {
        console.log("onBacktestDataCollectionStopped", marketRef);
        this.backtestDataCompletion[marketRef.key].collecting = false;
    }

    public subscribeToMarketTickers(exchangeName: string): Observable<void> {
        var subject = new Subject<void>();

        this.signalR.stream<MarketTicker[]>("SubscribeToMarketTickers", exchangeName)
            .subscribe({
                next:  (val) => {
                    this.onMarketTickersReceived(val);
                    subject.next();
                },
                error: (err) => console.error(err),
                complete: () => console.log("done")
            });

        return subject;
    }

    public onMarketTickersReceived(marketTickers: MarketTicker[]) {
        for (let marketTicker of marketTickers)
            this.marketTickers[marketTicker.marketRef.key] = marketTicker;
    }
}
