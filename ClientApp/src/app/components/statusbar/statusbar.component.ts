import { Component, OnInit } from '@angular/core';
import { SignalRService } from 'src/app/services/signalr.service';
import { HubConnectionState } from '@aspnet/signalr';

@Component({
    selector: 'app-statusbar',
    templateUrl: './statusbar.component.html',
    styleUrls: ['./statusbar.component.scss']
})
export class StatusbarComponent {

    constructor(private signalR: SignalRService) { }

    public get connected(): boolean {
        return this.signalR && this.signalR.state == HubConnectionState.Connected;
    }
}
