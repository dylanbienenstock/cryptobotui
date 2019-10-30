import { Injectable, EventEmitter } from '@angular/core';
import { SignalRService } from './signalr.service';

export interface Problem {
    message: string;
    startLineNumber: number;
    startColumn: number;
}

export interface DirectoryNode {
    name: string;
    root?: boolean;
    visible?: boolean;
    buttons?: boolean;
    directories?: DirectoryNode[];
    files?: FileNode[];
}

export interface FileNode {
    // From database
    name: string;
    content?: string;
    problems?: Problem[];

    // Temporary UI state
    lastSavedContent?: string;
    edited?: boolean;
    isTool?: boolean;
    icon?: string;
    
    // Permanent UI state
    tabOrder?: number;
    scrollTop?: number;
    scrollLeft?: number;
    cursorLineNumber?: number;
    cursorColumn?: number;

    editor?: {
        focus?: () => void;
        getProblems?: () => Problem[];
        setCursor?: (line: number, col: number) => void;
        setScroll?: (top: number, left: number) => void;
        setText?: (text: string) => void;
        onFocused?: (fn: () => void) => void;
        initialized?: boolean;
        hidden?: boolean;
        options?: any;

        problemChecker?: {
            timeout?: any;
            stopped?: boolean;
            start: () => void;
            stop: () => void;
        }
    }
}

@Injectable({
    providedIn: 'root'
})
export class StrategyService {

    constructor(private signalR: SignalRService) { }

    public activeFileNodeChanged = new EventEmitter<void>();
    private _activeFileNode: FileNode;
    public lastActiveFileNode: FileNode;
    public set activeFileNode(val: FileNode) {
        this.lastActiveFileNode = this._activeFileNode;
        this._activeFileNode = val;
        this.activeFileNodeChanged.emit();
    }
    public get activeFileNode(): FileNode {
        return this._activeFileNode;
    }

    public selectedNode: FileNode | DirectoryNode;
    public selectedNodeParentDirectory: DirectoryNode;
    public selectedNodeIsDirectory: boolean;
    public selectedNodeRootName: string;

    public openFilesRoot: DirectoryNode = {
        name: "Open Editors",
        root: true,
        files: []
    };

    public fileSystemRoot: DirectoryNode = {
        name: "Files",
        root: true,
        buttons: true
    };

    public toolsRoot: DirectoryNode = {
        name: "Tools",
        root: true,
        files: [
            {
                name: "Version Control",
                isTool: true,
                icon: "versioncontrol"
            },
            {
                name: "Tune Inputs",
                isTool: true,
                icon: "tune"
            },
            {
                name: "Test Backward",
                isTool: true,
                icon: "backtest"
            },
            {
                name: "Test Forward",
                isTool: true,
                icon: "forwardtest"
            }
        ]
    };

    public async getTypescriptDefinitions(): Promise<string> {
        await this.signalR.connected;

        let res = await this.signalR.invoke<string>("GetTypescriptDefinitions");
        if (!res.success) throw Error(res.error);

        return res.data;
    }

    public async getFileSystemStructure(): Promise<void> {
        await this.signalR.connected;

        let res = await this.signalR.invoke<DirectoryNode[]>("GetFileSystemStructure");
        if (!res.success) throw Error(res.error);

        this.fileSystemRoot.directories = res.data;
        this.openFilesRoot.directories = null;
    }

    public selectNode(node: FileNode | DirectoryNode, isDirectory: boolean, rootName: string): void {
        this.selectedNode = node;
        this.selectedNodeIsDirectory = isDirectory;
        this.selectedNodeRootName = rootName;

        if (isDirectory || node.name == rootName) return;

        this.selectedNodeParentDirectory = 
            this.findDirectoryNode(d => d.files.includes(node), this.fileSystemRoot);
    }

    public async createFile(directoryName: string, newFileName: string): Promise<void> {
        await this.signalR.connected;
        let res = await this.signalR.invoke<void>("CreateFile", { directoryName, newFileName });
        if (!res.success) throw Error(res.error);
    }

    public async getFile(fileName: string): Promise<void> {
        await this.signalR.connected;
        let res = await this.signalR.invoke<FileNode>("GetFile", fileName);
        if (!res.success) throw Error(res.error);
        
        let fileNode = this.findFileNode(f => f.name == fileName, this.fileSystemRoot);
        if (!fileNode) throw Error("File node not present in local file system");

        fileNode.content = res.data.content;
        fileNode.problems = res.data.problems;
    }

    public async updateFile(fileNode: FileNode): Promise<void> {
        fileNode.lastSavedContent = fileNode.content;
        fileNode.edited = false;

        await this.signalR.connected;
        let res = await this.signalR.invoke<void>("UpdateFile", {
            fileName: fileNode.name,
            content:  fileNode.content,
            problems: fileNode.problems
        });
        if (!res.success) throw res;
    }

    public fileExists(fileName: string, exclude?: FileNode): boolean {
        return !!this.findFileNode(f => f != exclude && f.name == fileName, this.fileSystemRoot);
    }

