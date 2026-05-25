import axios, { AxiosInstance } from "axios";
import * as fs from "fs";
import * as path from "path";
import { FormData } from "form-data";

interface PromptInputs {
  [key: string]: unknown;
}

interface WorkflowNode {
  class_type: string;
  inputs: Record<string, unknown>;
}

interface Workflow {
  [key: string]: unknown;
}

export class ComfyClient {
  private url: string;
  private api: AxiosInstance;

  constructor(url: string = "http://127.0.0.1:8188") {
    this.url = url;
    this.api = axios.create({ baseURL: url });
  }

  async getHistory(node_id?: string): Promise<Record<string, unknown>> {
    const endpoint = node_id ? `/history/${node_id}` : "/history";
    const response = await this.api.get(endpoint);
    return response.data;
  }

  async getImages(prompt_id: string): Promise<{ images: Array<{ node_id: string; filename: string; subfolder: string; type: string }> }> {
    const history = await this.getHistory();
    const promptHistory = history[prompt_id] as Array<Record<string, unknown>> | undefined;
    if (!promptHistory) {
      return { images: [] };
    }

    const images: Array<{ node_id: string; filename: string; subfolder: string; type: string }> = [];
    for (const node of promptHistory) {
      if (node.type === "save_image" && node.images) {
        const nodeImages = node.images as Array<{ filename: string; subfolder: string; type: string }>;
        for (const img of nodeImages) {
          images.push({ ...img, node_id: String(node.id) });
        }
      }
    }
    return { images };
  }

  async viewImage(filename: string, subfolder: string = "", type: string = "output"): Promise<string> {
    const response = await this.api.get(`/view`, {
      params: { filename, subfolder, type },
      responseType: "text",
    });
    return response.data;
  }

  async queuePrompt(prompt_id: string): Promise<unknown> {
    const response = await this.api.post("/queue", { prompt_id });
    return response.data;
  }

  async getSystemStats(): Promise<unknown> {
    const response = await this.api.get("/system_stats");
    return response.data;
  }

  async listCheckpoints(): Promise<string[]> {
    const response = await this.api.get("/models");
    const models = response.data as Array<{ name: string; model_type: string }>;
    return models.filter((m) => m.model_type === "checkpoints").map((m) => m.name);
  }

  async listModels(modelType?: string): Promise<string[]> {
    const response = await this.api.get("/models");
    const models = response.data as Array<{ name: string; model_type: string }>;
    if (modelType) {
      return models.filter((m) => m.model_type === modelType).map((m) => m.name);
    }
    return models.map((m) => m.name);
  }

  async listUnets(): Promise<string[]> {
    const response = await this.api.get("/models");
    const models = response.data as Array<{ name: string; model_type: string }>;
    return models.filter((m) => m.model_type === "unet").map((m) => m.name);
  }

  async listClips(): Promise<string[]> {
    const response = await this.api.get("/models");
    const models = response.data as Array<{ name: string; model_type: string }>;
    return models.filter((m) => m.model_type === "clip").map((m) => m.name);
  }

  async listVaes(): Promise<string[]> {
    const response = await this.api.get("/models");
    const models = response.data as Array<{ name: string; model_type: string }>;
    return models.filter((m) => m.model_type === "vae").map((m) => m.name);
  }

  async listLoras(): Promise<string[]> {
    const response = await this.api.get("/models");
    const models = response.data as Array<{ name: string; model_type: string }>;
    return models.filter((m) => m.model_type === "loras").map((m) => m.name);
  }

  async listControlnets(): Promise<string[]> {
    const response = await this.api.get("/models");
    const models = response.data as Array<{ name: string; model_type: string }>;
    return models.filter((m) => m.model_type === "controlnet").map((m) => m.name);
  }

  async listUpscaleModels(): Promise<string[]> {
    const response = await this.api.get("/models");
    const models = response.data as Array<{ name: string; model_type: string }>;
    return models.filter((m) => m.model_type === "upscale_models").map((m) => m.name);
  }

  async getProgress(): Promise<{ current_step: number; total_steps: number; percentage: number }> {
    const response = await this.api.get("/progress");
    return response.data;
  }

