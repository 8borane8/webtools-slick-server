import type { ComponentType } from "preact";
import * as esbuild from "esbuild";
import * as path from "@std/path";
import * as fs from "@std/fs";

import { buildVendorBundle } from "../utils/vendors.ts";
import type { Config } from "../core/server.ts";

const SUPPORTED_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

export interface IslandInfo {
	readonly name: string;
	readonly filePath: string;
	readonly bundle: string;
}

export class IslandsManager {
	private readonly registry = new Map<ComponentType, string>();
	private readonly byName = new Map<string, IslandInfo>();

	private readonly vendorBundles = new Map<string, string>();

	private sharedLibs: string[];
	private define: Record<string, string>;

	constructor(config: Config) {
		this.sharedLibs = config.sharedLibs;
		this.define = Object.fromEntries(
			Object.entries(config.env).map(([k, v]) => [k, JSON.stringify(v)]),
		);
	}

	public async load(workspace: string): Promise<void> {
		const islandsDir = path.join(workspace, "islands");
		if (!fs.existsSync(islandsDir)) return;

		await Promise.all(
			this.sharedLibs.map(async (lib) => {
				const bundle = await buildVendorBundle(lib, this.sharedLibs, this.define);
				this.vendorBundles.set(lib, bundle);
			}),
		);

		const entries = [...fs.walkSync(islandsDir, { includeDirs: false })]
			.filter((e) => SUPPORTED_EXTENSIONS.includes(path.extname(e.name)));

		await Promise.all(entries.map(async (walkEntry) => {
			const filePath = walkEntry.path;
			const name = path.relative(islandsDir, filePath).replaceAll("\\", "/");

			const [mod, buildResult] = await Promise.all([
				import(path.toFileUrl(filePath).toString()),
				esbuild.build({
					entryPoints: [filePath],
					bundle: true,
					format: "esm",
					write: false,
					external: this.sharedLibs,
					minify: true,
					define: this.define,
					jsx: "automatic",
					jsxImportSource: "preact",
				}),
			]);

			const component: ComponentType = mod.default;
			if (typeof component !== "function") {
				throw new Error(`Island '${name}' must export a default function component.`);
			}

			const bundle = new TextDecoder().decode(buildResult.outputFiles[0].contents);
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

	public findVendorBundle(lib: string): string | undefined {
		return this.vendorBundles.get(lib);
	}

	public getSharedLibs(): string[] {
		return this.sharedLibs;
	}

	public hasIslands(): boolean {
		return this.registry.size > 0;
	}
}
