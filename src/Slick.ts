import { TemplatesManager } from "./managers/TemplatesManager.ts";
import { PagesManager } from "./managers/PagesManager.ts";
import type { Config } from "./interfaces/Config.ts";
import { Router } from "./server/Router.ts";

import * as fs from "@std/fs";

const defaultConfig: Config = {
	port: 5000,
	lang: "en",
	r404: "/",
};

export class Slick {
	private static readonly requiredDirectories: Array<string> = ["templates", "pages", "static"];

	private readonly config: Config;

	private readonly templatesManager: TemplatesManager;
	private readonly pagesManager: PagesManager;
	private readonly router: Router;

	constructor(private readonly workspace: string, config: Partial<Config> = defaultConfig) {
		this.config = {
			...defaultConfig,
			...config,
		};

		this.templatesManager = new TemplatesManager(this.workspace);
		this.pagesManager = new PagesManager(this.workspace);

		this.router = new Router(this.workspace, this.config, this.templatesManager, this.pagesManager);
	}

	public async start(): Promise<void> {
		this.preventConfigurationErrors();
		await this.templatesManager.load();
		await this.pagesManager.load();
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
			if (!fs.existsSync(`${this.workspace}/${directory}`)) {
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
