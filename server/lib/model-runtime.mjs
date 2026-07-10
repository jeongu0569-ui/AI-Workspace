import { listRuntimeModels } from "./runtime/config-store.mjs";

export class ModelRuntime {
  constructor({ workspaceRoot } = {}) {
    this.workspaceRoot = workspaceRoot;
  }

  async listModels() {
    const models = this.workspaceRoot ? await listRuntimeModels(this.workspaceRoot) : [];

    return {
      runtime: "model-runtime",
      source: "codmes",
      providers: [],
      models
    };
  }
}
