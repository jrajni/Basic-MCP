import "dotenv/config";
import { confirm, input, select } from "@inquirer/prompts";
import { Client, } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, jsonSchema } from "ai";
const mcp = new Client({
    name: "mcp-client",
    version: "1.0",
});
const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
});
async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["src/server.ts"],
    });
    await mcp.connect(transport);
    const [{ tools }, { prompts }, { resources }, { resourceTemplates }] = await Promise.all([
        mcp.listTools(),
        mcp.listPrompts(),
        mcp.listResources(),
        mcp.listResourceTemplates(),
    ]);
    console.log("you are connected to the server");
    while (true) {
        const option = await select({
            message: "What would you like to do",
            choices: ["Query", "Tools", "Resources", "Prompts"],
        });
        switch (option) {
            // case "Query":
            //   const query = await input("Enter a query: ");
            //   const result = await mcp.query(query);
            //   console.log(result);
            //   break;
            case "Tools":
                const toolName = await select({
                    message: "Select a tool",
                    choices: (tools || []).map((tool) => ({
                        name: tool.annotations?.title || tool.name,
                        value: tool.name,
                        description: tool?.description,
                    })),
                });
                console.log(toolName);
                const tool = tools.find((tool) => tool.name === toolName);
                if (tool) {
                    await handleTool(tool);
                }
                else {
                    console.log("Tool not found");
                }
                break;
            case "Resources":
                const resourceName = await select({
                    message: "Select a resource",
                    choices: [
                        ...resources.map((resource) => ({
                            name: resource.name,
                            value: resource.uri,
                            description: resource?.description,
                        })),
                        ...resourceTemplates.map((resource) => ({
                            name: resource.name,
                            value: resource.uriTemplate,
                            description: resource?.description,
                        })),
                    ],
                });
                const resourceUri = resources.find((resource) => resource.uri === resourceName)?.uri ??
                    resourceTemplates.find((template) => template.uriTemplate === resourceName)?.uriTemplate;
                if (resourceUri) {
                    await handleResource(resourceUri);
                }
                else {
                    console.log("Resource not found");
                }
                break;
            case "Prompts":
                const promptName = await select({
                    message: "Select a prompt",
                    choices: (prompts || []).map((prompt) => ({
                        name: prompt.name,
                        value: prompt.name,
                        description: prompt?.description,
                    })),
                });
                console.log(promptName);
                const prompt = prompts.find((prompt) => prompt.name === promptName);
                if (prompt) {
                    await handlePrompt(prompt);
                }
                else {
                    console.log("Prompt not found");
                }
                break;
            case "Query":
                await handleQuery(tools);
        }
        async function handleTool(tool) {
            const args = {};
            for (const [key, value] of Object.entries(tool.inputSchema.properties ?? {})) {
                args[key] = await input({
                    message: `Enter value for ${key} (${value.type}):`,
                });
            }
            const res = await mcp.callTool({
                name: tool.name,
                arguments: args,
            });
            console.log(res.content[0].text);
        }
        async function handleQuery(tools) {
            const query = await input({ message: "Enter a query: " });
            const { text, toolResults } = await generateText({
                model: google("gemini-3.8-flash"),
                prompt: query,
                tools: tools.reduce((acc, tool) => ({
                    ...acc,
                    [tool.name]: {
                        description: tool.description,
                        parameters: jsonSchema(tool.inputSchema),
                        execute: async (args) => {
                            const result = await mcp.callTool({
                                name: tool.name,
                                arguments: args,
                            });
                            return result;
                        },
                    },
                }), {}),
            });
            console.log(text || toolResults[0]?.title || "No result");
        }
        async function handleResource(uri) {
            let finalUri = uri;
            const paramMatches = uri.match(/{([^}]+)}/g);
            if (paramMatches != null) {
                for (const paramMatch of paramMatches) {
                    const paramName = paramMatch.replace("{", "").replace("}", "");
                    const paramValue = await input({
                        message: `Enter value for ${paramName}:`,
                    });
                    finalUri = finalUri.replace(paramMatch, paramValue);
                }
            }
            const res = await mcp.readResource({
                uri: finalUri,
            });
            console.log(JSON.stringify(JSON.parse(res.contents[0].text), null, 2));
        }
        async function handlePrompt(prompt) {
            const args = {};
            for (const arg of prompt.arguments ?? []) {
                args[arg.name] = await input({
                    message: `Enter value for ${arg.name}:`,
                });
            }
            const response = await mcp.getPrompt({
                name: prompt.name,
                arguments: args,
            });
            for (const message of response.messages) {
                console.log(await handleServerMessagePrompt(message));
            }
            async function handleServerMessagePrompt(message) {
                if (message.content.type !== "text")
                    return;
                console.log(message.content.text);
                const run = await confirm({
                    message: "Would you like to run the above prompt",
                    default: true,
                });
                if (!run)
                    return;
                const { text } = await generateText({
                    model: google("gemini-3.8-flash"),
                    prompt: message.content.text,
                });
                return text;
            }
        }
    }
}
main();
