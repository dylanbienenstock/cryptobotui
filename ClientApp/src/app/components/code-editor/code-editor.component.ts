import { Component, OnInit, Input, Output, EventEmitter, NgZone, OnDestroy } from '@angular/core';
import { FileNode, StrategyService } from 'src/app/services/strategy.service';
import { CreateStrategySchema, ModuleDescription as ModuleSchemaDescription } from './code-editor.schema';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-code-editor',
    templateUrl: './code-editor.component.html',
    styleUrls: ['./code-editor.component.scss']
})
export class CodeEditorComponent implements OnInit, OnDestroy {

    constructor(public strategies: StrategyService,
                private zone: NgZone) { }

    @Input() changingActiveFileNode: boolean;    
    @Input() draggingFileNode: FileNode;
    @Input() dragConfirmed: boolean;
    @Input() cursor: { x: number, y: number };

    @Output() tabMouseDown = new EventEmitter<FileNode>();
    @Output() tabMouseUp = new EventEmitter<FileNode>();

    private activeFileNodeChangedSub: Subscription;
    private getRequiredSchemasTimeout;
    private moduleSchemas: { [fileName: string]: any } = { };
    private typescriptDefinitions: string;
    private typescriptLib: monaco.IDisposable;

    ngOnInit() {
        this.activeFileNodeChangedSub = this.strategies.activeFileNodeChanged
            .subscribe(() => this.onActiveFileNodeChanged());
    }

    ngOnDestroy() {
        if (this.activeFileNodeChangedSub)
            this.activeFileNodeChangedSub.unsubscribe();
    }
    
    public onTabMouseDown(fileNode: FileNode): void {
        this.tabMouseDown.emit(fileNode);
        setTimeout(() => {
            dispatchEvent(new Event("resize"));
            // this.strategies.activeFileNode.editor.focus();
        });
    }

    public onTabMouseUp(fileNode: FileNode): void {
        this.tabMouseUp.emit(fileNode);
    }

    public onMoveDraggedTabToEnd(): void {
        if (!this.draggingFileNode && !this.cursor) return;
        
        this.strategies.moveFileNodeTabToEnd(this.draggingFileNode);
    }

    public onActiveFileNodeChanged(): void {
        setTimeout(() => {
            this.getRequiredJsonSchemas(this.strategies.activeFileNode, true);
            this.addLibrary(this.strategies.activeFileNode);
        });
    }

    public onActiveFileNodeContentChanged(): void {
        this.strategies.activeFileNode.edited = 
            this.strategies.activeFileNode.content != 
                this.strategies.activeFileNode.lastSavedContent;

        if (this.strategies.activeFileNode.name.endsWith(".json")) {
            let fileNode = this.strategies.activeFileNode;
            clearTimeout(this.getRequiredSchemasTimeout);
            this.getRequiredSchemasTimeout = 
                setTimeout(() => this.getRequiredJsonSchemas(fileNode), 250);
        }
    }

