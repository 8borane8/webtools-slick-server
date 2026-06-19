import { buildVendorBundle, envToDefine } from "../utils/loader.ts";
import type { Config } from "../core/server.ts";

export class VendorsManager {
	private readonly sharedLibs: string[];
	private readonly define: Record<string, string>;

	private readonly bundles = new Map<string, string>();

	constructor(private readonly workspace: string, config: Config) {
		this.sharedLibs = config.sharedLibs;
		this.define = envToDefine(config.env);
	}

	public async load(): Promise<void> {
		await Promise.all(
			this.sharedLibs.map(async (lib) => {
				const bundle = await buildVendorBundle(this.workspace, lib, this.sharedLibs, this.define);
				this.bundles.set(lib, bundle);
			}),
		);
	}

	public findVendor(lib: string): string | undefined {
		return this.bundles.get(lib);
	}

	public getSharedLibs(): string[] {
		return this.sharedLibs;
	}
}
