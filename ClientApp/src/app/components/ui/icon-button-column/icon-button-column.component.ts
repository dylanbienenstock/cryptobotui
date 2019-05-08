import { Component, Input } from '@angular/core';
import { ButtonRowMarkup } from '../button-row/button-row.component';

@Component({
    selector: 'app-icon-button-column',
    templateUrl: './icon-button-column.component.html',
    styleUrls: ['./icon-button-column.component.scss']
})
export class IconButtonColumnComponent {

    constructor() { }

    @Input() markup: ButtonRowMarkup;
}