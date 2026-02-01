import type { TemplatesManager } from "../managers/templates.ts";
import type { Page, PagesManager } from "../managers/pages.ts";
import type { Config } from "./server.ts";
import { Compiler } from "./compiler.tsx";

import { HttpMethods, type HttpRequest, type HttpResponse, HttpServer } from "@webtools/expressapi";
import * as esbuild from "esbuild";
import * as path from "@std/path";
import * as fs from "@std/fs";

export class Router {
	private static readonly contentTypes: Record<string, string> = {
		js: "text/javascript",
		ts: "text/javascript",
		css: "text/css",
	};

	private readonly httpServer: HttpServer = new HttpServer();
	private readonly compiler: Compiler;

	constructor(
		private readonly workspace: string,
		private readonly config: Config,
		private readonly templatesManager: TemplatesManager,
		private readonly pagesManager: PagesManager,
	) {
		this.compiler = new Compiler(this.config);
	}

	public start(): void {
		this.httpServer.use((req, res) => {
			res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");

			const requestedHeaders = req.headers.get("access-control-request-headers");
			if (requestedHeaders) {
				res.setHeader("Access-Control-Allow-Headers", requestedHeaders);
			} else {
				const defaultHeaders = ["Content-Type"];
				if (this.config.client) defaultHeaders.push("X-Slick-Template");
				res.setHeader("Access-Control-Allow-Headers", defaultHeaders.join(", "));
			}
		});

		for (const page of this.pagesManager.getPages()) {
			const template = this.templatesManager.findTemplate(page.template)!;
			const middlewares = [template.onrequest, page.onrequest].filter((m) => m != null);

			this.httpServer.get(page.url, (req, res) => this.getRequestListener(req, res, page), middlewares);
			if (page.onpost) this.httpServer.post(page.url, page.onpost);
		}

		this.httpServer.notFound(this.requestListener.bind(this));
		this.httpServer.listen(this.config.port);
	}

	private async getRequestListener(req: HttpRequest, res: HttpResponse, page: Page): Promise<Response> {
		const template = this.templatesManager.findTemplate(page.template)!;

		if (this.config.client && req.headers.has("x-slick-template")) {
			const dic = await this.compiler.createDIC(req, template, page);
			return res.json(dic);
		}

		const dom = await this.compiler.createDOM(req, template, page);
		return res.type("html").send(dom);
	}

	private requestListener(req: HttpRequest, res: HttpResponse): Response | void {
		if (req.method !== HttpMethods.GET) return;

		const staticPath = path.resolve(path.join(this.workspace, "static"));
		const filePath = path.resolve(path.join(staticPath, req.url));

		if (filePath.startsWith(staticPath) && fs.existsSync(filePath) && Deno.statSync(filePath).isFile) {
			const ext = path.extname(filePath).slice(1);

			if (ext && Object.keys(Router.contentTypes).includes(ext)) {
				const fileBytes = Deno.readFileSync(filePath);
				const output = esbuild.transformSync(fileBytes, {
					loader: ext as esbuild.Loader,
					minify: true,
					format: "esm",
					define: this.config.env,
				});

				return res.setHeader("Content-Type", Router.contentTypes[ext])
					.size(output.code.length)
					.send(output.code);
			}

			return res.sendFile(filePath);
		}
	}
}
