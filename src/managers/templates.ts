import type { RequestListener } from "@webtools/expressapi";
import type { Render } from "../core/compiler.tsx";

import type { VNode } from "preact";
import * as path from "@std/path";
import * as fs from "@std/fs";

import { envToDefine, loadModuleWithDefine, SUPPORTED_EXTENSIONS } from "../utils/loader.ts";

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
	private readonly templates: Template[] = [];
	private readonly define: Record<string, string>;

	constructor(env: Record<string, string> = {}) {
		this.define = envToDefine(env);
	}

	public async load(workspace: string): Promise<void> {
		const templatesDir = path.join(workspace, "templates");
		const entries = [...fs.walkSync(templatesDir, { includeDirs: false })]
			.filter((e) => SUPPORTED_EXTENSIONS.has(path.extname(e.name)));

		await Promise.all(entries.map(async (walkEntry) => {
			const mod = await loadModuleWithDefine<{ default: Template }>(workspace, walkEntry.path, this.define);
			this.templates.push(mod.default);
		}));
	}

	public findTemplate(name: string): Template | null {
		return this.templates.find((template) => template.name === name) || null;
	}

	public getTemplates(): Template[] {
		return this.templates;
	}
}
