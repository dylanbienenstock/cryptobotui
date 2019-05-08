import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class InterfaceService {

    constructor() {
        setInterval(() => {
            this.flash = !this.flash;
        }, 500);
    }

    public flash: boolean = false;
}
