import { Component, OnInit, Input, HostListener, HostBinding } from '@angular/core';
import { Indicator } from '../lib/Indicator';
import { SharedState } from '../crypto-chart/crypto-chart.component';
import { timingSafeEqual } from 'crypto';

@Component({
    selector: 'crypto-multi-chart',
    templateUrl: './crypto-multi-chart.component.html',
    styleUrls: ['./crypto-multi-chart.component.scss']
})
export class CryptoMultiChartComponent implements OnInit {

    constructor() { }

    @Input() charts: Indicator[][];
    
    public state: SharedState = {
        offsetX: 0,
        scaleX: 1,
        hovered: false,
        changed: false,
        mouseDown: false,
        reset: false
    };

    ngOnInit() {
    }

    public onStateChanged(state: SharedState) {
        this.state = { ...state };
    }

    @HostListener("mouseenter")
    public onMouseEnter() {
        this.state = {
            ...this.state,
            hovered: true,
            changed: true
        };
    }

    @HostListener("mouseleave")
    public onMouseLeave() {
        this.state = {
            ...this.state,
            hovered: false,
            changed: true
        };
    }

    @HostListener("mousedown")
    public onMouseDown() {
        this.state.mouseDown = true;
    }

    @HostListener("window:mouseup")
    public onMouseUp() {
        this.state.mouseDown = false;
    }

    // @HostListener("window:keydown", ["$event.key"])
    // public onKeyDown(key: string): void {
    //     switch (key) {
    //         case "ArrowLeft":  this.state.keyboard.left  = true; break;
    //         case "ArrowRight": this.state.keyboard.right = true; break;
    //         case "ArrowUp":    this.state.keyboard.up    = true; break;
    //         case "ArrowDown":  this.state.keyboard.down  = true; break;
    //         case "Shift":      this.state.keyboard.shift = true; break;
    //     }
    // }

    // @HostListener("window:keyup", ["$event.key"])
    // public onKeyUp(key: string): void {
    //     switch (key) {
    //         case "ArrowLeft":  this.state.keyboard.left  = false; break;
    //         case "ArrowRight": this.state.keyboard.right = false; break;
    //         case "ArrowUp":    this.state.keyboard.up    = false; break;
    //         case "ArrowDown":  this.state.keyboard.down  = false; break;
    //         case "Shift":      this.state.keyboard.shift = false; break;
    //     }
    // }

    // @HostListener("window:blur")
    // public onBlur() {
    //     this.state.keyboard.left  = false;
    //     this.state.keyboard.right = false;
    //     this.state.keyboard.up    = false;
    //     this.state.keyboard.down  = false;
    //     this.state.keyboard.shift = false;
    // }
}
