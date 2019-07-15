import { Injectable, EventEmitter, NgZone } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel, IStreamResult, TransferFormat, DefaultHttpClient, HttpTransportType } from "@aspnet/signalr";
import { MessagePackHubProtocol } from "@aspnet/signalr-protocol-msgpack";
import { HubResponse } from './signalr.types';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SignalRService {

    constructor(private zone: NgZone) { }

    public get state(): HubConnectionState {
        return this.connection.state;
    }

    public get connected(): Promise<void> {
        if (this.connection.state == HubConnectionState.Connected)
            return new Promise<void>(resolve => resolve());

        return new Promise<void>(resolve => {
            this.connectedPromiseResolvers.push(resolve);
        });
    }

    private connection: HubConnection;
    private connectedPromiseResolvers: (() => void)[] = [];

    public async connect(): Promise<void> {
        var protocol = new MessagePackHubProtocol();

        this.connection = new HubConnectionBuilder()
            // .withHubProtocol(protocol)
            .configureLogging(LogLevel.Information)
            .withUrl("hub", HttpTransportType.LongPolling)
            .build();

        await this.connection
            .start()
            .then(() => {
                console.log("Connected to SignalR");
                this.connectedPromiseResolvers.forEach(resolve => resolve());
                this.connectedPromiseResolvers.length = 0;
            })
            .catch((err) => { throw err; });
    }

    public on<T>(methodName: string): Observable<T> {
        return this.zone.runOutsideAngular(() => {
            return new Observable<T>((subscriber) => {
                let callback = (val: T) => subscriber.next(val);
                this.connection.on(methodName, callback);
                return this.connection.off.bind(this, [methodName, callback]);
            });
        });
    }

    public send(methodName: string, request?: any): void {
        this.zone.runOutsideAngular(() => {
            if (request) this.connection.send(methodName, request);
            else         this.connection.send(methodName);
        });
    }

    public invoke<T>(methodName: string, request?: any): Promise<HubResponse<T>> {
        return this.zone.runOutsideAngular(() => {
            if (request) return this.connection.invoke<HubResponse<T>>(methodName, request);
            else         return this.connection.invoke<HubResponse<T>>(methodName);
        });
    }

    public stream<T>(methodName: string, request?: any): IStreamResult<T> {
        return this.zone.runOutsideAngular(() => {
            if (request) return this.connection.stream<T>(methodName, request);
            else         return this.connection.stream<T>(methodName);
        });
    }

}
