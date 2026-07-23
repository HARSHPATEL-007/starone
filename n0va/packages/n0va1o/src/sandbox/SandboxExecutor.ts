import { nanoid } from "nanoid";

interface SandboxConfig {
  cpuLimit: number;
  memoryLimitMB: number;
  timeoutMs: number;
  networkIsolation: boolean;
}

interface SandboxResult {
  success: boolean;
  output: unknown;
  executionTimeMs: number;
  sandboxId: string;
  error?: string;
}

interface SandboxFile {
  path: string;
  content: string | Buffer;
  encoding?: "utf-8" | "base64";
}

export class SandboxExecutor {
  private activeSandboxes = new Map<string, { createdAt: Date; config: SandboxConfig }>();
  private defaultConfig: SandboxConfig = {
    cpuLimit: 1,
    memoryLimitMB: 128,
    timeoutMs: 30000,
    networkIsolation: true,
  };

  async executeScript(
    script: string,
    files: SandboxFile[] = [],
    config: Partial<SandboxConfig> = {}
  ): Promise<SandboxResult> {
    const mergedConfig = { ...this.defaultConfig, ...config };
    const sandboxId = `sbx_${nanoid(16)}`;
    const startTime = Date.now();

    this.activeSandboxes.set(sandboxId, { createdAt: new Date(), config: mergedConfig });

    try {
      const wrappedScript = `
        const sandboxFiles = ${JSON.stringify(files.map((f) => ({ path: f.path, encoding: f.encoding || "utf-8" })))};
        const sandboxContext = { files: sandboxFiles, sandboxId: "${sandboxId}" };
        (async () => {
          ${script}
        })()
      `;

      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
      const fn = new AsyncFunction("context", wrappedScript);
      const output = await Promise.race([
        fn({ files, sandboxId }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Sandbox execution timed out")), mergedConfig.timeoutMs)
        ),
      ]);

      return {
        success: true,
        output,
        executionTimeMs: Date.now() - startTime,
        sandboxId,
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        executionTimeMs: Date.now() - startTime,
        sandboxId,
        error: error instanceof Error ? error.message : "Sandbox execution failed",
      };
    } finally {
      this.activeSandboxes.delete(sandboxId);
    }
  }

  async executePythonScript(
    script: string,
    files: SandboxFile[] = []
  ): Promise<SandboxResult> {
    const startTime = Date.now();
    const sandboxId = `sbx_py_${nanoid(16)}`;

    try {
      const { execSync } = require("child_process");
      const fs = require("fs");
      const path = require("path");
      const tmpDir = path.join(require("os").tmpdir(), sandboxId);
      fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, "script.py"), script);
      for (const f of files) {
        const filePath = path.join(tmpDir, f.path);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, f.content);
      }
      const output = execSync(`python3 ${path.join(tmpDir, "script.py")}`, {
        timeout: 30000,
        maxBuffer: 10 * 1024 * 1024,
        cwd: tmpDir,
      });
      fs.rmSync(tmpDir, { recursive: true, force: true });

      return {
        success: true,
        output: output.toString(),
        executionTimeMs: Date.now() - startTime,
        sandboxId,
      };
    } catch (error) {
      return {
        success: false,
        output: null,
        executionTimeMs: Date.now() - startTime,
        sandboxId,
        error: error instanceof Error ? error.message : "Python execution failed",
      };
    }
  }

  getActiveSandboxCount(): number {
    return this.activeSandboxes.size;
  }

  terminateSandbox(sandboxId: string): boolean {
    return this.activeSandboxes.delete(sandboxId);
  }

  getHealth(): { activeSandboxes: number; defaultConfig: SandboxConfig } {
    return {
      activeSandboxes: this.activeSandboxes.size,
      defaultConfig: this.defaultConfig,
    };
  }
}
