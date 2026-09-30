// Tool [Ask Excel (assistant) to create a table with rows and columns]-->Action
// Resources [Excel having Rows and Columns]
// Prompt [Predefined capabilities]
// Sampling[server ask from client]
// CHECK learning.readme for more details
import { McpServer, ResourceTemplate, } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { z } from "zod";
import * as fs from "node:fs/promises";
const server = new McpServer({
    name: "test",
    version: "1.0",
    // },
    //   capabilities: {
    //     resources: {},
    //     tools: {},
    //     prompts: {},
    //   },
});
// Testing the server with a tool to greet someone by name
// server.registerTool(
//   "greet",
//   {
//     description: "Greet someone by name",
//     inputSchema: z.object({ name: z.string() }),
//   },
//   async ({ name }) => ({
//     content: [{ type: "text", text: `Hello, ${name}!` }],
//   }),
// );
server.registerTool("create-user", {
    description: "Create a new user in the database",
    inputSchema: z.object({
        name: z.string().describe("The name of the user"),
        email: z.string().email().describe("The email of the user"),
        address: z.string().describe("The address of the user"),
        phone: z.string().describe("The phone number of the user"),
    }),
}, async ({ name, email, address, phone, }) => {
    try {
        const userId = await createUser({ name, email, address, phone });
        return {
            content: [
                {
                    type: "text",
                    text: `User ${userId} with name ${name} and email ${email} and address ${address} and phone ${phone} saved successfully`,
                },
            ],
        };
    }
    catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Failed to Save User. Error: ${error.message}`,
                },
            ],
        };
    }
    // const user = await createUser(name, email, password);
    // return { success: true, user };
});
server.registerResource("users", "users://all", {
    description: "Get all users from the database",
    mimeType: "application/json",
    title: "Users",
}, async () => {
    const users = await import("../src/data/users.json", {
        with: { type: "json" },
    }).then((module) => module.default); // hover over users default will get created with all params
    return {
        contents: [
            {
                uri: "users://all",
                text: JSON.stringify(users),
                mimeType: "application/json",
            },
        ],
    };
});
server.registerResource("user-details", new ResourceTemplate("users://{userId}/profile", {
    list: undefined,
}), {
    description: "Get the details of a user",
    mimeType: "application/json",
    title: "User Details",
}, async (uri, { userId }) => {
    const users = await import("../src/data/users.json", {
        with: { type: "json" },
    }).then((module) => module.default); // hover over users default will get created with all params
    const user = users.find((user) => user.id === parseInt(userId));
    if (!user) {
        return {
            contents: [],
            error: {
                message: "User not found",
            },
        };
    }
    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(user),
                mimeType: "application/json",
            },
        ],
    };
});
server.registerPrompt("generate-fake-user", {
    description: "Generate a fake user based on the given Name",
    argsSchema: z.object({
        name: z.string().describe("The name of the user"),
    }),
}, async (args) => {
    const { name } = args;
    return {
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: `Generated a fake user based : ${name} . User should have realistic email and address and phone number`,
                },
            },
        ],
    };
});
// Sampling
server.registerTool("create-random-user", {
    title: "Create Random User",
    description: "Create a random user",
}, async () => {
    const res = await server.server.createMessage({
        messages: [
            {
                role: "user",
                content: {
                    type: "text",
                    text: "Generate fake user data. The user should have a realistic name, email, address, and phone number. Return this data as a JSON object with no other text or formatter so it can be used with JSON.parse.",
                },
            },
        ],
        maxTokens: 1024,
    });
    if (res.content.type !== "text") {
        return {
            content: [{ type: "text", text: "Failed to generate user data" }],
        };
    }
    try {
        const fakeUser = JSON.parse(res.content.text
            .trim()
            .replace(/^```json/, "")
            .replace(/```$/, "")
            .trim());
        const id = await createUser(fakeUser);
        return {
            content: [{ type: "text", text: `User ${id} created successfully` }],
        };
    }
    catch {
        return {
            content: [{ type: "text", text: "Failed to generate user data" }],
        };
    }
});
async function createUser(user) {
    const users = await import("../src/data/users.json", {
        with: { type: "json" },
    }).then((module) => module.default); // hover over users default will get created with all params
    const userId = users.length + 1;
    users.push({ id: userId, ...user });
    await fs.writeFile("./src/data/users.json", JSON.stringify(users, null, 2)); //null 2 for proper spacing
    return userId;
}
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.log("Server is running...");
}
main();
