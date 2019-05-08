import { Component, HostListener, OnInit } from '@angular/core';
import { SignalRService } from './services/signalr.service';
import { HubConnectionState } from '@aspnet/signalr';
import { ExchangeNetworkService } from './services/exchange-network.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    title = 'app';

    constructor(
        private signalR: SignalRService,
        private exchangeNetwork: ExchangeNetworkService
    ) { }
    
    async ngOnInit() {
        await this.signalR.connect();
        await this.exchangeNetwork.getSnapshot();
        this.exchangeNetwork.streamBacktestDataCompletion();
    }

    @HostListener("window:dragstart", ["$event"])
    public preventDrag(e: DragEvent)
    {
        e.stopPropagation();
        e.preventDefault();
        return false;
    }
}
