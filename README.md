# ComfyUI MCP

MCP server for ComfyUI - build, execute workflows and evaluate outputs.

## Setup

1. Install dependencies and build:
```bash
npm install --ignore-scripts
npm run build
```

2. Configure Claude Code (settings.json):
```json
{
  "mcpServers": {
    "comfyui": {
      "command": "node",
      "args": ["C:/ComfyUI-MCP/dist/index.js"],
      "env": {
        "COMFYUI_URL": "http://127.0.0.1:8188"
      }
    }
  }
}
```

3. Ensure ComfyUI is running at COMFYUI_URL (default: http://127.0.0.1:8188)

## Tools

### Workflow Management

| Tool | Description |
|------|-------------|
| `list_workflows` | List workflow JSON files in the user workflow directory |
| `load_workflow` | Load a workflow JSON file and return its structure |
| `execute_workflow` | Execute a workflow via ComfyUI API with optional prompt inputs |

### Model Listing

| Tool | Description |
|------|-------------|
| `list_models` | List all available models, optionally filtered by type |
| `list_unets` | List available UNet models for image generation |
| `list_clips` | List available CLIP models for text encoding |
| `list_vaes` | List available VAE models for image encoding/decoding |
| `list_loras` | List available LoRA models for style modification |
| `list_controlnets` | List available ControlNet models for conditioning control |
| `list_upscale_models` | List available upscaler models for image enlargement |
| `list_checkpoints` | List available Stable Diffusion checkpoints |

### Image Processing

| Tool | Description |
|------|-------------|
| `upload_image` | Upload an image file to ComfyUI input directory for use in workflows |
| `get_image_path` | Get the file path and download URL for an image in ComfyUI |
| `get_images` | Get output images from a completed workflow execution |
| `get_multiple_images` | Get images from multiple workflow executions at once |
| `view_image` | Get base64 encoded image data from a node output for evaluation |

### Execution Control

| Tool | Description |
|------|-------------|
| `get_progress` | Get current workflow execution progress |
| `get_execution_status` | Check the execution status of a specific prompt |
| `get_queue` | Get current queue status showing running and pending prompts |
| `clear_queue` | Clear all pending prompts from the queue |
| `cancel_prompt` | Cancel a running workflow execution |
| `queue_prompt` | Directly queue a prompt ID for execution |

### System

| Tool | Description |
|------|-------------|
| `get_history` | Get execution history from ComfyUI |
| `system_stats` | Get ComfyUI system statistics (VRAM, RAM usage) |

## Example

Inject variables into workflow:
```
execute_workflow with inputs: { "seed": 42, "prompt": "a cat" }
```

## Your Workflows

This MCP server has been verified with the following workflows:

| Workflow | Function | Output |
|----------|----------|--------|
| `text_to_img.json` | Z-Image-Turbo Text-to-Image | PNG image |
| `img_to_model.json` | Hunyuan3D Image-to-3D | GLB 3D model |
| `text_to_audio.json` | Stable Audio 3 Text-to-Audio | MP3 audio |
| `fin_turing_img.json` | FireRed Image Edit | PNG image |

All workflows have been tested and verified working with ComfyUI 0.22.2.