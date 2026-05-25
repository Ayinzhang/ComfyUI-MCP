import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { ComfyClient } from "./comfy-client.js";

const comfyUrl = process.env.COMFYUI_URL || "http://127.0.0.1:8188";
const client = new ComfyClient(comfyUrl);

const server = new Server(
  {
    name: "comfyui-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

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
    },
    {
      name: "list_models",
      description: "List all available models, optionally filtered by type",
      inputSchema: {
        type: "object",
        properties: {
          model_type: {
            type: "string",
            description: "Filter by model type: checkpoints, unet, clip, vae, loras, controlnet, upscale_models (optional)"
          }
        }
      }
    },
    {
      name: "list_unets",
      description: "List available UNet models for image generation",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "list_clips",
      description: "List available CLIP models for text encoding",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "list_vaes",
      description: "List available VAE models for image encoding/decoding",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "list_loras",
      description: "List available LoRA models for style modification",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "list_controlnets",
      description: "List available ControlNet models for conditioning control",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "list_upscale_models",
      description: "List available upscaler models for image enlargement",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "get_progress",
      description: "Get current workflow execution progress",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "get_execution_status",
      description: "Check the execution status of a specific prompt",
      inputSchema: {
        type: "object",
        properties: {
          prompt_id: { type: "string", description: "The prompt ID to check status for" }
        },
        required: ["prompt_id"]
      }
    },
    {
      name: "get_queue",
      description: "Get current queue status showing running and pending prompts",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "clear_queue",
      description: "Clear all pending prompts from the queue",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "cancel_prompt",
      description: "Cancel a running workflow execution",
      inputSchema: {
        type: "object",
        properties: {
          prompt_id: { type: "string", description: "The prompt ID to cancel" }
        },
        required: ["prompt_id"]
      }
    },
    {
      name: "upload_image",
      description: "Upload an image file to ComfyUI input directory for use in workflows",
      inputSchema: {
        type: "object",
        properties: {
          file_path: { type: "string", description: "Absolute path to the image file to upload" },
          overwrite: { type: "boolean", default: false, description: "Whether to overwrite existing file" }
        },
        required: ["file_path"]
      }
    },
    {
      name: "get_image_path",
      description: "Get the file path and download URL for an image in ComfyUI",
      inputSchema: {
        type: "object",
        properties: {
          filename: { type: "string", description: "The filename of the image" },
          subfolder: { type: "string", default: "", description: "The subfolder within the image type directory" },
          type: { type: "string", default: "output", description: "Image type: output, temp, or input" }
        },
        required: ["filename"]
      }
    },
    {
      name: "get_multiple_images",
      description: "Get images from multiple workflow executions at once",
      inputSchema: {
        type: "object",
        properties: {
          prompt_ids: { type: "array", items: { type: "string" }, description: "Array of prompt IDs to retrieve images from" }
        },
        required: ["prompt_ids"]
      }
    }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const argsObj = args as Record<string, unknown> | undefined;

  try {
    switch (name) {
      case "list_workflows": {
        const result = await client.listWorkflows(argsObj?.path as string | undefined);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "load_workflow": {
        const result = await client.loadWorkflow(argsObj?.path as string);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "execute_workflow": {
        const result = await client.executeWorkflow(argsObj?.workflow as Record<string, unknown>, argsObj?.inputs as Record<string, unknown> | undefined);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "get_history": {
        const result = await client.getHistory(argsObj?.node_id as string | undefined);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "get_images": {
        const result = await client.getImages(argsObj?.prompt_id as string);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "view_image": {
        const result = await client.viewImage(argsObj?.filename as string, argsObj?.subfolder as string, argsObj?.type as string);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "queue_prompt": {
        const result = await client.queuePrompt(argsObj?.prompt_id as string);
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
      case "list_models": {
        const result = await client.listModels(argsObj?.model_type as string | undefined);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "list_unets": {
        const result = await client.listUnets();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "list_clips": {
        const result = await client.listClips();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "list_vaes": {
        const result = await client.listVaes();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "list_loras": {
        const result = await client.listLoras();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "list_controlnets": {
        const result = await client.listControlnets();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "list_upscale_models": {
        const result = await client.listUpscaleModels();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "get_progress": {
        const result = await client.getProgress();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "get_execution_status": {
        const result = await client.getExecutionStatus(argsObj?.prompt_id as string);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "get_queue": {
        const result = await client.getQueue();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "clear_queue": {
        const result = await client.clearQueue();
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "cancel_prompt": {
        const result = await client.cancelPrompt(argsObj?.prompt_id as string);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "upload_image": {
        const result = await client.uploadImage(argsObj?.file_path as string, argsObj?.overwrite as boolean);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "get_image_path": {
        const result = client.getImagePath(argsObj?.filename as string, argsObj?.subfolder as string, argsObj?.type as string);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      case "get_multiple_images": {
        const result = await client.getMultipleImages(argsObj?.prompt_ids as string[]);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      }
      default:
        return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
    }
  } catch (error) {
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