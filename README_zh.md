# ComfyUI MCP

ComfyUI 的 MCP 服务器 - 构建、执行工作流并评估输出。

## 安装

1. 安装依赖并构建：
```bash
npm install --ignore-scripts
npm run build
```

2. 配置 Claude Code (settings.json)：
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

3. 确保 ComfyUI 已在 COMFYUI_URL（默认：http://127.0.0.1:8188）运行

## 工具

### 工作流管理

| 工具 | 描述 |
|------|------|
| `list_workflows` | 列出用户工作流目录中的工作流 JSON 文件 |
| `load_workflow` | 加载工作流 JSON 文件并返回其结构 |
| `execute_workflow` | 通过 ComfyUI API 执行工作流，支持可选的 prompt 输入 |

### 模型列表

| 工具 | 描述 |
|------|------|
| `list_models` | 列出所有可用模型，可按类型过滤 |
| `list_unets` | 列出用于图像生成的 UNet 模型 |
| `list_clips` | 列出用于文本编码的 CLIP 模型 |
| `list_vaes` | 列出用于图像编码/解码的 VAE 模型 |
| `list_loras` | 列出用于风格修改的 LoRA 模型 |
| `list_controlnets` | 列出用于条件控制的 ControlNet 模型 |
| `list_upscale_models` | 列出用于图像放大的超分辨率模型 |
| `list_checkpoints` | 列出可用的 Stable Diffusion 检查点 |

### 图像处理

| 工具 | 描述 |
|------|------|
| `upload_image` | 将图像文件上传到 ComfyUI input 目录用于工作流 |
| `get_image_path` | 获取 ComfyUI 中图像的文件路径和下载 URL |
| `get_images` | 从已完成的工作流执行中获取输出图像 |
| `get_multiple_images` | 批量获取多个工作流执行的图像 |
| `view_image` | 获取节点输出的 base64 编码图像数据用于评估 |

### 执行控制

| 工具 | 描述 |
|------|------|
| `get_progress` | 获取当前工作流执行进度 |
| `get_execution_status` | 检查特定 prompt 的执行状态 |
| `get_queue` | 获取当前队列状态，显示运行中和待执行的任务 |
| `clear_queue` | 清空队列中所有待执行的任务 |
| `cancel_prompt` | 取消正在运行的工作流执行 |
| `queue_prompt` | 直接将 prompt ID 加入队列执行 |

### 系统

| 工具 | 描述 |
|------|------|
| `get_history` | 获取 ComfyUI 的执行历史 |
| `system_stats` | 获取 ComfyUI 系统统计信息（VRAM、RAM 使用情况） |

## 示例

向工作流注入变量：
```
execute_workflow with inputs: { "seed": 42, "prompt": "a cat" }
```

## 工作流验证

此 MCP 服务器已通过以下工作流验证：

| 工作流 | 功能 | 输出 |
|--------|------|------|
| `text_to_img.json` | Z-Image-Turbo 文生图 | PNG 图片 |
| `img_to_model.json` | Hunyuan3D 图片转3D | GLB 3D 模型 |
| `text_to_audio.json` | Stable Audio 3 文生音频 | MP3 音频 |
| `fin_turing_img.json` | FireRed 图片编辑 | PNG 图片 |

所有工作流均已在 ComfyUI 0.22.2 上测试验证通过。