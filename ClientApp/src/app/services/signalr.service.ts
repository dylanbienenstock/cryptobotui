import { Injectable, EventEmitter } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel, IStreamResult, TransferFormat } from "@aspnet/signalr";
import { MessagePackHubProtocol } from "@aspnet/signalr-protocol-msgpack";
import { HubResponse } from './signalr.types';

@Injectable({
    providedIn: 'root'
})
export class SignalRService {

    constructor() { }

    public get state(): HubConnectionState {
        return this.connection.state;
    }

    private connection: HubConnection;

    public async connect(): Promise<void> {
        var protocol = new MessagePackHubProtocol();

        this.connection = new HubConnectionBuilder()
            .withHubProtocol(protocol)
            .configureLogging(LogLevel.Debug)
            .withUrl("hub")
            .build();

        await this.connection
            .start()
            .then(() => console.log("Connected to SignalR"))
            .catch((err) => { throw err; });
    }

    public invoke<T>(methodName: string, request?: any): Promise<HubResponse<T>> {
        if (request) return this.connection.invoke<HubResponse<T>>(methodName, request);
        else         return this.connection.invoke<HubResponse<T>>(methodName);
    }

    public stream<T>(methodName: string, request?: any): IStreamResult<T> {
        if (request) return this.connection.stream<T>(methodName, request);
        else         return this.connection.stream<T>(methodName);
    }

    public send(methodName: string, request: any): void {
        this.connection.send(methodName, request);
    }
}
