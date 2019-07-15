import { Component, HostListener, OnInit, ElementRef } from '@angular/core';
import { SignalRService } from './services/signalr.service';
import { ExchangeNetworkService } from './services/exchange-network.service';
import { InterfaceService } from './services/interface.service';
import { ScaleService } from './services/scale.service';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
    title = 'app';

    constructor(
        private hostRef: ElementRef,
        private scale: ScaleService,
        private signalR: SignalRService,
        private exchangeNetwork: ExchangeNetworkService,
        private _interface: InterfaceService
    ) { }
    
    private get host(): HTMLElement {
        return this.hostRef.nativeElement;
    }

    async ngOnInit() {
        this.scale.changed
            .subscribe(scale => this.host.style.setProperty("--scale", scale.toString()))

        this.scale.setScale(1);

        await this.signalR.connect();
        await this.exchangeNetwork.getSnapshot();
    }

    @HostListener("window:dragstart", ["$event"])
    public preventDrag(e: DragEvent)
    {
        e.stopPropagation();
        e.preventDefault();
        return false;
    }

    @HostListener("window:load")
    onWindowLoad() {
        setTimeout(() => {
            this._interface.ready = true;
        });
    }
}
