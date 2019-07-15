import { Component, AfterViewInit, Input } from '@angular/core';
import { MarketReference } from 'src/app/services/signalr.types';

const precision = {
    "BTC": 8,
    "USDT": 8,
}

@Component({
    selector: 'app-price',
    templateUrl: './price.component.html',
    styleUrls: ['./price.component.scss']
})
export class PriceComponent implements AfterViewInit {

    constructor() { }

    @Input() price: string; 
    @Input() marketRef: MarketReference;

    private lastPrice: string;
    private _text: string;
    private parts;

    public get text(): string {
        if (!this.price || !this.marketRef) {
            this._text = "----------------";
            return;
        }

        if (this.price != this.lastPrice) {
            let quote = this.marketRef.symbol.split("/")[1];
    
            if (!precision[quote]) {
                this._text = this.price;
                return;
            }
    
            this._text =  this.price
                .substr(0, Math.min(this.price.length, precision[quote] + 2));
        }

        return this._text;
    }

    ngAfterViewInit() {
        if (!this.text) return;
        
        setTimeout(() => {
            this.parts = this.text.match(/^((?:0|\.)*)(.*)$/).slice(1);
        });
    }

}
