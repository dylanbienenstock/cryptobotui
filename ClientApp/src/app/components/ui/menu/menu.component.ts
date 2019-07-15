import { Component, Input, Output, EventEmitter, AfterViewInit, ElementRef, HostListener, HostBinding } from '@angular/core';

export interface MenuOptionMarkup {
    text: string;
    click: () => void;
}

export interface MenuMarkup {
    options: MenuOptionMarkup[];
}

@Component({
    selector: 'app-menu',
    templateUrl: './menu.component.html',
    styleUrls: ['./menu.component.scss']
})
export class MenuComponent implements AfterViewInit {

    constructor(private hostRef: ElementRef) { }

    private get host(): HTMLElement {
        return this.hostRef.nativeElement;
    }

    @Input() markup: MenuMarkup;
    @Output() width = new EventEmitter<number>();
    @Output() close = new EventEmitter<void>();

    @HostBinding("style.visibility")
    public visibility: string = "hidden";

    ngAfterViewInit() {
        setTimeout(() => {
            this.width.emit(this.host.clientWidth);

            window.addEventListener("click", () => {
                setTimeout(() => this.close.emit());
            }, true);

            this.visibility = "visible";
        });
    }

    public onOptionClicked(option: MenuOptionMarkup) {
        if (option.click)
            option.click();
    }

}
