import { Injectable, EventEmitter } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ScaleService {

    constructor() {
        (window as any).setScale = scale => this.setScale(scale);
    }

    public changed = new EventEmitter<number>();
    public current: number = 1;

    public setScale(scale: number): void {
        this.current = scale;
        this.changed.emit(scale);
        window.dispatchEvent(new Event("resize"));
    }
}
