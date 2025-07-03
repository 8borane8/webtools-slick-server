import { TemplatesManager } from "./managers/TemplatesManager.ts";
import { PagesManager } from "./managers/PagesManager.ts";
import type { Config } from "./interfaces/Config.ts";
import { Router } from "./server/Router.ts";

import * as path from "@std/path";
import * as fs from "@std/fs";

export class Slick {
	private static readonly requiredDirectories: Array<string> = ["templates", "static", "pages"];

	private readonly templatesManager: TemplatesManager = new TemplatesManager();
	private readonly pagesManager: PagesManager = new PagesManager();
	private readonly router: Router;
	private readonly config: Config;

	constructor(private readonly workspace: string, config: Partial<Config>) {
		this.config = {
			env: {},
			port: config.port || 5000,
			lang: config.lang || "en",
			r404: config.r404 || "/",
			client: config.client || false,
		};

		this.router = new Router(this.workspace, this.config, this.templatesManager, this.pagesManager);
	}

	public async start(): Promise<void> {
		this.preventConfigurationErrors();
		await this.templatesManager.load(this.workspace);
		await this.pagesManager.load(this.workspace);
		this.preventErrors();

		this.router.registerRequestListeners();
	}

	private preventConfigurationErrors(): void {
		if (!fs.existsSync(this.workspace)) {
			throw new Error(`The workspace '${this.workspace}' does not exist.`);
		}

		if (!Router.urlRegex.test(this.config.r404)) {
			throw new Error(`Invalid redirect 404 url. Please provide a valid format: ${Router.urlRegex}`);
		}

		for (const directory of Slick.requiredDirectories) {
			if (!fs.existsSync(path.join(this.workspace, directory))) {
				throw new Error(`The directory '${directory}' does not exist.`);
			}
		}
	}

	private preventErrors(): void {
		if (!this.pagesManager.getPages().some((page) => page.url == this.config.r404)) {
			throw new Error(`The 404 page does not exist.`);
		}

		for (const page of this.pagesManager.getPages()) {
			if (this.templatesManager.getTemplate(page.template) == null) {
				throw new Error(`The template '${page.template}' does not exist.`);
			}
		}
	}
}
