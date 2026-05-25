import axios from "axios";
import * as fs from "fs";
import * as path from "path";
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
        const defaultPath = dirPath || path.join(process.env.APPDATA || "", "ComfyUI", "workflows");
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
