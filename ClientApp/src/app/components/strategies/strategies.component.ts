import { Component, AfterViewInit, ViewChildren, ElementRef, ViewChild, HostListener, HostBinding, OnDestroy, ViewEncapsulation } from '@angular/core';
import { InterfaceService } from 'src/app/services/interface.service';
import { ScaleService } from 'src/app/services/scale.service';

import { Subscription, Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { SignalRService } from 'src/app/services/signalr.service';
import { FileNode, DirectoryNode, StrategyService, Problem } from 'src/app/services/strategy.service';
import { ConsoleComponent } from '../console/console.component';
import { ScriptingService } from 'src/app/services/scripting.service';

@Component({
    selector: 'app-strategies',
    templateUrl: './strategies.component.html',
    styleUrls: ['./strategies.component.scss']
})
export class StrategiesComponent implements AfterViewInit, OnDestroy {

    constructor(private _interface: InterfaceService,
                private scale: ScaleService,
                private signalR: SignalRService,
                public strategies: StrategyService,
                private scripting: ScriptingService) { }

    @ViewChild("output", { static: false }) outputRef: ElementRef;
    public get output(): HTMLElement { return this.outputRef.nativeElement; }

    @ViewChild("renameInput", { static: false }) renameInputRef: ElementRef;
    public get renameInput(): HTMLElement { return this.renameInputRef.nativeElement; }

    @ViewChild(ConsoleComponent, { static: false }) terminal: ConsoleComponent;

    @HostBinding("style.grid-template-rows")
    public get gridRows(): string {
        if (this.outputHeight < 32) {
            this.outputHeight = 288;
            this.showOutput = false;
            this.draggingResizeHandle = null;
        }
        this.outputHeight = Math.min(this.outputHeight, this.windowHeight - 128);
        return this.showOutput ? ("auto " + (this.outputHeight * this.scale.current) + "px") : "auto";
    }

    @HostBinding("style.grid-template-columns")
    public get gridColumns(): string {
        return this.showFiles ? ((this.filesWidth * this.scale.current) + "px auto") : "auto";
    }

    @HostBinding("style.grid-template-areas")
    public get gridAreas(): string {
        let areas: string[][] = [];

        if (this.showFiles) {
            areas.push(["files", "editor"]);

            if (this.showOutput)
                areas.push(["files output"])
        } else if (this.showOutput) {
            areas.push(["editor"]);
            areas.push(["output"]);
        } else {
            areas.push(["editor"]);
        }

        return areas.map(arr => "\"" + arr.join(" ") + "\"").join(" ");
    }

    @HostBinding("style.cursor")
    public get cursorStyle(): string {
        return this.draggingResizeHandle ? (
            this.draggingResizeHandle == "file-list"
                ? "ew-resize" : "ns-resize"
        ) : null;
    }


    public deleteFilePromiseResolver: (shouldDelete: boolean) => void;

    private showFiles: boolean = true;
    private showOutput: boolean = true;
    private controlKeyDown: boolean = false;
    private renamingSelectedNode: boolean = false;
    private oldFileName: string;
    private creatingNewFile: boolean = false;
    private fileAlreadyExists: boolean = false;
    private incorrectFileExtension: boolean = false;
    private requiredFileExtension: string = "ts";
    private problemObservable: Subject<void>;
    private problemSub: Subscription;
    private bottomPanelMode: "problems" | "output" | "terminal" = "problems";
    private draggingFileNode: FileNode;
    private dragConfirmed: boolean = false;
    private draggingResizeHandle: "file-list" | "bottom-panel";
    private dragStart: { x: number, y: number };
    private cursor: { x: number, y: number };
    private changingActiveFileNode: boolean = false;
    private filesWidth = 288;
    private outputHeight = 288;
    private windowWidth: number = window.innerWidth;
    private windowHeight: number = window.innerHeight;
    private resizeTerminalTimeout;

    ngAfterViewInit() {
        this.strategies.getFileSystemStructure();

        setTimeout(() => {
            dispatchEvent(new Event("resize"))
            this.windowWidth = window.innerWidth;
            this.windowHeight = window.innerHeight;
        });

        window.addEventListener("beforeunload", (e) => {
            if (!this.strategies.findFileNode(f => f.edited, this.strategies.openFilesRoot)) return;
            e.returnValue = "";
            return "";
        });
    }

    ngOnDestroy() {
        if (this.problemSub)
            this.problemSub.unsubscribe();
    }

    @HostListener("window:resize", ["$event"])
    onResize() {
        this.windowWidth = window.innerWidth;
        this.windowHeight = window.innerHeight;
        this.terminal.resize();
    }

    @HostListener("window:keydown", ["$event"])
    onKeyDown(e: KeyboardEvent) {
        if (e.key == "Control") this.controlKeyDown = true;

        if (this.controlKeyDown && e.key == "s") {
            e.preventDefault();
            return false;
        }
    }

    @HostListener("window:keyup", ["$event"])
    onKeyUp(e: KeyboardEvent) {
        if (e.key == "Control")
            this.controlKeyDown = false;

        if (this.controlKeyDown) {
            switch (e.key) {
                case "`": 
                    this.showOutput = !this.showOutput; 
                    setTimeout(() => this.terminal.resize());             
                    break;
                case "b": this.showFiles = !this.showFiles;   break;
                case "s": this.onSaveActiveFile();            break;
            }
        } else {
            switch (e.key) {
                case "F2":
                    this.renameSelectedNode();
                    break;
                case "Delete": this.onDeleteSelectedFileNode(); break;
                case "Enter":
                    if (this.deleteFilePromiseResolver)
                        this.deleteFilePromiseResolver(true);
                    break;
                case "Escape":
                    if (this.deleteFilePromiseResolver)
                        this.deleteFilePromiseResolver(false);
                    break;
            }
        }

        if (this.problemObservable)
            this.problemObservable.next();
    }

    public  renameSelectedNode(): void {
        if (this.strategies.selectedNodeIsDirectory) {
            return;
            // if ((<DirectoryNode>this.strategies.selectedNode).root) return;
        }
        
        this.oldFileName = this.strategies.selectedNode.name;
        this.renamingSelectedNode = true; 

        setTimeout(() => {
            let split = this.strategies.selectedNode.name.split(".");
            let ext = split[split.length - 1];
            this.renameInput.focus();
            /// @ts-ignore
            this.renameInput.setSelectionRange(0, this.strategies.selectedNode.name.length - (ext.length + 1));
        });
    }

    public onClickNode(node: FileNode | DirectoryNode, isDirectory: boolean, rootName: string) {
        this.strategies.selectNode(node, isDirectory, rootName);

        if (isDirectory) {
            let dirNode: DirectoryNode = node;
            if (dirNode.visible === undefined) 
                dirNode.visible = true;
            dirNode.visible = !dirNode.visible;
        } else if (rootName == this.strategies.toolsRoot.name) {

        }
        else {
            this.openFile(node);
        }
    }

    public async onDeleteSelectedFileNode(): Promise<void> {
        if (this.deleteFilePromiseResolver) return;

        let shouldDelete = await this.openDeleteFilePrompt();
        this.deleteFilePromiseResolver = null;

        if (shouldDelete)
            this.strategies.deleteFile(this.strategies.selectedNode);
    }

    public openDeleteFilePrompt(): Promise<boolean> {
        return new Promise(resolve => {
            this.deleteFilePromiseResolver = resolve;
        });
    }

    public onNodeKeyPress(e) {
        console.log(e)
    }

    public onGoToProblem(problem): void {
        this.strategies.activeFileNode.editor
            .setCursor(problem.startLineNumber, problem.startColumn);
    }

    public onCreateNewFile(): void {
        var parentDirectoryNode: DirectoryNode = this.strategies.selectedNode;

        if ((<DirectoryNode>this.strategies.selectedNode).root) return;
        if (!this.strategies.selectedNodeIsDirectory) {
            if (!this.strategies.selectedNodeParentDirectory) return;
            parentDirectoryNode = this.strategies.selectedNodeParentDirectory;
        }
        
        let ext = (<DirectoryNode>parentDirectoryNode).name == "Strategies" ? "json" : "ts";
        let newFileName = `untitled.${ext}`;
        let untitledFileCount = 1;
        
        while (this.strategies.fileExists(newFileName))
        newFileName = `untitled_${++untitledFileCount}.${ext}`;
    
        let newFileNode: FileNode = { name: newFileName, content: "" };
        
        if (!parentDirectoryNode.files) parentDirectoryNode.files = [];
        
        parentDirectoryNode.files.push(newFileNode);
        parentDirectoryNode.visible = true;
        this.strategies.selectedNode = newFileNode;
        this.strategies.selectedNodeIsDirectory = false;
        this.renamingSelectedNode = true;
        this.creatingNewFile = true;
        this.requiredFileExtension = ext;

        setTimeout(() => {
            this.renameInput.focus();
            /// @ts-ignore
            this.renameInput.setSelectionRange(0, this.strategies.selectedNode.name.length - (ext.length + 1));
        });
    }

    public onNewFileNameChanged(): void {
        let selectedNode = this.strategies.selectedNode;
        this.fileAlreadyExists = this.strategies.fileExists(selectedNode.name, selectedNode);
        this.incorrectFileExtension = !selectedNode.name.endsWith("." + this.requiredFileExtension);
    }

    public onFinishRenamingFile(): void {
        if (this.creatingNewFile) {
            let containingDirNode = this.strategies
                .findDirectoryNode(n => {
                    if (!n.files) return false;
                    return !!n.files.find(f => f.name == this.strategies.selectedNode.name);
                }, this.strategies.fileSystemRoot);
    
            this.creatingNewFile = false;
            this.strategies.createFile(containingDirNode.name, this.strategies.selectedNode.name)
            this.openFile(this.strategies.selectedNode);
        } else {
            this.strategies.renameFile(this.strategies.selectedNode, this.oldFileName);
        }

        this.renamingSelectedNode = false;
    }

    public onSaveActiveFile(): void {
        this.strategies.updateFile(this.strategies.activeFileNode);
    }

    public onTabMouseDown(fileNode: FileNode, preventOpeningFile: boolean = false): void {
        if (!preventOpeningFile) this.openFile(fileNode);
        this.draggingFileNode = fileNode;
        this.dragStart = { ...this.cursor };
    }

    public onTabMouseUp(fileNode: FileNode): void {
        if (!this.draggingFileNode && !this.cursor) return;
        if (this.draggingFileNode == fileNode) return;
        if (!this.dragConfirmed) return;

        this.strategies.switchFileNodeTabOrder(fileNode, this.draggingFileNode);
    }

    @HostListener("window:mousemove", ["$event.clientX", "$event.clientY"])
    public onMouseMove(x: number, y: number): void {
        this.cursor = { x, y };

        if (this.draggingResizeHandle && this.cursor) {
            this.outputHeight = this.windowHeight - this.cursor.y - 48;

            clearTimeout(this.resizeTerminalTimeout);
            this.resizeTerminalTimeout = setTimeout(() => this.terminal.resize(), 125);
        } 
        else if (this.draggingFileNode && !this.dragConfirmed) {
            this.dragConfirmed = Math.sqrt(
                Math.pow(this.cursor.x - this.dragStart.x, 2) + 
                Math.pow(this.cursor.y - this.dragStart.y, 2)
            ) > 16;

            if (this.dragConfirmed)
                this.openFile(this.draggingFileNode);
        }
    }

    @HostListener("window:mouseup")
    public onMouseUp(): void {
        this.draggingFileNode = null;
        this.dragConfirmed = false;
        this.draggingResizeHandle = null;
        this.cursor = null;
    }

    @HostListener("window:click")
    public onClick(): void {
        if (!this.deleteFilePromiseResolver)
            this.strategies.clearSelectedNode();
    }

    public onChangeBottomPanelMode(mode: "problems" | "output" | "terminal") {
        this.bottomPanelMode = mode;

        if (mode == "terminal") this.terminal.focus();
    }

    private async openFile(fileNode: FileNode): Promise<void> {
        if (!fileNode.editor) fileNode.editor = {
            options:  {
                theme: "monokai",
                language: fileNode.name.endsWith(".ts")
                    ? "typescript" 
                    : "json",
                automaticLayout: true,
                scrollBeyondLastLine: false,        
            }
        }

        if (!this.strategies.activeFileNode) {
            await this.strategies.openFile(fileNode);
            return;
        }

        this.changingActiveFileNode = true;
        await this.strategies.openFile(fileNode);
        setTimeout(() => this.changingActiveFileNode = false, 200);
    }

    public onResizeHandleMouseDown(handle: "file-list" | "bottom-panel") {
        this.draggingResizeHandle = handle;
    }
}
