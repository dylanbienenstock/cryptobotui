import { Component, ViewEncapsulation, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { Terminal } from 'xterm';
import * as FitAddon from "xterm/lib/addons/fit/fit";
import * as WebfontLoader from 'xterm-webfont';
import { CommandFormats } from './console.commands.formats';
import { CommandFormat, CommandInput, CommandInputType, CommandInputValue, CommandOption, CommandFunctionContext } from './console.commands.types';
import chalk from 'chalk';
import * as Semaphore from "semaphore";
import { StrategyService } from 'src/app/services/strategy.service';
import { ScriptingService } from 'src/app/services/scripting.service';

const style = new chalk.constructor({ enabled: true, level: 1 });

@Component({
    selector: 'app-console',
    templateUrl: './console.component.html',
    styleUrls: ['./console.component.scss'],
    encapsulation: ViewEncapsulation.ShadowDom
})
export class ConsoleComponent implements AfterViewInit {

    constructor(
        private hostRef: ElementRef,
        private strategies: StrategyService,
        private scripting: ScriptingService
    ) { }

    @ViewChild("terminalContainer", { static: false })
    private terminalContainer: ElementRef;

    private terminal: Terminal;
    private input: string = "";
    private inputSemaphore = Semaphore(1);

    public focus(): void {
        setTimeout(() => this.terminal.focus());
    }

    public resize(): void {
        setTimeout(() => {
            try {
                /// @ts-ignore
                this.terminal.fit();
            } catch {}
        }, 100);
    }

    private async execute(input: string): Promise<void> {
        try {
            let fail = (errType: string, ...msg: string[]) => {
                throw `${style.redBright(errType + " error:")} ${msg.join("\n")}`;
            };

            if (input.split("").filter(c => c == "\"").length % 2 == 1)
                fail("Syntax", "Unclosed quotation mark");

            let words: string[] = [];
            let currentWord = "";
            let inQuotes = false;

            for (let i = 0; i < input.length; i++) {
                let char = input[i];
                switch (char) {
                    case "\"":
                    case "'":
                        if (inQuotes) {
                            words.push(currentWord);
                            currentWord = "";
                        }
                        inQuotes = !inQuotes;
                        break;
                    case " ":
                        if (inQuotes) currentWord += char;
                        else if (currentWord) {
                            words.push(currentWord);
                            currentWord = "";
                        }
                        break;
                    default:
                        currentWord += char;
                        break;
                }
            }

            if (currentWord) words.push(currentWord);

            let commandName = words.shift();
            let command: CommandFormat = CommandFormats.find(c => c.name == commandName);
            if (!command) fail("Reference", "Unrecognized command", style.dim("Type 'help' to see the list of available commands"));

            let args: CommandInput = {};
            let options: CommandInput = {};

            let invalidArgCount = (counted: boolean) => {
                let expected = command.arguments.length;
                let actual = Object.keys(args).length;
                fail("Reference", `Invalid argument count (Expected ${expected}, got ${counted ? actual : expected + "+"})`);
            }

            for (let i = 0; i < words.length; i++) {
                let word = words[i];
                if (this.isFlagOrOption(word)) {
                    let isFlag = word[1] != "-";
                    let key = word.substr(isFlag ? 1 : 2);
                    let value: string;
                    let validatedValue: CommandInputValue;
                    let option: CommandOption;

                    let unrecognized = (): void => {
                        let advice = `Type '${command.name} --help' for proper usage`;
                        if (command.name == "help") advice = "Type 'help' for proper usage";
                        fail("Reference", `Unrecognized ${isFlag ? "flag" : "option"} '${key}'`, advice);
                    }

                    let defaultValue = (option: CommandOption): string => {
                        if (option.type == CommandInputType.Boolean) return "true";
                        if ((option.unassignedDefault || option.missingDefault) === undefined)
                            fail("Reference", `Unassigned ${isFlag ? "flag" : "option"} '${key}' has no default value`);
                        return String(option.unassignedDefault || option.missingDefault);
                    }

                    let valueIsNextWord = () => {
                        if (i == words.length - 1 || this.isFlagOrOption(words[i + 1]))
                            value = defaultValue(option);
                        else {
                            let remainingWords = words.length - i - 1;
                            let unassignedArgs = (command.arguments || []).length - Object.keys(args).length;

                            if (remainingWords > unassignedArgs) value = words[++i];
                            else value = defaultValue(option);
                        }
                    }

                    if (isFlag) {
                        if (key.indexOf("=") != -1)
                            fail("Syntax", "Flags cannot be assigned using '='");

                        option = command.options.find(o => o.flag == key);
                        if (!option) unrecognized();

                        valueIsNextWord();
                    } else {
                        if (key == "help") {
                            await this.execute("help -c " + command.name);
                            return;
                        }

                        let findOption = () => {
                            option = command.options.find(o => o.name == key);
                            if (!option) unrecognized();
                        }

                        if (key.indexOf("=") != -1) {
                            if (!key.endsWith("=")) {
                                [key, value] = key.split("=");
                                findOption();
                            }
                            else value = String(option.unassignedDefault);
                        }
                        else {
                            findOption();
                            valueIsNextWord();
                        }
                    }

                    try { validatedValue = this.validate(value, option.type); }
                    catch (err) { fail("Type", err); }

                    options[option.name] = validatedValue;
                } else if (command.arguments) {
                    let arg = command.arguments[Object.keys(args).length];
                    let validatedValue: CommandInputValue;

                    if (!arg) invalidArgCount(false);

                    try { validatedValue = this.validate(word, arg.type); }
                    catch (err) { fail("Type", err); }

                    args[arg.name] = validatedValue;
                }
            }

            if (command.arguments && Object.keys(args).length != command.arguments.length)
                invalidArgCount(true);

            let context = this.getCommandContext(command);
            try { await command.fn.apply(context, [args, options]); }
            catch (err) { fail("Command", err); }

        } catch (err) {
            try {
                (<string>err)
                    .replace("TypeError: ", "")
                    .split("\n")
                    .forEach(line => this.terminal.writeln(line));
            } catch (unknownErr) {
                this.terminal.writeln(`${chalk.redBright("Unknown error:")} Check developer console for more information`);
                console.error(err);
                console.error(unknownErr);
            }
        }
    }

    private getCommandContext(command: CommandFormat): CommandFunctionContext {
        let supportedColors = ["red", "yellow", "green", "cyan", "blue", "magenta", "black", "white"];
        return {
            execute:           input => this.execute(input),
            clear:             ()    => setTimeout(() => this.terminal.clear()),
            write:             text  => this.terminal.write(text),
            writeln:           text  => text.split("\n").forEach(l => this.terminal.writeln(l)),
            supportsColor:     color => supportedColors.includes(color),
            supportedColors:   supportedColors,
            style:             style,
            command:           command,
            availableCommands: CommandFormats,
            strategies:        this.strategies,
            scripting:         this.scripting
        };
    }

    private isFlagOrOption(input: string): boolean {
        return /^--?[a-zA-Z-=]+$/.test(input);
    }

    private validate(input: string, type: CommandInputType): CommandInputValue {
        let invalid = `Expected ${type}, got '${input}'`;
        switch (type) {
            case CommandInputType.Boolean:
                switch (input) {
                    case "1":
                    case "true": return true;
                    case "0":
                    case "false": return false;
                    default: throw invalid;
                }
            case CommandInputType.Integer:
                if (/^-?[0-9]+$/.test(input))
                    return Number(input);
                throw invalid;
            case CommandInputType.Float:
                if (/^-?[0-9]+(?:\.[0-9]+)?$/.test(input))
                    return Number(input);
                throw invalid;
            case CommandInputType.String:
                return String(input);
        }
    }

    ngAfterViewInit() {
        if (this.terminal) return;

        setTimeout(async () => {
            Terminal.applyAddon(FitAddon);
            Terminal.applyAddon(WebfontLoader);

            this.terminal = new Terminal({
                fontFamily: "Iosevka, monospace",
                fontSize: 13,
                theme: {
                    background: "#292929",
                    foreground: "#CCCCCC",
                    white: "#CCCCCC",
                    black: "#000000",
                }
            });

            /// @ts-ignore
            await this.terminal.loadWebfontAndOpen(this.terminalContainer.nativeElement);
            /// @ts-ignore
            setTimeout(() => this.resize());

            this.terminal.write("$ ");
            this.terminal.focus();

            this.terminal.on("key", (key, ev) => {
                this.inputSemaphore.take(async () => {
                    /// @ts-ignore
                    let printable = !ev.altKey && !ev.altGraphKey && !ev.ctrlKey && !ev.metaKey;
                    let x = (<any>this.terminal)._core.buffer.x;

                    switch (ev.key) {
                        case "Backspace":
                            if (x <= 2) break;
                            let afterCursor = this.input.substr(x - 2);
                            this.input = this.input.substr(0, x - 3) + afterCursor;
                            this.terminal.write("\b".repeat(this.terminal.cols));
                            this.terminal.write("$ " + this.input + " " + "\b".repeat(1 + afterCursor.length));
                            break;
                        case "Enter":
                            this.terminal.write("\r\n");
                            await this.execute(this.input);
                            this.terminal.write("\n");
                            this.terminal.write("$ ");
                            this.input = "";
                            break;
                        case "ArrowUp":
                        case "ArrowDown":
                            ev.preventDefault();
                            ev.stopPropagation();
                            break;
                        case "ArrowLeft":
                            if ((<any>this.terminal)._core.buffer.x > 2)
                                this.terminal.write(key)
                            break;
                        case "ArrowRight":
                            if ((<any>this.terminal)._core.buffer.x <= this.input.length + 1)
                                this.terminal.write(key)
                            break;
                        default:
                            if (!printable) break;
                            let afterCursor2 = this.input.substr(x - 2);
                            this.terminal.write(key);
                            this.input = this.input.substr(0, x - 2) + key + this.input.substr(x - 2);
                            this.terminal.write("\b".repeat(this.terminal.cols));
                            this.terminal.write("$ " + this.input + " " + "\b".repeat(1 + afterCursor2.length));
                            break;
                    }

                    setTimeout(() => this.inputSemaphore.leave());
                });
            });
        });
    }
}
