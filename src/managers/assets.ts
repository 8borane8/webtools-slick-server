import type { HttpRequest, HttpResponse } from "@webtools/expressapi";
import * as path from "@std/path";
import * as fs from "@std/fs";

import { buildStaticAsset, envToDefine } from "../utils/loader.ts";
import type { Config } from "../core/server.ts";

const CONTENT_TYPES: Record<string, string> = {
	js: "text/javascript",
	ts: "text/javascript",
	css: "text/css",
};

export class AssetsManager {
	private readonly staticPath: string;
	private readonly cache = new Map<string, string>();

	private readonly workspace: string;
	private readonly sharedLibs: string[];
	private readonly define: Record<string, string>;
	private readonly hotReload: boolean;

	constructor(
		workspace: string,
		config: Config,
	) {
		this.workspace = path.resolve(workspace);
		this.staticPath = path.resolve(path.join(this.workspace, "static"));
		this.define = envToDefine(config.env);
		this.sharedLibs = config.sharedLibs;
		this.hotReload = config.hotReload;
	}

	public async serve(req: HttpRequest, res: HttpResponse): Promise<Response | void> {
		const filePath = path.resolve(path.join(this.staticPath, req.url));
		if (!filePath.startsWith(this.staticPath)) return;
		if (!fs.existsSync(filePath) || !Deno.statSync(filePath).isFile) return;

		const ext = path.extname(filePath).slice(1);
		const contentType = CONTENT_TYPES[ext];

		if (!contentType) return res.sendFile(filePath);

		if (!this.hotReload) {
			const cached = this.cache.get(filePath);
			if (cached) return res.setHeader("Content-Type", contentType).size(cached.length).send(cached);
		}

		const output = await buildStaticAsset(this.workspace, filePath, this.define, this.sharedLibs);

		if (!this.hotReload) this.cache.set(filePath, output);
		return res.setHeader("Content-Type", contentType).size(output.length).send(output);
	}
}
