import { Component, Input, HostBinding, Output, EventEmitter, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { PageRoutes } from 'src/app/app.routes';
import { MenuMarkup, MenuComponent } from '../menu/menu.component';

export interface ButtonMarkup {
    page?:   string;
    text?:   string;
    icon?:   string;
    inline?: boolean;
    menu?:   MenuMarkup;
    click?:  () => void
}

@Component({
    selector: 'app-button',
    templateUrl: './button.component.html',
    styleUrls: ['./button.component.scss']
})
export class ButtonComponent implements AfterViewInit {
    constructor() { }

    @Input() markup: ButtonMarkup;
    @Output() click = new EventEmitter<void>();

    @HostBinding("class.inline")
    get inline(): boolean {
        return this.markup.inline;
    }

    @HostBinding("style.width.px")
    public width: number;

    @ViewChild("menu") menuRef: ElementRef;
    public get menu(): HTMLElement {
        return this.menuRef.nativeElement;
    }

    public ready: boolean = false;
    public menuVisible: boolean = false;
    public pageRoutes = PageRoutes;

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.ready = true;
        });
    }

    public onClick() {
        this.menuVisible = !this.menuVisible;
        this.click.emit();

        if (this.markup.click)
            this.markup.click();
    }

    public onMenuWidth(width: number) {
        this.width = width;
    }

    public onMenuClosed() {
        this.menuVisible = false;
    }
}
