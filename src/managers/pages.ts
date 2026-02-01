import type { RequestListener } from "@webtools/expressapi";
import type { Render } from "../core/compiler.tsx";

import * as path from "@std/path";
import * as fs from "@std/fs";

export interface Page {
	readonly url: string;
	readonly template: string;

	readonly title: string;

	readonly styles: string[];
	readonly scripts: string[];

	readonly head: Render | null;
	readonly body: Render | null;

	readonly onpost: RequestListener | null;
	readonly onrequest: RequestListener | null;
}

export class PagesManager {
	private readonly pages: Page[] = [];

	public async load(workspace: string): Promise<void> {
		for (const walkEntry of fs.walkSync(path.join(workspace, "pages"), { includeDirs: false })) {
			const dynamicImport = await import(path.toFileUrl(walkEntry.path).toString());
			const page: Page = dynamicImport.default;

			this.pages.push(page);
		}
	}

	public findPage(url: string): Page | null {
		return this.pages.find((page) => page.url === url) || null;
	}

	public getPages(): Page[] {
		return this.pages;
	}
}
