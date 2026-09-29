"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("@modelcontextprotocol/server");
const stdio_1 = require("@modelcontextprotocol/server/stdio");
const zod_1 = require("zod");
const fs = __importStar(require("node:fs/promises"));
const server = new server_1.McpServer({
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
    inputSchema: zod_1.z.object({
        name: zod_1.z.string().describe("The name of the user"),
        email: zod_1.z.string().email().describe("The email of the user"),
        address: zod_1.z.string().describe("The address of the user"),
        phone: zod_1.z.string().describe("The phone number of the user"),
    }),
}, async ({ name, email, address, phone, }) => {
    console.log("before try", name, email, address, phone);
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
async function createUser(user) {
    console.log("userconsole", user);
    const users = await import("../src/data/users.json", {
        with: { type: "json" },
    }).then((module) => module.default); // hover over users default will get created with all params
    const userId = users.length + 1;
    users.push({ id: userId, ...user });
    await fs.writeFile("./src/data/users.json", JSON.stringify(users, null, 2)); //null 2 for proper spacing
    return userId;
}
async function main() {
    const transport = new stdio_1.StdioServerTransport();
    await server.connect(transport);
    console.log("Server is running...");
}
main();
