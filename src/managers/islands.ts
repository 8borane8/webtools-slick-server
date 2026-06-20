import type { ComponentType } from "preact";
import * as path from "@std/path";
import * as fs from "@std/fs";

import {
	buildIslandBundle,
	envToDefine,
	invalidateModuleCache,
	loadModuleWithDefine,
	SUPPORTED_EXTENSIONS,
} from "../utils/loader.ts";

import { watchDirectory } from "../utils/watch.ts";
import type { Config } from "../core/server.ts";

export interface IslandInfo {
	readonly name: string;
	readonly filePath: string;
	readonly bundle: string;
}

export class IslandsManager {
	private readonly islandsDir: string;
	private readonly sharedLibs: string[];
	private readonly define: Record<string, string>;
	private readonly hotReload: boolean;

	private readonly registry = new Map<ComponentType, string>();
	private readonly islands = new Map<string, IslandInfo>();

	onReload?: () => Promise<void> | void;

	constructor(private readonly workspace: string, config: Config) {
		this.islandsDir = path.join(this.workspace, "islands");
		this.sharedLibs = config.sharedLibs;
		this.define = envToDefine(config.env);
		this.hotReload = config.hotReload;
	}

	private async loadFile(filePath: string): Promise<void> {
		const name = path.relative(this.islandsDir, filePath).replaceAll("\\", "/");

		for (const [component, islandName] of this.registry) {
			if (islandName === name) {
				this.registry.delete(component);
				break;
			}
		}

		invalidateModuleCache(filePath);

		const [mod, bundle] = await Promise.all([
			loadModuleWithDefine<{ default: ComponentType }>(this.workspace, filePath, this.define),
			buildIslandBundle(this.workspace, filePath, this.sharedLibs, this.define),
		]);

		const component: ComponentType = mod.default;
		if (typeof component !== "function") {
			throw new Error(`Island '${name}' must export a default function component.`);
		}

		this.islands.set(name, { name, filePath, bundle });
		this.registry.set(component, name);
	}

	public async reloadAll(): Promise<void> {
		const entries = [...fs.walkSync(this.islandsDir, { includeDirs: false })]
			.filter((e) => SUPPORTED_EXTENSIONS.has(path.extname(e.name)));

		this.islands.clear();
		this.registry.clear();
		await Promise.all(entries.map((e) => this.loadFile(e.path)));
	}

	public async load(): Promise<void> {
		if (!fs.existsSync(this.islandsDir)) return;

		await this.reloadAll();
		if (this.hotReload) {
			watchDirectory(this.islandsDir, async (filePath) => {
				await this.loadFile(filePath);
				await this.onReload?.();
			});
		}
	}

	public getRegistry(): Map<ComponentType, string> {
		return this.registry;
	}

	public findByName(name: string): IslandInfo | undefined {
		return this.islands.get(name);
	}

	public hasIslands(): boolean {
		return this.registry.size > 0;
	}
}
