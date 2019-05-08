import { Component, Input, AfterViewInit } from '@angular/core';

@Component({
    selector: 'app-pair',
    templateUrl: './pair.component.html',
    styleUrls: ['./pair.component.scss']
})
export class PairComponent {

    constructor() { }

    @Input() set symbol(val: string) {
        [this.base, this.quote] = val.split("/");
    }

    public base: string;
    public quote: string;

}
