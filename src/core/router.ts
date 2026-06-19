import { ISLAND_PREFIX, islandUrlToName } from "../utils/islands.ts";
import { VENDOR_PREFIX, vendorUrlToLib } from "../utils/vendors.ts";
import type { TemplatesManager } from "../managers/templates.ts";
import type { Page, PagesManager } from "../managers/pages.ts";
import type { IslandsManager } from "../managers/islands.ts";
import type { VendorsManager } from "../managers/vendors.ts";
import type { AssetsManager } from "../managers/assets.ts";

import type { Config } from "./server.ts";
import { Compiler } from "./compiler.tsx";

import {
	HttpMethods,
	type HttpRequest,
	type HttpResponse,
	HttpServer,
	type RequestListener,
} from "@webtools/expressapi";

export class Router {
	private readonly httpServer: HttpServer;
	private readonly compiler: Compiler;

	constructor(
		private readonly config: Config,
		private readonly templatesManager: TemplatesManager,
		private readonly pagesManager: PagesManager,
		private readonly vendorsManager: VendorsManager,
		private readonly islandsManager: IslandsManager,
		private readonly assetsManager: AssetsManager,
	) {
		this.httpServer = new HttpServer({ trustProxy: config.trustProxy });
		this.compiler = new Compiler(this.config, vendorsManager, islandsManager);
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

		for (const { url } of this.pagesManager.getPages()) {
			this.httpServer.get(url, (req, res) => this.onGet(req, res, url));
			this.httpServer.post(url, (req, res) => this.onPost(req, res, url));
		}

		this.httpServer.notFound(this.requestListener.bind(this));
		this.httpServer.listen(this.config.port);
	}

	private middlewares(page: Page): RequestListener[] {
		const template = this.templatesManager.findTemplate(page.template)!;
		return [template.onrequest, page.onrequest].filter((m) => m != null);
	}

	private async onGet(req: HttpRequest, res: HttpResponse, url: string): Promise<Response> {
		const page = this.pagesManager.findPage(url)!;

		for (const middleware of this.middlewares(page)) {
			const result = await middleware(req, res);
			if (result) return result;
		}

		const template = this.templatesManager.findTemplate(page.template)!;
		const dom = await this.compiler.createDOM(req, template, page);
		return res.type("html").send(dom);
	}

	private async onPost(req: HttpRequest, res: HttpResponse, url: string): Promise<Response | void> {
		const page = this.pagesManager.findPage(url)!;

		if (this.config.client && req.headers.has("x-slick-template")) {
			for (const middleware of this.middlewares(page)) {
				const result = await middleware(req, res);
				if (result) return result;
			}

			const template = this.templatesManager.findTemplate(page.template)!;
			const dic = await this.compiler.createDIC(req, template, page);
			return res.json(dic);
		}

		if (page.onpost) return await page.onpost(req, res);
	}

	private async requestListener(req: HttpRequest, res: HttpResponse): Promise<Response | void> {
		if (req.method !== HttpMethods.GET) return;

		if (req.url.startsWith(VENDOR_PREFIX)) {
			const lib = vendorUrlToLib(req.url);
			const bundle = this.vendorsManager.findVendor(lib);
			if (!bundle) return res.redirect(this.config.r404);

			return res.setHeader("Content-Type", "text/javascript").size(bundle.length).send(bundle);
		}

		if (req.url.startsWith(ISLAND_PREFIX) && this.islandsManager.hasIslands()) {
			const name = islandUrlToName(req.url);
			const info = this.islandsManager.findByName(name);
			if (!info) return res.redirect(this.config.r404);

			return res.setHeader("Content-Type", "text/javascript").size(info.bundle.length).send(info.bundle);
		}

		return await this.assetsManager.serve(req, res) || res.redirect(this.config.r404);
	}
}
