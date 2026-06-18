import { buildVendorBundle, envToDefine } from "../utils/loader.ts";
import type { Config } from "../core/server.ts";

export class VendorsManager {
	private readonly bundles = new Map<string, string>();
	private readonly sharedLibs: string[];
	private readonly define: Record<string, string>;

	constructor(config: Config) {
		this.sharedLibs = config.sharedLibs;
		this.define = envToDefine(config.env);
	}

	public async load(workspace: string): Promise<void> {
		await Promise.all(
			this.sharedLibs.map(async (lib) => {
				const bundle = await buildVendorBundle(workspace, lib, this.sharedLibs, this.define);
				this.bundles.set(lib, bundle);
			}),
		);
	}

	public findBundle(lib: string): string | undefined {
		return this.bundles.get(lib);
	}

	public getSharedLibs(): string[] {
		return this.sharedLibs;
	}
}