  async getExecutionStatus(prompt_id: string): Promise<{ status: string; completed: boolean }> {
    const history = await this.getHistory(prompt_id);
    const promptData = history[prompt_id] as Record<string, unknown> | undefined;
    if (!promptData) {
      return { status: "not_found", completed: false };
    }
    const statusStr = (promptData.status as Record<string, unknown>)?.status_str as string || "unknown";
    return { status: statusStr, completed: statusStr === "success" };
  }

  async getQueue(): Promise<{ queue_running: Array<Record<string, unknown>>; queue_pending: Array<Record<string, unknown>> }> {
    const response = await this.api.get("/queue");
    return response.data;
  }

  async clearQueue(): Promise<{ cleared: boolean; error?: string }> {
    try {
      await this.api.post("/queue/clear");
      return { cleared: true };
    } catch (error) {
      return { cleared: false, error: "Queue clear not supported by this ComfyUI instance" };
    }
  }

  async cancelPrompt(prompt_id: string): Promise<{ cancelled: boolean; error?: string }> {
    try {
      await this.api.post("/cancel", { prompt_id });
      return { cancelled: true };
    } catch (error) {
      return { cancelled: false, error: "Prompt cancellation not supported by this ComfyUI instance" };
    }
  }

  async uploadImage(filePath: string, overwrite: boolean = false): Promise<{ name: string; type: string }> {
    const formData = new FormData();
    const fileStream = fs.createReadStream(filePath);
    const fileName = path.basename(filePath);
    formData.append("image", fileStream as unknown as Blob, fileName);
    formData.append("overwrite", String(overwrite));
    const response = await this.api.post("/upload/image", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  getImagePath(filename: string, subfolder: string = "", type: string = "output"): { path: string; url: string } {
    const folderMap: Record<string, string> = {
      output: "output",
      temp: "temp",
      input: "input",
    };
    const folder = folderMap[type] || "output";
    const basePath = process.env.USERPROFILE || process.env.APPDATA || "";
    const fullPath = path.join(basePath, "Documents", "ComfyUI", folder, filename);
    const url = `${this.url}/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder)}&type=${type}`;
    return { path: fullPath, url };
  }

  async getMultipleImages(prompt_ids: string[]): Promise<Record<string, Array<{ node_id: string; filename: string; subfolder: string; type: string }>>> {
    const results: Record<string, Array<{ node_id: string; filename: string; subfolder: string; type: string }>> = {};
    for (const promptId of prompt_ids) {
      const images = await this.getImages(promptId);
      results[promptId] = images.images;
    }
    return results;
  }

  resolvePrompt(workflow: Workflow, inputs?: PromptInputs): { resolvedPrompt: Workflow; extraData: Record<string, unknown> } {
    const resolvedPrompt: Workflow = {};
    const extraData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(workflow)) {
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        const obj = value as WorkflowNode;
        if (obj.inputs) {
          const resolvedInputs: Record<string, unknown> = {};
          for (const [inputKey, inputValue] of Object.entries(obj.inputs)) {
            if (typeof inputValue === "string" && inputValue.startsWith("${") && inputValue.endsWith("}")) {
              const inputName = inputValue.slice(2, -1);
              resolvedInputs[inputKey] = inputs?.[inputName] ?? inputValue;
            } else {
              resolvedInputs[inputKey] = inputValue;
            }
          }
          resolvedPrompt[key] = { ...obj, inputs: resolvedInputs };
        } else {
          resolvedPrompt[key] = value;
        }
      } else {
        resolvedPrompt[key] = value;
      }
    }

    return { resolvedPrompt, extraData };
  }

  async executeWorkflow(workflow: Workflow, inputs?: PromptInputs): Promise<{ prompt_id: string; number: number }> {
    const { resolvedPrompt, extraData } = this.resolvePrompt(workflow, inputs);

    const response = await this.api.post("/prompt", {
      prompt: resolvedPrompt,
      extra_data: extraData,
    });

    return response.data;
  }

  async listWorkflows(dirPath?: string): Promise<string[]> {
    const defaultPath = dirPath || path.join(process.env.USERPROFILE || "", "Documents", "ComfyUI", "user", "default", "workflows");
    if (!fs.existsSync(defaultPath)) {
      return [];
    }
    return fs.readdirSync(defaultPath)
      .filter((f) => f.endsWith(".json"))
      .map((f) => path.join(defaultPath, f));
  }

  async loadWorkflow(filePath: string): Promise<Workflow> {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content);
  }
}