    public findDirectoryNode(predicate: (node: DirectoryNode) => boolean, root: DirectoryNode): DirectoryNode {
        let search = (node: DirectoryNode): DirectoryNode => {
            for (let childNode of node.directories || []) {
                if (predicate(childNode)) return childNode;
                let found = search(childNode);
                if (found) return found;
            }
        };

        return search(root);
    }

    public findFileNode(predicate: (node: FileNode) => boolean, root: DirectoryNode): FileNode {
        let fileNode: FileNode;
        if (root.files) fileNode = root.files.find(predicate);
        if (fileNode) return fileNode;
        this.findDirectoryNode(d => {
            fileNode = d.files.find(predicate);
            return !!fileNode;
        }, root);
        return fileNode;
    }

    public clearSelectedNode(): void {
        this.selectedNode = null;
        this.selectedNodeIsDirectory = null;
    }

    public async openFile(fileNode: FileNode): Promise<void> {
        if (fileNode == this.activeFileNode) return;

        if (this.activeFileNode && this.activeFileNode.editor && this.activeFileNode.editor.problemChecker) 
            this.activeFileNode.editor.problemChecker.stop();

        if (fileNode.content == undefined) {
            let res = await this.signalR.invoke<FileNode>("ReadFile", fileNode.name);
            console.log(res)
            if (!res.success) throw Error(JSON.stringify(res.error));
            fileNode.content = res.data.content;
        }
        
        if (!fileNode.lastSavedContent)
            fileNode.lastSavedContent = fileNode.content;

        this.activeFileNode = fileNode;

        if (fileNode.editor && this.activeFileNode.editor.problemChecker) 
            setTimeout(() => fileNode.editor.problemChecker.start(), 500);
        
        let alreadyOpen = this.findFileNode(f => f.name == fileNode.name, this.openFilesRoot);
        if (alreadyOpen) return;

        fileNode.tabOrder = this.openFilesRoot.files.length;
        this.openFilesRoot.files.push(fileNode);
    }

    public closeFile(fileNode: FileNode): void {
        this.openFilesRoot.files = this.openFilesRoot.files
            .filter(f => f != fileNode);

        if (fileNode != this.activeFileNode) return;

        let activeFileNodeTabOrder = fileNode.tabOrder;

        if (this.activeFileNode && this.activeFileNode.editor && this.activeFileNode.editor.problemChecker)
            this.activeFileNode.editor.problemChecker.stop();

        this.refreshTabOrder();

        if (this.openFilesRoot.files.length == 1)
            activeFileNodeTabOrder = 0;
        else if (fileNode.tabOrder == this.openFilesRoot.files.length)
            activeFileNodeTabOrder = fileNode.tabOrder - 1;

        this.activeFileNode = 
            this.findFileNode(f => f.tabOrder == activeFileNodeTabOrder, this.openFilesRoot);
    }

    public async renameFile(fileNode: FileNode, originalFileName: string): Promise<void> {
        let res = await this.signalR.invoke<any>("RenameFile", {
            originalFileName: originalFileName,
            newFileName: fileNode.name
        });

        if (!res.success) throw Error(JSON.stringify(res));

        for (let openFileNode of this.openFilesRoot.files) {
            if (openFileNode.name.endsWith(".json")) {
                openFileNode.content = openFileNode.content
                    .replace(`"${originalFileName}"`, `"${fileNode.name}"`);
                
                openFileNode.editor.setText(openFileNode.content);
            }
        }
    }

    public deleteFile(fileNode: FileNode): void {
        this.closeFile(fileNode);

        let containingDirectoryNode = 
            this.findDirectoryNode(d => d.files.includes(fileNode), this.fileSystemRoot);

        containingDirectoryNode.files = 
            containingDirectoryNode.files.filter(f => f.name != fileNode.name);

        this.signalR.invoke<any>("DeleteFile", fileNode.name);
    }

    public switchFileNodeTabOrder(a: FileNode, b: FileNode): void {
        let temp = a.tabOrder;
        a.tabOrder = b.tabOrder;
        b.tabOrder = temp;
    }

    public moveFileNodeTabToEnd(fileNode: FileNode): void {
        if (!fileNode) return;
        fileNode.tabOrder = Infinity;
        this.refreshTabOrder();
    }

    private refreshTabOrder(): void {
        this.openFilesRoot.files = 
            this.openFilesRoot.files.sort((a, b) => {
                if (a.tabOrder > b.tabOrder) return 1;
                if (a.tabOrder < b.tabOrder) return -1;
            });

        this.openFilesRoot.files
            .forEach((f, i) => f.tabOrder = i);
    }

    public async getModuleSchema(fileName: string): Promise<any> {
        if (!fileName || !fileName.endsWith(".ts")) return;
        
        await this.signalR.connected;
        let res = await this.signalR.invoke<any>("GetModuleSchema", fileName);
        if (!res.success) return null; // ! TODO: Maybe throw here?
        return res.data;
    }
}
