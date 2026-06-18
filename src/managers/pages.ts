import type { RequestListener } from "@webtools/expressapi";
import type { Render } from "../core/compiler.tsx";

import type { VNode } from "preact";
import * as path from "@std/path";
import * as fs from "@std/fs";

import { envToDefine, loadModuleWithDefine, SUPPORTED_EXTENSIONS } from "../utils/loader.ts";
import type { Config } from "../core/server.ts";

export interface Page {
	readonly url: string;
	readonly template: string;

	readonly title: Render<string> | null;

	readonly styles: string[];
	readonly scripts: string[];

	readonly head: Render<VNode> | null;
	readonly body: Render<VNode> | null;

	readonly onpost: RequestListener | null;
	readonly onrequest: RequestListener | null;
}

export class PagesManager {
	private readonly pages: Page[] = [];
	private readonly define: Record<string, string>;

	constructor(config: Config) {
		this.define = envToDefine(config.env);
	}

	public async load(workspace: string): Promise<void> {
		const pagesDir = path.join(workspace, "pages");
		const entries = [...fs.walkSync(pagesDir, { includeDirs: false })]
			.filter((e) => SUPPORTED_EXTENSIONS.has(path.extname(e.name)));

		await Promise.all(entries.map(async (walkEntry) => {
			const mod = await loadModuleWithDefine<{ default: Page }>(workspace, walkEntry.path, this.define);
			this.pages.push(mod.default);
		}));
	}

	public findPage(url: string): Page | null {
		return this.pages.find((page) => page.url === url) || null;
	}

	public getPages(): Page[] {
		return this.pages;
	}
}
