#!/usr/bin/env node

/**
 * This is a template MCP server that implements a simple notes system.
 * It demonstrates core MCP concepts like resources and tools by allowing:
 * - Listing notes as resources
 * - Reading individual notes
 * - Creating new notes via a tool
 * - Summarizing all notes via a prompt
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ExpressClient } from './express.js';

/**
 * Create an MCP server with capabilities for resources (to list/read notes),
 * tools (to create new notes), and prompts (to summarize notes).
 */
const server = new Server(
  {
    name: "mcp-server-express",
    version: "0.1.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);


/**
 * Handler that lists available tools.
 * Exposes a single "create_note" tool that lets clients create new notes.
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query_express",
        description: "实时查询快递物流信息",
        inputSchema: {
          type: "object",
          properties: {
            com: {
              type: "string",
              description: "快递公司名称或快递编码",
            },
            num: {
              type: "string",
              description: "快递单号",
            }
          },
          required: ["com", "num"]
        }
      },
      {
        name: "compare_price",
        description: "查询多个快递公司快递价格",
        inputSchema: {
          type: "object",
          properties: {
            weight: {
              type: "number",
              description: "重量",
            },
            length: {
              type: "number",
              description: "长度",
            },
            width: {
              type: "number",
              description: "宽度",
            },
            height: {
              type: "number",
              description: "高度",
            },
            from: {
              type: "string",
              description: "出发地",
            },
            to: {
              type: "string",
              description: "目的地",
            }
          },
          required: ["from", "to"]
        }
      }
    ]
  };
});

/**
 * Parse command line arguments
 * Example: node index.js --auth_key=123
 */
function parseArgs() {
  const args: Record<string, string> = {};
    process.argv.slice(2).forEach((arg) => {
      if (arg.startsWith("--")) {
        const [key, value] = arg.slice(2).split("=");
        args[key] = value;
      }
    });
  return args;
  }
  
  const args = parseArgs();
  const auth_key = args.auth_key || "";
  const customer = args.customer || "";

/**
 * Handler for the create_note tool.
 * Creates a new note with the provided title and content, and returns success message.
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "query_express": {
      const com = String(request.params.arguments?.com);
      const num = String(request.params.arguments?.num);
      if (!com) {
        throw new Error("请输入快递公司名称或编码");
      }
      if (!num) {
        throw new Error("请输入快递单号");
      }
      
      const client = new ExpressClient(customer, auth_key);

    // 查询快递
    const result = await client.query({
      com: com,          // 快递公司编码
      num: num,          // 快递单号
      phone: '',     // 手机号码
      from: '',          // 出发地
      to: '',           // 目的地
      resultv2: '',            // 开启高级物流状态
      show: '0',                // 返回JSON格式
      order: 'desc'             // 降序排列
    });

      return {
        content: [{
          type: "text",
          text: `实时查询快递成功： ${JSON.stringify(result)}`
        }]
      };
    }

    case "compare_price": {
      const weight = Number(request.params.arguments?.weight) || 1;
      const length = Number(request.params.arguments?.length);
      const width = Number(request.params.arguments?.width);
      const height = Number(request.params.arguments?.height);
      const from = String(request.params.arguments?.from);
      const to = String(request.params.arguments?.to);
      if (!from) {
        throw new Error("请输入出发地");
      }
      if (!to) {
        throw new Error("请输入目的地");
      }
      
      const client = new ExpressClient(customer, auth_key);
      const results = await client.comparePrice({
        weight,
        length,
        width,
        height,
        from,
        to
      });
      
      return {
        content: [{
          type: "text",
          text: `快递价格比对结果：${JSON.stringify(results, null, 2)}`
        }]
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

/**
 * Start the server using stdio transport.
 * This allows the server to communicate via standard input/output streams.
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
