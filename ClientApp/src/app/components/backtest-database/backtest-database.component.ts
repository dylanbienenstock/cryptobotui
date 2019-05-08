import { Component, OnInit } from '@angular/core';
import { ExchangeNetworkService } from 'src/app/services/exchange-network.service';

@Component({
    selector: 'app-backtest-database',
    templateUrl: './backtest-database.component.html',
    styleUrls: ['./backtest-database.component.scss']
})
export class BacktestDatabaseComponent implements OnInit {

    constructor(public exchangeNetwork: ExchangeNetworkService) { }

    public flash: boolean;

    ngOnInit() {
        setInterval(() => {
            this.flash = !this.flash;
        }, 500);
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
