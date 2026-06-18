import type { ComponentType } from "preact";
import * as path from "@std/path";
import * as fs from "@std/fs";

import { buildIslandBundle, envToDefine, loadModuleWithDefine, SUPPORTED_EXTENSIONS } from "../utils/loader.ts";
import type { Config } from "../core/server.ts";

export interface IslandInfo {
	readonly name: string;
	readonly filePath: string;
	readonly bundle: string;
}

export class IslandsManager {
	private readonly registry = new Map<ComponentType, string>();
	private readonly byName = new Map<string, IslandInfo>();

	private readonly sharedLibs: string[];
	private readonly define: Record<string, string>;

	constructor(config: Config) {
		this.sharedLibs = config.sharedLibs;
		this.define = envToDefine(config.env);
	}

	public async load(workspace: string): Promise<void> {
		const islandsDir = path.join(workspace, "islands");
		if (!fs.existsSync(islandsDir)) return;

		const entries = [...fs.walkSync(islandsDir, { includeDirs: false })]
			.filter((e) => SUPPORTED_EXTENSIONS.has(path.extname(e.name)));

		await Promise.all(entries.map(async (walkEntry) => {
			const filePath = walkEntry.path;
			const name = path.relative(islandsDir, filePath).replaceAll("\\", "/");

			const [mod, bundle] = await Promise.all([
				loadModuleWithDefine<{ default: ComponentType }>(workspace, filePath, this.define),
				buildIslandBundle(workspace, filePath, this.sharedLibs, this.define),
			]);

			const component: ComponentType = mod.default;
			if (typeof component !== "function") {
				throw new Error(`Island '${name}' must export a default function component.`);
			}

			this.byName.set(name, { name, filePath, bundle });
			this.registry.set(component, name);
		}));
	}

	public getRegistry(): Map<ComponentType, string> {
		return this.registry;
	}

	public findByName(name: string): IslandInfo | undefined {
		return this.byName.get(name);
	}

	public hasIslands(): boolean {
		return this.registry.size > 0;
	}
}
