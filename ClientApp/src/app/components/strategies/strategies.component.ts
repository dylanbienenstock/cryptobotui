import { Component, AfterViewInit, ViewChildren, ElementRef, ViewChild, HostListener, HostBinding } from '@angular/core';
import { InterfaceService } from 'src/app/services/interface.service';
import { ScaleService } from 'src/app/services/scale.service';

import { Terminal } from 'xterm';

interface FileNode {
    name: string;
    root?: boolean;
    visible?: boolean;
    edited?: boolean;
    children?: FileNode[];
}

@Component({
    selector: 'app-strategies',
    templateUrl: './strategies.component.html',
    styleUrls: ['./strategies.component.scss']
})
export class StrategiesComponent implements AfterViewInit {

    constructor(private _interface: InterfaceService,
                private scale: ScaleService) { }

    @ViewChild("output", { static: false }) outputRef: ElementRef;
    public get output(): HTMLElement { return this.outputRef.nativeElement; }

    @HostBinding("style.grid-template-rows")
    public get gridRows(): string {
        return this.showOutput ? ("auto " + (256 * this.scale.current) + "px") : "auto";
    }

    @HostBinding("style.grid-template-columns")
    public get gridColumns(): string {
        return this.showFiles ? ((256 * this.scale.current) + "px auto") : "auto";
    }

    @HostBinding("style.grid-template-areas")
    public get gridAreas(): string {
        let areas: string[][] = [];

        if (this.showFiles) {
            areas.push(["files", "editor"]);

            if (this.showOutput) {
                areas.push(["files output"])
            }
        } else if (this.showOutput) {
            areas.push(["editor"]);
            areas.push(["output"]);
        } else {
            areas.push(["editor"]);
        }

        return areas.map(arr => "\"" + arr.join(" ") + "\"").join(" ");
    }

    private showFiles: boolean = true;
    private showOutput: boolean = true;
    private controlKeyDown: boolean = false;

    public editorOptions = {
        theme: "vs-dark",
        language: "javascript",
        automaticLayout: true,
        scrollBeyondLastLine: false,        
    };

    public code: string =
`export class TightHFTScalper implements OrderRouter {
    
    private activeOrders: LimitOrder[] = [];

    constructor(private orderbook: OrderBook) { }

    public onSignal(orderSide: OrderSide) {
        let price = orderSide == OrderSide.Bid ? orderbook.BestBid : orderbook.BestAsk;
        let order = this.limitOrder(price, orderSide);
        activeOrders.push(order);
    }

    public onTick() {
        for (let i = this.activeOrders.length - 1; i >= 0; i--) {
            let order = this.activeOrders[i];
            if (order.getAge() > 60000) {
                this.activeOrders.splice(i, 1);
                order.remove();
            }
        }
    }

    public onFilled(order: Order) {
        console.log("Order filled!")
    }
}`;

    public selectedFileNode;

    public untitled: FileNode = {
        name: "Untitled",
        edited: true,
        visible: true
    };
    
    public openEditorsRoot: FileNode = 
    {
        name: "Open Editors",
        root: true,
        visible: true,
        children: [ this.untitled ]
    };

    public fileRoot = 
    {
        name: "Files",
        root: true,
        visible: true,
        children: [
            {
                name: "Strategies",
                visible: true,
                children: []
            },
            {
                name: "Modules",
                visible: true,
                children: [
                    {
                        name: "Order Placement",
                        visible: true,
                        children: [this.untitled]
                    },
                    {
                        name: "Pair Selection",
                        visible: true,
                        children: []
                    },
                    {
                        name: "Signal",
                        visible: true,
                        children: []
                    }
                ]
            }
        ]
    }

    ngAfterViewInit() {
        setTimeout(() => {
            dispatchEvent(new Event("resize"));

            // let term = new Terminal();
            // term.open(this.output);
        });
    }

    @HostListener("window:keydown", ["$event.key"])
    onKeyDown(key: string) {
        if (key == "Control") this.controlKeyDown = true;
        console.log(this.controlKeyDown)
    }

    @HostListener("window:keyup", ["$event.key"])
    onKeyUp(key: string) {
        if (key == "Control") this.controlKeyDown = false;
        if (this.controlKeyDown && key == "`") this.showOutput = !this.showOutput;
        if (this.controlKeyDown && key == "b") this.showFiles = !this.showFiles;
    }

    public onClickFileNode(fileNode) {
        this.selectedFileNode = fileNode;
        fileNode.visible = !fileNode.visible;
    }
}
