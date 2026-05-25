import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
import { ComfyClient } from "./comfy-client.js";
const comfyUrl = process.env.COMFYUI_URL || "http://127.0.0.1:8188";
const client = new ComfyClient(comfyUrl);
const server = new Server({
    name: "comfyui-mcp",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "list_workflows",
            description: "List all available workflow JSON files in the specified directory",
            inputSchema: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Directory path to search for workflow JSON files (default: ComfyUI default workflow directory)"
                    }
                }
            }
        },
        {
            name: "load_workflow",
            description: "Load a workflow JSON file and return its structure",
            inputSchema: {
                type: "object",
                properties: {
                    path: {
                        type: "string",
                        description: "Path to the workflow JSON file"
                    }
                }
            }
        },
        {
            name: "execute_workflow",
            description: "Execute a workflow via ComfyUI API with optional prompt inputs",
            inputSchema: {
                type: "object",
                properties: {
                    workflow: {
                        type: "object",
                        description: "The workflow JSON object to execute"
                    },
                    inputs: {
                        type: "object",
                        description: "Key-value pairs to inject into the prompt (e.g., { \"seed\": 42 })"
                    }
                }
            }
        },
        {
            name: "get_history",
            description: "Get execution history from ComfyUI",
            inputSchema: {
                type: "object",
                properties: {
                    node_id: {
                        type: "string",
                        description: "Specific node ID to get history for (optional)"
                    }
                }
            }
        },
        {
            name: "get_images",
            description: "Get output images from a completed workflow execution",
            inputSchema: {
                type: "object",
                properties: {
                    prompt_id: {
                        type: "string",
                        description: "The prompt ID returned from workflow execution"
                    }
                }
            }
        },
        {
            name: "view_image",
            description: "Get base64 encoded image data from a node output for evaluation",
            inputSchema: {
                type: "object",
                properties: {
                    filename: {
                        type: "string",
                        description: "The filename of the image"
                    },
                    subfolder: {
                        type: "string",
                        description: "The subfolder within ComfyUI output directory"
                    },
                    type: {
                        type: "string",
                        default: "output",
                        description: "Image type: output, temp, or input"
                    }
                }
            }
        },
        {
            name: "queue_prompt",
            description: "Directly queue a prompt ID for execution",
            inputSchema: {
                type: "object",
                properties: {
                    prompt_id: {
                        type: "string",
                        description: "The prompt ID to queue"
                    }
                }
            }
        },
        {
            name: "system_stats",
            description: "Get ComfyUI system statistics (VRAM, RAM usage)",
            inputSchema: {
                type: "object",
                properties: {}
            }
        },
        {
            name: "list_checkpoints",
            description: "List available Stable Diffusion checkpoints",
            inputSchema: {
                type: "object",
                properties: {}
            }
        }
    ]
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const argsObj = args;
    try {
        switch (name) {
            case "list_workflows": {
                const result = await client.listWorkflows(argsObj?.path);
                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            }
            case "load_workflow": {
                const result = await client.loadWorkflow(argsObj?.path);
                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            }
            case "execute_workflow": {
                const result = await client.executeWorkflow(argsObj?.workflow, argsObj?.inputs);
                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            }
            case "get_history": {
                const result = await client.getHistory(argsObj?.node_id);
                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            }
            case "get_images": {
                const result = await client.getImages(argsObj?.prompt_id);
                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            }
            case "view_image": {
                const result = await client.viewImage(argsObj?.filename, argsObj?.subfolder, argsObj?.type);
                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            }
            case "queue_prompt": {
                const result = await client.queuePrompt(argsObj?.prompt_id);
                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            }
            case "system_stats": {
                const result = await client.getSystemStats();
                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            }
            case "list_checkpoints": {
                const result = await client.listCheckpoints();
                return { content: [{ type: "text", text: JSON.stringify(result) }] };
            }
            default:
                return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
        }
    }
    catch (error) {
        return {
            content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }],
            isError: true
        };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("ComfyUI MCP server running");
}
main().catch(console.error);
