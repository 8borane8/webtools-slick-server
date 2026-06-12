import type { HttpRequest, HttpResponse } from "@webtools/expressapi";
import * as esbuild from "esbuild";
import * as path from "@std/path";
import * as fs from "@std/fs";

const CONTENT_TYPES: Record<string, string> = {
	js: "text/javascript",
	ts: "text/javascript",
	css: "text/css",
};

export class AssetsManager {
	private readonly staticPath: string;
	private readonly define: Record<string, string>;
	private readonly cache = new Map<string, string>();

	constructor(workspace: string, env: Record<string, string> = {}, private readonly noCache = false) {
		this.staticPath = path.resolve(path.join(workspace, "static"));
		this.define = Object.fromEntries(Object.entries(env).map(([k, v]) => [k, JSON.stringify(v)]));
	}

	public serve(req: HttpRequest, res: HttpResponse): Promise<Response> | Response | void {
		const filePath = path.resolve(path.join(this.staticPath, req.url));
		if (!filePath.startsWith(this.staticPath)) return;
		if (!fs.existsSync(filePath) || !Deno.statSync(filePath).isFile) return;

		const ext = path.extname(filePath).slice(1);
		const contentType = CONTENT_TYPES[ext];

		if (!contentType) return res.sendFile(filePath);

		if (!this.noCache) {
			const cached = this.cache.get(filePath);
			if (cached) return res.setHeader("Content-Type", contentType).size(cached.length).send(cached);
		}

		const output = esbuild.transformSync(Deno.readFileSync(filePath), {
			loader: ext as esbuild.Loader,
			minify: true,
			format: "esm",
			define: this.define,
		});

		if (!this.noCache) this.cache.set(filePath, output.code);
		return res.setHeader("Content-Type", contentType).size(output.code.length).send(output.code);
	}
}
