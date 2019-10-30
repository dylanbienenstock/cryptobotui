export interface ModuleDescription {
    files: string[];
    inputs: any;
}

export function CreateStrategySchema(
    pairSelector: ModuleDescription = null, 
    signalEmitter: ModuleDescription = null, 
    orderManager: ModuleDescription = null
) {
    let moduleSchema = (moduleDesc: ModuleDescription) => {
        let schema: any = {
            type: "object",
            properties: {
                name: {
                    type: "null"
                }
            },
            required: [
                "name"
            ]
        };

        if (!moduleDesc) return schema;

        if (moduleDesc.files && moduleDesc.files.length > 0) {
            schema.properties["name"] = {
                enum: moduleDesc.files
            };
        }

        if (moduleDesc.inputs && Object.keys(moduleDesc.inputs).length > 0) {
            schema.properties["inputs"] = moduleDesc.inputs;
            schema.required.push("inputs");
        }

        return schema;
    }

    let strategySchema = {
        $schema: "http://json-schema.org/draft-04/schema#",
        type: "object",
        properties: {
            strategyName: {
                type: "string"
            },
            modules: {
                type: "object",
                properties: {
                    pairSelector: moduleSchema(pairSelector),
                    signalEmitter: moduleSchema(signalEmitter),
                    orderManager: moduleSchema(orderManager)
                },
                required: [
                    "pairSelector",
                    "signalEmitter",
                    "orderManager"
                ]
            }
        },
        required: [
            "strategyName",
            "modules"
        ]
    }

    return strategySchema;
};