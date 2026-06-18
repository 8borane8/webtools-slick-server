import { TemplatesManager } from "../managers/templates.ts";
import { IslandsManager } from "../managers/islands.ts";
import { VendorsManager } from "../managers/vendors.ts";
import { AssetsManager } from "../managers/assets.ts";
import { activateIslandsHook } from "../islands/hook.tsx";
import { PagesManager } from "../managers/pages.ts";
import { Router } from "./router.ts";

import * as path from "@std/path";
import * as fs from "@std/fs";

export interface Config {
	readonly env: Record<string, string>;
	readonly port: number;
	readonly lang: string;
	readonly r404: string;
	readonly client: boolean;
	readonly noCache: boolean;
	readonly trustProxy: boolean;
	readonly sharedLibs: string[];
}

const SHARED_LIBS = [
	"preact",
	"preact/hooks",
	"preact/jsx-runtime",
	"preact-root-fragment",
	"@preact/signals",
];

const CLIENT_LIB = "@webtools/slick-client";

export class Slick {
	private static readonly requiredDirectories: Array<string> = ["templates", "static", "pages"];

	private readonly templatesManager: TemplatesManager;
	private readonly pagesManager: PagesManager;
	private readonly vendorsManager: VendorsManager;
	private readonly islandsManager: IslandsManager;
	private readonly config: Config;

	private router?: Router;

	constructor(private readonly workspace: string, config: Partial<Config>) {
		const sharedLibs = [
			...SHARED_LIBS,
			...(config.client ? [CLIENT_LIB] : []),
			...(config.sharedLibs || []),
		];

		this.config = {
			env: config.env || {},
			port: config.port || 5000,
			lang: config.lang || "en",
			r404: config.r404 || "/",
			client: config.client || false,
			noCache: config.noCache || false,
			trustProxy: config.trustProxy || false,
			sharedLibs: [...new Set(sharedLibs)],
		};

		this.vendorsManager = new VendorsManager(this.config);
		this.islandsManager = new IslandsManager(this.config);
		this.templatesManager = new TemplatesManager(this.config.env);
		this.pagesManager = new PagesManager(this.config.env);
	}

	public async start(): Promise<void> {
		this.preventConfigurationErrors();

		await Promise.all([
			this.vendorsManager.load(this.workspace),
			this.islandsManager.load(this.workspace),
			this.templatesManager.load(this.workspace),
			this.pagesManager.load(this.workspace),
		]);

		if (this.islandsManager.hasIslands()) {
			activateIslandsHook(this.islandsManager.getRegistry());
		}

		this.preventErrors();

		this.router = new Router(
			this.config,
			this.templatesManager,
			this.pagesManager,
			this.vendorsManager,
			this.islandsManager,
			new AssetsManager(this.workspace, this.config.env, this.config.noCache),
		);

		this.router.start();
	}

	private preventConfigurationErrors(): void {
		if (!fs.existsSync(this.workspace) || !Deno.statSync(this.workspace).isDirectory) {
			throw new Error(`The workspace '${this.workspace}' is not a valid directory.`);
		}

		for (const directory of Slick.requiredDirectories) {
			if (!fs.existsSync(path.join(this.workspace, directory))) {
				throw new Error(`The directory '${directory}' does not exist.`);
			}
		}
	}

	private preventErrors(): void {
		if (!this.pagesManager.findPage(this.config.r404)) {
			throw new Error(`The 404 page does not exist.`);
		}

		for (const page of this.pagesManager.getPages()) {
			if (!this.templatesManager.findTemplate(page.template)) {
				throw new Error(`The template '${page.template}' does not exist.`);
			}
		}
	}
}
