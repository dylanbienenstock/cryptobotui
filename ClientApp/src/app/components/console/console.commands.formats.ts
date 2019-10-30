import { CommandFormat, CommandInputType } from "./console.commands.types";
import { CommandFunctions } from "./console.commands.functions";

const [Boolean, Integer, Float, String] = [
    CommandInputType.Boolean,
    CommandInputType.Integer,
    CommandInputType.Float,
    CommandInputType.String
];

export const CommandFormats: CommandFormat[] = [
    {
        name: "help",
        help: [ 
            "Display available commands, or get help with a specific command",
            "'[COMMAND] --help' is equivalent to 'help --command=[COMMAND]'"
        ],
        fn: CommandFunctions.Help,
        options: [
            {
                name: "command",
                flag: "c",
                type: String,
                help: "Print help for this command"
            },
            {
                name: "legend",
                flag: "L",
                type: Boolean,
                help: "Print color-coded type legend"
            }
        ]
    },
    {
        name: "clear",
        help: [ "Clears the output buffer" ],
        fn: CommandFunctions.Clear
    },
    {
        name: "colors",
        help: [ "Display supported colors" ],
        fn: CommandFunctions.Colors,
    },
    {
        name: "echo",
        help: [
            "Display a line of text with the specified styles",
            "Use quotation marks to input multiple words"
        ],
        fn: CommandFunctions.Echo,
        arguments: [
            {
                name: "text",
                type: String,
                help: "Text to display"
            }
        ],
        options: [
            {
                name: "foreground",
                flag: "fg",
                type: String,
                help: "Foreground color"
            },
            {
                name: "background",
                flag: "bg",
                type: String,
                help: "Background color"
            },
            {
                name: "bold",
                flag: "b",
                type: Boolean,
                help: "Bold text"
            },
            {
                name: "italic",
                flag: "i",
                type: Boolean,
                help: "Italic text"
            },
            {
                name: "underline",
                flag: "u",
                type: Boolean,
                help: "Underline text"
            },
            {
                name: "outline",
                flag: "o",
                type: Boolean,
                help: "Outline text (with box-drawing characters)"
            },
            {
                name: "repeat",
                flag: "r",
                type: Integer,
                help: "Repeat n times"
            }
        ]
    },
    {
        name: "compile",
        help: [
            "Run a test compile of the specified file",
            "The currently open file is used if not specified"
        ],
        fn: CommandFunctions.Compile,
        arguments: [
            {
                name: "file",
                type: String,
                help: "Name (without path) of the file to compile"
            }
        ]
    }
];