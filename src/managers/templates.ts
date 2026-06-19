import type { RequestListener } from "@webtools/expressapi";
import type { Render } from "../core/compiler.tsx";

import type { VNode } from "preact";
import * as path from "@std/path";
import * as fs from "@std/fs";

import { envToDefine, invalidateModuleCache, loadModuleWithDefine, SUPPORTED_EXTENSIONS } from "../utils/loader.ts";
import { watchDirectory } from "../utils/watch.ts";
import type { Config } from "../core/server.ts";

export interface Template {
	readonly name: string;
	readonly favicon: Render<string> | null;

	readonly styles: string[];
	readonly scripts: string[];

	readonly head: Render<VNode> | null;
	readonly body: Render<VNode> | null;

	readonly onrequest: RequestListener | null;
}

export class TemplatesManager {
	private readonly templatesDir: string;
	private readonly define: Record<string, string>;
	private readonly hotReload: boolean;
	private readonly templates = new Map<string, Template>();

	constructor(private readonly workspace: string, config: Config) {
		this.templatesDir = path.join(this.workspace, "templates");
		this.define = envToDefine(config.env);
		this.hotReload = config.hotReload;
	}

	public async load(): Promise<void> {
		const entries = [...fs.walkSync(this.templatesDir, { includeDirs: false })]
			.filter((e) => SUPPORTED_EXTENSIONS.has(path.extname(e.name)));

		await Promise.all(entries.map((e) => this.loadFile(e.path)));
		if (this.hotReload) watchDirectory(this.templatesDir, (filePath) => this.loadFile(filePath));
	}

	private async loadFile(filePath: string): Promise<void> {
		invalidateModuleCache(filePath);

		const mod = await loadModuleWithDefine<{ default: Template }>(this.workspace, filePath, this.define);
		this.templates.set(mod.default.name, mod.default);
	}

	public findTemplate(name: string): Template | undefined {
		return this.templates.get(name);
	}
}
