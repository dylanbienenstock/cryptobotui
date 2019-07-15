import { Component, OnInit, Input, AfterViewInit, ElementRef } from '@angular/core';
import { InterfaceService } from 'src/app/services/interface.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-progress-bar',
    templateUrl: './progress-bar.component.html',
    styleUrls: ['./progress-bar.component.scss']
})
export class ProgressBarComponent implements AfterViewInit {

    constructor(
        public hostRef: ElementRef,
        public _interface: InterfaceService
    ) { }

    @Input() empty: boolean;
    @Input() working: boolean;
    @Input() progress: number;

    private _loading: boolean = true;
    get loading(): boolean { return this._loading; }
    @Input() set loading(val: boolean) {
        this._loading = val;

        if (!val) setTimeout(() => {
            this.animate = false;
        }, 400);
    }

    private get hostElement(): HTMLElement {
        return this.hostRef.nativeElement;
    }

    public visible: boolean = false;
    public animate: boolean = true;
    private intersectionSub: Subscription;

    ngAfterViewInit() {
        setTimeout(() => {
            this.intersectionSub = this._interface
                .observeIntersection(this.hostElement)
                    .subscribe((entry) => {
                        this.visible = entry.intersectionRatio >= 0.1;
                    });
        });
    }
}
