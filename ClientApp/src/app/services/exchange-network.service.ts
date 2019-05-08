import { Injectable, EventEmitter } from '@angular/core';
import { SignalRService } from './signalr.service';
import { BacktestDataCompletion, ExchangeNetworkSnapshot } from './exchange-network.types';
import { HubResponse, MarketReference } from './signalr.types';
import { Observable, Subscription, interval } from 'rxjs';
import { delayWhen } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class ExchangeNetworkService {

    constructor(private signalR: SignalRService) {
        
        this.backtestDataCompletionReceived = 
            new EventEmitter<BacktestDataCompletion>();

        this.backtestDataCompletionReceivedSub =
            this.backtestDataCompletionReceived
                .pipe(delayWhen(_ => interval(this.backtestDataCompletionDelay)))
                .subscribe(val => this.onBacktestDataCompletionReceived(val));
    }
    
    public networkSnapshot: ExchangeNetworkSnapshot;
    public get symbolCount(): number {
        return this.networkSnapshot.exchangeSnapshots
            .map(e => e.marketRefs.map(m => m.symbol))
            .reduce((accum, val) => [ ...accum, ...val ])
            .length;
    }

    public collectingBacktestData: { [marketRefKey: string]: boolean } = { };
    public backtestDataCompletion: { [marketRefKey: string]: BacktestDataCompletion } = { };

    private backtestDataCompletionReceived:    EventEmitter<BacktestDataCompletion>;
    private backtestDataCompletionReceivedSub: Subscription;

    private backtestDataCompletionCount: number;
    private get backtestDataCompletionDelay(): number {
        ++this.backtestDataCompletionCount < this.symbolCount
            ? (this.backtestDataCompletionCount % 5 == 0
                ? 2000
                : 500)
            : 0;

        return 2;
    }

    public async getSnapshot(): Promise<void> {
        if (this.networkSnapshot) return;

        let response = await this.signalR
            .invoke<ExchangeNetworkSnapshot>("GetExchangeNetworkSnapshot");

        if (!response.success)
            return console.error(response);

        response.data.exchangeSnapshots = response.data.exchangeSnapshots
            .map((exchangeSnapshot) => ({
                ...exchangeSnapshot,
                symbols: exchangeSnapshot.marketRefs
                    .sort((a, b) => {
                        if (a.symbol > b.symbol) return 1;
                        if (a.symbol < b.symbol) return -1;
                    })
            }));

        this.networkSnapshot = response.data;
    }

    public async streamBacktestDataCompletion(): Promise<void> {
        this.signalR.stream<BacktestDataCompletion>("StreamBacktestDataCompletion")
            .subscribe({
                next:  (val) => this.backtestDataCompletionReceived.emit(val),
                error: (err) => console.error(err),
                complete: null
            });
    }

    public isCollectingBacktestData(exchangeName: string, symbol: string): boolean
    {
        let marketRef = new MarketReference(exchangeName, symbol);
        return this.collectingBacktestData[marketRef.key];
    }

    public startCollectingBacktestData(exchangeName: string, symbol: string): void {
        let marketRef = new MarketReference(exchangeName, symbol);

        console.log("START COLLECTING: ", marketRef);

        this.onBacktestDataCollectionStarted(marketRef);

        this.signalR.stream<BacktestDataCompletion>("StartCollectingBacktestData", marketRef)
            .subscribe({
                next:  (val) => this.backtestDataCompletionReceived.emit(val),
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

        console.log("STOP COLLECTING: ", marketRef);
    }

    private onBacktestDataCompletionReceived(completion: BacktestDataCompletion): void {
        this.backtestDataCompletion[completion.marketRef.key] = completion;
        this.backtestDataCompletion = { ...this.backtestDataCompletion };
    }

    private onBacktestDataCollectionStarted(marketRef: MarketReference): void {
        this.collectingBacktestData[marketRef.key] = true;
    }
    
    private onBacktestDataCollectionStopped(marketRef: MarketReference): void {
        this.collectingBacktestData[marketRef.key] = false;
    }
}
