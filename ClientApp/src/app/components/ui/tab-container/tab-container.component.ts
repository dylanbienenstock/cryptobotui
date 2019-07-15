import { Component, OnInit, ContentChildren, QueryList, AfterContentInit, Input, HostBinding, Output, EventEmitter } from '@angular/core';
import { TabViewComponent } from '../tab-view/tab-view.component';

@Component({
    selector: 'app-tab-container',
    templateUrl: './tab-container.component.html',
    styleUrls: ['./tab-container.component.scss']
})
export class TabContainerComponent implements AfterContentInit {

    constructor() { }

    @Output() public tabClicked = new EventEmitter<TabViewComponent>();

    @ContentChildren(TabViewComponent)
    public views: QueryList<TabViewComponent>;

    @Input()
    @HostBinding("class.vertical")
    public vertical: boolean = false;

    ngAfterContentInit() {
        setTimeout(() => this.views.first.visible = true);
    }

    public onTabClicked(view: TabViewComponent) {
        this.views.forEach(v => v.visible = false);
        view.visible = true;
        this.tabClicked.emit(view);
    }
}
