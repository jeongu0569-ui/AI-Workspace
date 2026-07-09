import { ChatBackend } from "./chat-backend.mjs";

export class RuntimeChatBackend extends ChatBackend {
  constructor(runtimeAdapter) {
    super();
    this.adapter = runtimeAdapter;
  }

  async connect() {
    await this.adapter.connect();
  }

  async createSession(params) {
    return await this.adapter.createSession(params);
  }

  async resumeSession(sessionId) {
    return await this.adapter.resumeSession(sessionId);
  }

  async submitPrompt(params) {
    if (params.wait) {
      const replyPromise = new Promise((resolve, reject) => {
        let answerText = "";
        const onEvent = (envelope) => {
          const type = envelope.type || "";
          const text = envelope.text || envelope.payload?.text || (typeof envelope.payload === "string" ? envelope.payload : "");

          if (type === "message.delta" || type === "assistant.delta" || type === "assistant.message.delta") {
            answerText += text;
          } else if (
            type === "message.done" ||
            type === "response.done" ||
            type === "turn.complete" ||
            type === "turn.completed" ||
            type === "message.completed"
          ) {
            cleanup();
            resolve({
              ok: true,
              sessionId: params.sessionId,
              reply: answerText
            });
          }
        };

        const onClose = () => {
          cleanup();
          reject(new Error("Live runtime connection closed prematurely."));
        };

        const onError = (err) => {
          cleanup();
          reject(err);
        };

        const cleanup = () => {
          this.adapter.off("event", onEvent);
          this.adapter.off("close", onClose);
          this.adapter.off("error", onError);
        };

        this.adapter.on("event", onEvent);
        this.adapter.on("close", onClose);
        this.adapter.on("error", onError);

        this.adapter.submitPrompt(params).catch((err) => {
          cleanup();
          reject(err);
        });
      });

      return await replyPromise;
    }

    return await this.adapter.submitPrompt(params);
  }

  async respondToApproval(params) {
    return await this.adapter.respondToApproval(params);
  }

  async setAccessMode(sessionId, accessMode) {
    await this.adapter.setAccessMode(sessionId, accessMode);
  }

  async setReasoning(sessionId, reasoningEffort) {
    await this.adapter.setReasoning(sessionId, reasoningEffort);
  }

  close() {
    this.adapter.close();
  }
}

export class ChatRuntime {
  constructor({ runtimeAdapter } = {}) {
    if (runtimeAdapter) {
      this.backend = new RuntimeChatBackend(runtimeAdapter);
    } else {
      this.backend = null;
    }
  }

  isAvailable() {
    return this.backend !== null;
  }

  async connect() {
    if (!this.backend) {
      throw Object.assign(
        new Error("Chat runtime is unavailable because no model execution backend is configured."),
        { status: 503 }
      );
    }
    await this.backend.connect();
  }

  async createSession(params) {
    if (!this.backend) {
      throw Object.assign(
        new Error("Chat runtime is unavailable because no model execution backend is configured."),
        { status: 503 }
      );
    }
    return await this.backend.createSession(params);
  }

  async resumeSession(sessionId) {
    if (!this.backend) {
      throw Object.assign(
        new Error("Chat runtime is unavailable because no model execution backend is configured."),
        { status: 503 }
      );
    }
    return await this.backend.resumeSession(sessionId);
  }

  async submitPrompt(params) {
    if (!this.backend) {
      throw Object.assign(
        new Error("Chat runtime is unavailable because no model execution backend is configured."),
        { status: 503 }
      );
    }
    return await this.backend.submitPrompt(params);
  }

  async respondToApproval(params) {
    if (!this.backend) {
      throw Object.assign(
        new Error("Chat runtime is unavailable because no model execution backend is configured."),
        { status: 503 }
      );
    }
    return await this.backend.respondToApproval(params);
  }

  async setAccessMode(sessionId, accessMode) {
    if (!this.backend) return;
    await this.backend.setAccessMode(sessionId, accessMode);
  }

  async setReasoning(sessionId, reasoningEffort) {
    if (!this.backend) return;
    await this.backend.setReasoning(sessionId, reasoningEffort);
  }

  close() {
    if (this.backend) this.backend.close();
  }
}
