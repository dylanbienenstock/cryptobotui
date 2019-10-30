import { CommandFunction, CommandFormat, CommandOption } from "./console.commands.types";

export const CommandFunctions: { [name: string]: CommandFunction } = {
    Help(_, { command, legend }: {
         command: string;
         legend: boolean;
    }) {
        this.write("\r\n");

        let typeSymbols = ["𝘽", "𝙄", "𝙁", "𝙎"];
        let typeCodes = {
            "boolean": this.style.cyan(typeSymbols[0]),
            "integer": this.style.red(typeSymbols[1]),
            "float":   this.style.green(typeSymbols[2]),
            "string":  this.style.yellow(typeSymbols[3])
        };

        let getUsage = (command: CommandFormat): string => {
            let hasOptions = command.options && command.options.length > 0;
            let hasArguments = command.arguments && command.arguments.length > 0;
            let options = hasOptions ? " [OPTIONS] " : " ";
            let args = hasArguments ? command.arguments.map(a => "<" + a.name + ">").join(" ") : "";
            return `${this.style.dim("Usage:")} ${command.name}${options}${args}`;
        }

        let printHelp = (command: CommandFormat): void => {
            let writeLn = (line: string) => {
                if (false) line = this.style.dim(line);
                this.writeln(line);
            }

            writeLn(`${this.style.dim(command.name + ":")} ${command.help.join("\r\n")}\r\n`);
            writeLn(getUsage(command) + "\r\n");

            if (legend) {
                let legendOutput = Object.keys(typeCodes)
                    .map(type => `${typeCodes[type]} ${type}`)
                    .join("    ");

                this.writeln(legendOutput + "\r\n");
            }

            let hasArguments = command.arguments && command.arguments.length > 0;
            let hasOptions = command.options && command.options.length > 0;

            if (hasArguments) {
                this.writeln(this.style.dim("Arguments:"));
                let args = command.arguments.map(a => [`${typeCodes[a.type]}  ${a.name}`, a.help])
                let longest: number = 0;
                args.forEach(a => longest = Math.max(a[0].length, longest));
                args.forEach(a => writeLn(a[0] + " ".repeat(longest - a[0].length + 4) + a[1]));
                if (hasOptions) this.write("\r\n");
            }

            if (hasOptions) {
                this.writeln(this.style.dim("Options:"));
                let options = command.options.map(o => [`${typeCodes[o.type]}  -${o.flag}, --${o.name}`, o.help])
                let longest: number = 0;
                options.forEach(o => longest = Math.max(o[0].length, longest));
                options.forEach(o => writeLn(o[0] + " ".repeat(longest - o[0].length + 4) + o[1]));
            }
        }

        if (command) {
            let foundCommand = this.availableCommands.find(c => c.name == command);
            if (!foundCommand) throw `Unrecognized command '${command}'`;
            printHelp(foundCommand);
            return;
        }
        
        printHelp(this.command);
        this.writeln(`\r\nAvailable commands: ${this.availableCommands.map(c => c.name).join(", ")}`);
    },

    Clear() {
        this.clear();
    },

    Colors() {
        this.write("Supported colors: ");
        this.writeln(this.supportedColors.map(c => c != "black" ? this.style.keyword(c)(c) : this.style.bgWhite.black(c)).join(", "))
    },

    Echo(
        { text }: {
            text: string
        }, 
        { foreground, background, bold, italic, underline, outline, repeat }: {
            foreground: string;
            background: string;
            bold:       boolean;
            italic:     boolean;
            underline:  boolean;
            outline:    boolean;
            repeat:     number;
        }
    ) {
        for (let i = 0; i < (repeat || 1); i++) {
            let writeln = (line) => {
                if (foreground) {
                    if (this.supportsColor(foreground))
                        line = this.style.keyword(foreground)(line);
                    else throw `Unsupported color '${foreground}'`;
                }

                if (background) {
                    if (this.supportsColor(background))
                        line = this.style.bgKeyword(background)(line);
                    else throw `Unsupported color '${background}'`;
                }
                
                this.writeln(line);
            }

            let styledText = text;
            
            if (bold)      styledText = this.style.bold(styledText);
            if (italic)    styledText = this.style.italic(styledText);
            if (underline) styledText = this.style.underline(styledText);

            if (outline) {
                writeln("┏" + "━".repeat(text.length + 2) + "┓");
                writeln("┃ " + styledText + " ┃");
                writeln("┗" + "━".repeat(text.length + 2) + "┛");
            } else {
                writeln(styledText);
            }
        }
    },
    
    async Compile({ file }: { file: string }) {
        let fileNode = this.strategies.findFileNode(f => f.name == file, this.strategies.fileSystemRoot);
        if (!fileNode) throw "Failed to locate the specified file";

        this.writeln(`Compiling '${file}'...`);
        let synopsis = await this.scripting.execute(fileNode.content);
        this.writeln(`Compilation result:\n`);
        this.writeln(this.style.green(synopsis));
    }
}