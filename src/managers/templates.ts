import type { RequestListener } from "@webtools/expressapi";
import type { Render } from "../core/compiler.tsx";

import * as path from "@std/path";
import * as fs from "@std/fs";

export interface Template {
	readonly name: string;
	readonly favicon: string;

	readonly styles: string[];
	readonly scripts: string[];

	readonly head: Render | null;
	readonly body: Render | null;

	readonly onrequest: RequestListener | null;
}

export class TemplatesManager {
	private readonly templates: Template[] = [];

	public async load(workspace: string): Promise<void> {
		for (const walkEntry of fs.walkSync(path.join(workspace, "templates"), { includeDirs: false })) {
			const dynamicImport = await import(path.toFileUrl(walkEntry.path).toString());
			const template: Template = dynamicImport.default;

			this.templates.push(template);
		}
	}

	public findTemplate(name: string): Template | null {
		return this.templates.find((template) => template.name === name) || null;
	}

	public getTemplates(): Template[] {
		return this.templates;
	}
}
