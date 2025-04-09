import type { TemplatesManager } from "../managers/TemplatesManager.ts";
import type { PagesManager } from "../managers/PagesManager.ts";
import type { Template } from "../interfaces/Template.ts";
import type { Config } from "../interfaces/Config.ts";
import type { Page } from "../interfaces/Page.ts";
import { Compiler } from "./Compiler.tsx";

import { HttpMethods, type HttpRequest, type HttpResponse, HttpServer } from "@webtools/expressapi";
import * as esbuild from "esbuild";
import * as path from "@std/path";
import * as fs from "@std/fs";

export class Router {
	public static readonly urlRegex = /^(\/|(?:\/[^\/]+)+)$/;

	private readonly httpServer: HttpServer;
	private readonly compiler: Compiler;

	constructor(
		private readonly workspace: string,
		private readonly config: Config,
		private readonly templatesManager: TemplatesManager,
		private readonly pagesManager: PagesManager,
	) {
		this.httpServer = new HttpServer(this.config.port);
		this.compiler = new Compiler(this.config);
	}

	public registerRequestListeners(): void {
		for (const page of this.pagesManager.getPages()) {
			this.httpServer.get(page.url, (req, res) => this.getRequestListener(req, res, page));
			this.httpServer.post(page.url, (req, res) => this.postRequestListener(req, res, page));
		}

		this.httpServer.setEndpointNotFoundFunction(this.requestListener.bind(this));
	}

	private async onrequest(req: HttpRequest, template: Template, page: Page): Promise<string | null> {
		const templateOnRequest = template.onrequest == null ? undefined : await template.onrequest(req);
		if (templateOnRequest != undefined) return templateOnRequest;

		const pageOnRequest = page.onrequest == null ? undefined : await page.onrequest(req);
		return pageOnRequest != undefined ? pageOnRequest : null;
	}

	private async getRequestListener(req: HttpRequest, res: HttpResponse, page: Page): Promise<Response> {
		const template = this.templatesManager.getTemplate(page.template)!;
		const onrequest = await this.onrequest(req, template, page);
		if (onrequest != null) return res.redirect(onrequest);

		return res.type("html").send(await this.compiler.createDOM(req, template, page));
	}

	private async postRequestListener(req: HttpRequest, res: HttpResponse, page: Page): Promise<Response> {
		if (page.onpost == null) {
			return res.status(405).json({
				success: false,
				error: "405 Method Not Allowed.",
			});
		}

		const template = this.templatesManager.getTemplate(page.template)!;
		const onrequest = await this.onrequest(req, template, page);
		if (onrequest != null) return res.redirect(onrequest);

		return await page.onpost(req, res) || res.status(405).json({
			success: false,
			error: "405 Method Not Allowed.",
		});
	}

	private requestListener(req: HttpRequest, res: HttpResponse): Response {
		if (![HttpMethods.GET, HttpMethods.POST].includes(req.method)) {
			return res.status(405).json({
				success: false,
				error: "405 Method Not Allowed.",
			});
		}

		if (req.method == HttpMethods.GET) {
			const staticPath = `${this.workspace}/static`;
			const filePath = path.normalize(path.join(staticPath, req.url));

			if (filePath.startsWith(staticPath) && fs.existsSync(filePath) && Deno.statSync(filePath).isFile) {
				const ext = filePath.split(".").at(-1)!;
				if (ext == "js" || ext == "ts") {
					const output = esbuild.transformSync(Deno.readTextFileSync(filePath), {
						loader: ext,
						format: "esm",
						minify: true,
					});

					return res.setHeader("Content-Type", "text/javascript").size(output.code.length).send(output.code);
				}

				return res.sendFile(filePath);
			}
		}

		return res.redirect(this.config.r404);
	}
}
