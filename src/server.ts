import { McpServer } from "@modelcontextprotocol/server";
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

server.registerTool(
  "create-user",
  {
    description: "Create a new user in the database",
    inputSchema: z.object({
      name: z.string().describe("The name of the user"),
      email: z.string().email().describe("The email of the user"),
      address: z.string().describe("The address of the user"),
      phone: z.string().describe("The phone number of the user"),
    }),
  },
  async ({
    name,
    email,
    address,
    phone,
  }: {
    name: string;
    email: string;
    address: string;
    phone: string;
  }) => {
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
    } catch (error: any) {
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
  },
);

async function createUser(user: {
  name: string;
  email: string;
  address: string;
  phone: string;
}) {
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
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.log("Server is running...");
}

main();
