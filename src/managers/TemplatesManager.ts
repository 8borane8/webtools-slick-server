import type { Template } from "../interfaces/Template.ts";

import * as path from "@std/path";
import * as fs from "@std/fs";

export class TemplatesManager {
	private readonly templates: Array<Template> = [];

	public async load(workspace: string): Promise<void> {
		for (const walkEntry of fs.walkSync(path.join(workspace, "templates"), { includeDirs: false })) {
			const dynamicImport = await import(path.toFileUrl(walkEntry.path).toString());
			const template: Template = dynamicImport.default;

			this.templates.push(template);
		}
	}

	getTemplate(name: string): Template | null {
		return this.templates.find((template) => template.name == name) || null;
	}
}
