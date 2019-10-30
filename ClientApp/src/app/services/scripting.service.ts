import { Injectable } from '@angular/core';
import { SignalRService } from './signalr.service';

@Injectable({
    providedIn: 'root'
})
export class ScriptingService {

    constructor(private signalR: SignalRService) {
        (<any>window).executeScript = (script: string) => this.execute(script);
    }

    public async execute(fileName: string): Promise<string> {
        await this.signalR.connected;

        let res = await this.signalR.invoke<string>("ExecuteScript", fileName);
        if (!res.success) throw Error(res.error);

        return res.data;
    }
}
