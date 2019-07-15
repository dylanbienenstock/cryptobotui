import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
    selector: 'app-page-controls',
    templateUrl: './page-controls.component.html',
    styleUrls: ['./page-controls.component.scss']
})
export class PageControlsComponent {

    constructor() { }

    private _pageCount: number = 1;
    public get pageCount(): number { return this._pageCount; }
    @Input() public set pageCount(val: number) {
        this.onPageCountChanged(val);
        this._pageCount = val;
    }

    @Output() pageChanged = new EventEmitter<number>();
    
    public page: number = 0;

    private mod(a, b): number {
        // JS's mod is broken.
        return ((a % b) + b) % b;
    }

    public onPageChanged(change: number) {
        this.page += change;
        this.page = this.mod(this.page, this.pageCount);
        this.pageChanged.emit(this.page);
    }

    public onPageCountChanged(nextVal: number) {
        if (this.pageCount == nextVal) return;

        this.page *= Math.floor(this.pageCount / nextVal);
    }
}
