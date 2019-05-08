import { Component, Input } from '@angular/core';
import { PageRoutes } from 'src/app/app.routes';

export interface ButtonMarkup {
    page?:   string;
    text?:   string;
    icon?:   string;
    inline?: boolean;
}

@Component({
    selector: 'app-button',
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.scss']
})
export class ButtonComponent {

    constructor() { }

    @Input() markup: ButtonMarkup;

    public pageRoutes = PageRoutes;
}
