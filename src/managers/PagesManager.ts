import type { Page } from "../interfaces/Page.ts";

import * as path from "@std/path";
import * as fs from "@std/fs";

export class PagesManager {
	private readonly pages: Array<Page> = [];

	public async load(workspace: string): Promise<void> {
		for (const walkEntry of fs.walkSync(`${workspace}/pages`, { includeDirs: false })) {
			const dynamicImport = await import(path.toFileUrl(walkEntry.path).toString());
			const page: Page = dynamicImport.default;

			this.pages.push(page);
		}
	}

	getPage(url: string): Page | null {
		return this.pages.find((page) => page.url == url) || null;
	}

	getPages(): Array<Page> {
		return this.pages;
	}
}
