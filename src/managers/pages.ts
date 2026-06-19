import type { RequestListener } from "@webtools/expressapi";
import type { Render } from "../core/compiler.tsx";
import type { VNode } from "preact";
import * as path from "@std/path";
import * as fs from "@std/fs";

import { envToDefine, invalidateModuleCache, loadModuleWithDefine, SUPPORTED_EXTENSIONS } from "../utils/loader.ts";
import { watchDirectory } from "../utils/watch.ts";
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
	private readonly pagesDir: string;
	private readonly define: Record<string, string>;
	private readonly hotReload: boolean;

	private readonly pages = new Map<string, Page>();

	constructor(private readonly workspace: string, config: Config) {
		this.pagesDir = path.join(this.workspace, "pages");
		this.define = envToDefine(config.env);
		this.hotReload = config.hotReload;
	}

	public async load(): Promise<void> {
		const entries = [...fs.walkSync(this.pagesDir, { includeDirs: false })]
			.filter((e) => SUPPORTED_EXTENSIONS.has(path.extname(e.name)));

		await Promise.all(entries.map((e) => this.loadFile(e.path)));
		if (this.hotReload) watchDirectory(this.pagesDir, (filePath) => this.loadFile(filePath));
	}

	private async loadFile(filePath: string): Promise<void> {
		invalidateModuleCache(filePath);

		const mod = await loadModuleWithDefine<{ default: Page }>(this.workspace, filePath, this.define);
		this.pages.set(mod.default.url, mod.default);
	}

	public findPage(url: string): Page | undefined {
		return this.pages.get(url);
	}

	public getPages(): Page[] {
		return [...this.pages.values()];
	}
}