    private async getRequiredJsonSchemas(fileNode: FileNode, force: boolean = false): Promise<void> {
        if (!fileNode || !fileNode.name.endsWith(".json")) return;

        if (force) this.moduleSchemas = {};

        let requiredSchemas = this.findModuleNames(fileNode);
        let promises: Promise<{ moduleName: string, moduleDesc: ModuleSchemaDescription }>[] = [];

        for (let moduleName in requiredSchemas) {
            let fileName = requiredSchemas[moduleName];
            let availableFiles = this.getAvailableFilesForModuleType(moduleName);
            
            if (!this.moduleSchemas[fileName]) {
                promises.push(new Promise(async resolve => {
                    let inputs = await this.strategies.getModuleSchema(fileName);
                    this.moduleSchemas[fileName] = inputs;

                    resolve({
                        moduleName, 
                        moduleDesc: {
                            files: availableFiles,
                            inputs: inputs
                        }
                    });
                }));
            } else {
                promises.push(new Promise(resolve => {
                    resolve({
                        moduleName, 
                        moduleDesc: {
                            files: availableFiles,
                            inputs: this.moduleSchemas[fileName]
                        }
                    });
                }));
            }
        }

        let moduleDescriptions = await Promise.all(promises);
        let moduleDesc = (moduleName: string): ModuleSchemaDescription => 
            (moduleDescriptions.find(ms => ms && ms.moduleName == moduleName) || <any>{}).moduleDesc;
            
        let strategySchema = CreateStrategySchema(
            moduleDesc("pairSelector"),
            moduleDesc("signalEmitter"),
            moduleDesc("orderManager")
        );

        this.zone.runOutsideAngular(() => {
            (<any>window).monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
                validate: true,
                schemas: [{
                    uri: "strategy-schema",
                    fileMatch: ["*"],
                    schema: strategySchema
                }]
            });
        });
    }

    private findModuleNames(fileNode: FileNode) {
        let regex = /(?:")(pairSelector|signalEmitter|orderManager)(?:".*?"name".*?")(.*?)(?:")/gs;
        let requiredSchemas = {};
        let matches;
        while ((matches = regex.exec(fileNode.content)) !== null) {
            if (matches.index === regex.lastIndex)
                regex.lastIndex++;
            requiredSchemas[matches[1]] = matches[2];
        }
        return requiredSchemas;
    }

    private getAvailableFilesForModuleType(moduleName: string) {
        let directoryMap = {
            pairSelector: "Pair Selectors",
            signalEmitter: "Signal Emitters",
            orderManager: "Order Managers"
        };
        let directoryName = directoryMap[moduleName];
        let availableFiles = this.strategies
            .findDirectoryNode(n => n.name == directoryName, this.strategies.fileSystemRoot)
            .files.map(n => n.name);
        return availableFiles;
    }

    public onCloseTab(fileNode: FileNode) {
        this.strategies.closeFile(fileNode);
    }

    public onEditorInit(fileNode: FileNode, editor: monaco.editor.IStandaloneCodeEditor) {
        setTimeout(async () => {
            fileNode.editor = {
                ...fileNode.editor,
                focus: () => editor.focus(),
                getProblems: () => {
                    let uri = editor.getModel().uri;
                    return (<any>window).monaco.editor.getModelMarkers({ resource: uri });
                },
                setCursor: (line: number, col: number) => {
                    if (line === undefined || col === undefined) return;
                    editor.setPosition({ lineNumber: line, column: col });
                },
                setScroll: (top: number, left: number) => {
                    if (top)  editor.setScrollTop(top);
                    if (left) editor.setScrollLeft(left);
                },
                setText: (text: string) => {
                    editor.setValue(text);
                    this.getRequiredJsonSchemas(fileNode);
                },
                onFocused: (fn: () => void) => {
                    let listener = editor.onDidFocusEditorText(() => {
                        fn();
                        listener.dispose();
                    });
                },
                initialized: false,
                hidden: true,
                problemChecker: {
                    start: () => {
                        fileNode.editor.problemChecker.stopped = false;
                        fileNode.editor.problemChecker.timeout = setTimeout(() => {
                            if (!fileNode.editor.problemChecker.stopped) {
                                fileNode.problems = fileNode.editor.getProblems();
                                fileNode.editor.problemChecker.start();
                            }
                        }, 50);
                    },
                    stop: () => {
                        clearTimeout(fileNode.editor.problemChecker.timeout);
                        fileNode.editor.problemChecker.timeout = null;
                        fileNode.editor.problemChecker.stopped = true;
                    }          
                }
            }

            fileNode.editor.problemChecker.start();

            editor.onDidChangeCursorPosition(e => {
                if (this.changingActiveFileNode) return;

                this.strategies.activeFileNode.cursorLineNumber = e.position.lineNumber;
                this.strategies.activeFileNode.cursorColumn = e.position.column;
            });

            editor.onDidScrollChange(e => {
                if (this.changingActiveFileNode) return;

                this.strategies.activeFileNode.scrollTop = e.scrollTop;
                this.strategies.activeFileNode.scrollLeft = e.scrollLeft;
            });

            await this.addLibrary(fileNode);

            fileNode.editor.initialized = true;

            if (fileNode.name.endsWith(".json"))
                this.getRequiredJsonSchemas(fileNode);

            // setTimeout(() => editor.focus());
            setTimeout(() => fileNode.editor.hidden = false, 200);
        });
    }

    private async addLibrary(fileNode: FileNode) {
        if (!(<any>window).monaco) return;

        let directory = this.strategies
            .findDirectoryNode(d => d.files.includes(fileNode), this.strategies.fileSystemRoot);

        let moduleLibrary = {
            "Pair Selectors": "__pairSelector",
            "Signal Emitters": "__signalEmitter",
            "Order Managers": "__orderManager"
        };

        if (!this.typescriptDefinitions)
            this.typescriptDefinitions = await this.strategies.getTypescriptDefinitions();
            
        let lib = this.typescriptDefinitions;

        if (moduleLibrary[directory.name])
            lib = `var module = ${moduleLibrary[directory.name]};\n\n${this.typescriptDefinitions}`;

        if (this.typescriptLib)
            this.typescriptLib.dispose();

        this.typescriptLib = (<any>window).monaco.languages.typescript.typescriptDefaults.addExtraLib(lib, "");
    }
}
