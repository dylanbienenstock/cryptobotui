import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { ExchangeNetworkService } from 'src/app/services/exchange-network.service';
import { MenuMarkup, MenuOptionMarkup } from '../ui/menu/menu.component';
import { MarketReference } from 'src/crypto-charts/lib/MarketReference';

@Component({
    selector: 'app-pair-list',
    templateUrl: './pair-list.component.html',
    styleUrls: ['./pair-list.component.scss']
})
export class PairListComponent implements OnInit {

    constructor(private exchangeNetwork: ExchangeNetworkService) { }

    @Output() symbolClicked = new EventEmitter<string>();
    
    public exchangeName: string;
    public quoteCurrency: string = "BTC";

    public exchangeMenu: MenuMarkup;
    public quoteCurrencyMenu: MenuMarkup;

    public marketRefs: MarketReference[] = [];
    public tickers = [];

    async ngOnInit() {
        await this.exchangeNetwork.getSnapshot();

        this.exchangeNetwork.subscribeToMarketTickers("Binance")
            .subscribe(() => this.buildExchangeMenu());

    }

    public buildExchangeMenu() {
        this.exchangeMenu = {
            options: this.exchangeNetwork.networkSnapshot.exchangeSnapshots
                .map(exchange => ({
                    text: exchange.name,
                    click: () => {
                        this.exchangeName = exchange.name;
                        this.buildQuoteCurrencyMenu();
                    }
                }))
        };

        this.exchangeMenu.options[0].click();
    }

    public buildQuoteCurrencyMenu() {
        let quoteCurrencies: string[] = [];
        let exchangeSnapshot = this.exchangeNetwork.networkSnapshot.exchangeSnapshots
            .find(exchange => exchange.name == this.exchangeName);

        for (let marketRef of exchangeSnapshot.marketRefs) {
            let quote = marketRef.symbol.split("/")[1];

            if (!quoteCurrencies.includes(quote))
                quoteCurrencies.push(quote);
        }

        this.quoteCurrencyMenu = {
            options: quoteCurrencies.map(quote => ({
                text: quote,
                click: () => {
                    this.quoteCurrency = quote;
                    this.buildPairList();
                }
            }))
        };

        this.buildPairList();
    }

    public buildPairList() {
        this.tickers = this.exchangeNetwork.networkSnapshot.exchangeSnapshots
            .find(exchange => exchange.name == this.exchangeName)
            .marketRefs
                .filter(marketRef => marketRef.symbol.split("/")[1] == this.quoteCurrency)
                .map(marketRef => {
                    return {
                        marketRef,
                        baseCurrency: marketRef.symbol.split("/")[0],
                        lastPrice: this.getLastPrice(marketRef),
                        priceChangePercentage: this.formatPercentage(marketRef),
                        isPercentageNegative: this.isPercentageNegative(marketRef),
                        isPercentageZero: this.isPercentageZero(marketRef),
                        volume: this.formatVolume(marketRef),
                        clickFn: () => {
                            this.symbolClicked.emit(marketRef.symbol);
                        }
                    };
                })
    }

    public baseCurrency(marketRef: MarketReference): string {
        return marketRef.symbol.split("/")[0];
    }

    public formatPercentage(marketRef: MarketReference): string {
        if (!this.exchangeNetwork.marketTickers[marketRef.key]) return;
        let str = this.exchangeNetwork.marketTickers[marketRef.key].priceChangePercentage;
        let num = Number(str);
        return num.toFixed(2) + "%";
    }

    public isPercentageNegative(marketRef: MarketReference): boolean {
        if (!this.exchangeNetwork.marketTickers[marketRef.key]) return;
        return this.exchangeNetwork.marketTickers[marketRef.key].priceChangePercentage[0] == "-";
    }

    public isPercentageZero(marketRef: MarketReference): boolean {
        if (!this.exchangeNetwork.marketTickers[marketRef.key]) return;
        return Number(this.exchangeNetwork.marketTickers[marketRef.key].priceChangePercentage).toFixed(2) == "0.00";
    }

    public getLastPrice(marketRef: MarketReference): string {
        if (!this.exchangeNetwork.marketTickers[marketRef.key]) return;
        return this.exchangeNetwork.marketTickers[marketRef.key].lastPrice;
    }

    public formatVolume(marketRef: MarketReference): string {
        if (!this.exchangeNetwork.marketTickers[marketRef.key]) return;

        let str = this.exchangeNetwork.marketTickers[marketRef.key].volume;
        let num = Number(str);

        if (num >= 1000000)
            return (num / 1000000).toFixed(1) + "M";

        if (num >= 1000)
            return (num / 1000).toFixed(1) + "K";

        return Math.round(num).toString();
    }
}
