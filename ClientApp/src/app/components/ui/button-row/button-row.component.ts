import { Component, OnInit, Input } from '@angular/core';
import { ButtonMarkup } from '../button/button.component';

export interface ButtonRowMarkup {
    inline?: boolean;
    buttons: ButtonMarkup[];
}

@Component({
    selector: 'app-button-row',
    templateUrl: './button-row.component.html',
    styleUrls: ['./button-row.component.scss']
})
export class ButtonRowComponent {

    constructor() { }

    @Input() markup: ButtonRowMarkup;
}
