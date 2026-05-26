import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import FormData from "form-data";
export class ComfyClient {
    url;
    api;
    constructor(url = "http://127.0.0.1:8188") {
        this.url = url;
        this.api = axios.create({ baseURL: url });
    }
    async getHistory(node_id) {
        const endpoint = node_id ? `/history/${node_id}` : "/history";
        const response = await this.api.get(endpoint);
        return response.data;
    }
    async getImages(prompt_id) {
        const history = await this.getHistory();
        const promptHistory = history[prompt_id];
        if (!promptHistory) {
            return { images: [] };
        }
        const images = [];
        for (const node of promptHistory) {
            if (node.type === "save_image" && node.images) {
                const nodeImages = node.images;
                for (const img of nodeImages) {
                    images.push({ ...img, node_id: String(node.id) });
                }
            }
        }
        return { images };
    }
    async viewImage(filename, subfolder = "", type = "output") {
        const response = await this.api.get(`/view`, {
            params: { filename, subfolder, type },
            responseType: "text",
        });
        return response.data;
    }
    async queuePrompt(prompt_id) {
        const response = await this.api.post("/queue", { prompt_id });
        return response.data;
    }
    async getSystemStats() {
        const response = await this.api.get("/system_stats");
        return response.data;
    }
    async listCheckpoints() {
        const response = await this.api.get("/models");
        const models = response.data;
        return models.filter((m) => m.model_type === "checkpoints").map((m) => m.name);
    }
    async listModels(modelType) {
        const response = await this.api.get("/models");
        const models = response.data;
        if (modelType) {
            return models.filter((m) => m.model_type === modelType).map((m) => m.name);
        }
        return models.map((m) => m.name);
    }
    async listUnets() {
        const response = await this.api.get("/models");
        const models = response.data;
        return models.filter((m) => m.model_type === "unet").map((m) => m.name);
    }
    async listClips() {
        const response = await this.api.get("/models");
        const models = response.data;
        return models.filter((m) => m.model_type === "clip").map((m) => m.name);
    }
    async listVaes() {
        const response = await this.api.get("/models");
        const models = response.data;
        return models.filter((m) => m.model_type === "vae").map((m) => m.name);
    }
    async listLoras() {
        const response = await this.api.get("/models");
        const models = response.data;
        return models.filter((m) => m.model_type === "loras").map((m) => m.name);
    }
    async listControlnets() {
        const response = await this.api.get("/models");
        const models = response.data;
        return models.filter((m) => m.model_type === "controlnet").map((m) => m.name);
    }
    async listUpscaleModels() {
        const response = await this.api.get("/models");
        const models = response.data;
        return models.filter((m) => m.model_type === "upscale_models").map((m) => m.name);
    }
    async getProgress() {
        const response = await this.api.get("/progress");
        return response.data;
    }
    async getExecutionStatus(prompt_id) {
        const history = await this.getHistory(prompt_id);
        const promptData = history[prompt_id];
        if (!promptData) {
            return { status: "not_found", completed: false };
        }
        const statusStr = promptData.status?.status_str || "unknown";
        return { status: statusStr, completed: statusStr === "success" };
    }
    async getQueue() {
        const response = await this.api.get("/queue");
        return response.data;
    }
    async clearQueue() {
        try {
            await this.api.post("/queue/clear");
            return { cleared: true };
        }
        catch (error) {
            return { cleared: false, error: "Queue clear not supported by this ComfyUI instance" };
        }
    }
    async cancelPrompt(prompt_id) {
        try {
            await this.api.post("/cancel", { prompt_id });
            return { cancelled: true };
        }
        catch (error) {
            return { cancelled: false, error: "Prompt cancellation not supported by this ComfyUI instance" };
        }
    }
    async uploadImage(filePath, overwrite = false) {
        const formData = new FormData();
        const fileStream = fs.createReadStream(filePath);
        const fileName = path.basename(filePath);
        formData.append("image", fileStream, fileName);
        formData.append("overwrite", String(overwrite));
        const response = await this.api.post("/upload/image", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        return response.data;
    }
    getImagePath(filename, subfolder = "", type = "output") {
        const folderMap = {
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
    async getMultipleImages(prompt_ids) {
        const results = {};
        for (const promptId of prompt_ids) {
            const images = await this.getImages(promptId);
            results[promptId] = images.images;
        }
        return results;
    }
    resolvePrompt(workflow, inputs) {
        const resolvedPrompt = {};
        const extraData = {};
        for (const [key, value] of Object.entries(workflow)) {
            if (typeof value === "object" && value !== null && !Array.isArray(value)) {
                const obj = value;
                if (obj.inputs) {
                    const resolvedInputs = {};
                    for (const [inputKey, inputValue] of Object.entries(obj.inputs)) {
                        if (typeof inputValue === "string" && inputValue.startsWith("${") && inputValue.endsWith("}")) {
                            const inputName = inputValue.slice(2, -1);
                            resolvedInputs[inputKey] = inputs?.[inputName] ?? inputValue;
                        }
                        else {
                            resolvedInputs[inputKey] = inputValue;
                        }
                    }
                    resolvedPrompt[key] = { ...obj, inputs: resolvedInputs };
                }
                else {
                    resolvedPrompt[key] = value;
                }
            }
            else {
                resolvedPrompt[key] = value;
            }
        }
        return { resolvedPrompt, extraData };
    }
    async executeWorkflow(workflow, inputs) {
        const { resolvedPrompt, extraData } = this.resolvePrompt(workflow, inputs);
        const response = await this.api.post("/prompt", {
            prompt: resolvedPrompt,
            extra_data: extraData,
        });
        return response.data;
    }
    async listWorkflows(dirPath) {
        const defaultPath = dirPath || path.join(process.env.USERPROFILE || "", "Documents", "ComfyUI", "user", "default", "workflows");
        if (!fs.existsSync(defaultPath)) {
            return [];
        }
        return fs.readdirSync(defaultPath)
            .filter((f) => f.endsWith(".json"))
            .map((f) => path.join(defaultPath, f));
    }
    async loadWorkflow(filePath) {
        const content = fs.readFileSync(filePath, "utf-8");
        return JSON.parse(content);
    }
}
