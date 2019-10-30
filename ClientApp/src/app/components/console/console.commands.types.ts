import { Chalk } from "chalk";
import { StrategyService } from "src/app/services/strategy.service";
import { ScriptingService } from "src/app/services/scripting.service";

export enum CommandInputType {
    Boolean = "boolean",
    Integer = "integer",
    Float = "float",
    String = "string"
}

export type CommandInputValue = boolean | number | string;
export type CommandInput = { [name: string]: CommandInputValue }
export type CommandFunction = (this: CommandFunctionContext, args: CommandInput, options: CommandInput) => void;

export interface CommandFunctionContext {
    execute(input: string): void;
    clear(): void;
    write(text: string): void;
    writeln(text: string): void;
    style: Chalk;
    supportedColors: string[];
    supportsColor: (color: string) => boolean;
    availableCommands: CommandFormat[];
    command: CommandFormat;
    strategies: StrategyService;
    scripting: ScriptingService;
}

export interface CommandFormat {
    name: string;
    help: string[];
    fn: CommandFunction;
    arguments?: CommandArgument[];
    options?: CommandOption[];
}

export interface CommandArgument {
    name: string;
    type: CommandInputType;
    help: string;
}

export interface CommandOption {
    name: string;
    flag: string;
    type: CommandInputType;
    help: string;

    /** Default value to use when the option is not present in the input */
    missingDefault?: CommandInputValue;

    /** Default value to use when the option is present in the input, but unassigned */
    unassignedDefault?: CommandInputValue;
}