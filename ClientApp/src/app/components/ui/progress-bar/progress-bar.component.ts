import { Component, OnInit, Input } from '@angular/core';
import { InterfaceService } from 'src/app/services/interface.service';

@Component({
    selector: 'app-progress-bar',
    templateUrl: './progress-bar.component.html',
    styleUrls: ['./progress-bar.component.scss']
})
export class ProgressBarComponent {

    constructor(public _interface: InterfaceService) { }

    @Input() empty: boolean;
    @Input() loading: boolean;
    @Input() working: boolean;
    @Input() progress: number;
}
