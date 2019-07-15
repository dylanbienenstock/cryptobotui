import { Component, Input, HostBinding } from '@angular/core';

@Component({
    selector: 'app-tab-view',
    templateUrl: './tab-view.component.html',
    styleUrls: ['./tab-view.component.scss']
})
export class TabViewComponent {

    constructor() { }

    @Input() public tab: string;
    
    @HostBinding("class.visible")
    public visible: boolean = false;

    ngOnInit() {
    }

}
