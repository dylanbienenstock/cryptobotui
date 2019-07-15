import { Component, OnInit, ViewChildren, QueryList, ElementRef } from '@angular/core';
import { ExchangeNetworkService } from 'src/app/services/exchange-network.service';
import { ProgressBarComponent } from '../ui/progress-bar/progress-bar.component';
import { Subscription } from 'rxjs';
import { InterfaceService } from 'src/app/services/interface.service';

@Component({
    selector: 'app-backtest-database',
    templateUrl: './backtest-database.component.html',
    styleUrls: ['./backtest-database.component.scss']
})
export class BacktestDatabaseComponent {

    constructor(public exchangeNetwork: ExchangeNetworkService) { }

    public page: number = 0;
    public pageCount: number = 0;

    public onPageChanged(page: number) {
        this.page = page;
    }

    public onPageCountChanged(pageCount: number) {
        this.pageCount = pageCount;
    }
}
