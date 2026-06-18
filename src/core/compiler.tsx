// deno-lint-ignore-file jsx-key
import { renderToString } from "preact-render-to-string";
import type { HttpRequest } from "@webtools/expressapi";
import type { VNode } from "preact";

import type { IslandsManager } from "../managers/islands.ts";
import type { VendorsManager } from "../managers/vendors.ts";
import { ISLAND_HYDRATION_SCRIPT } from "../islands/hydration.ts";
import type { Template } from "../managers/templates.ts";
import { libToVendorUrl } from "../utils/vendors.ts";
import type { Page } from "../managers/pages.ts";
import type { Config } from "./server.ts";

export type Render<T> = ((req: HttpRequest) => Promise<T> | T) | T;

// deno-lint-ignore no-explicit-any
function injectPage(node: any, page: VNode | null): any {
	if (!node || typeof node !== "object") return node;

	const { type, props } = node;
	if (typeof type === "string" && props?.id === "app") {
		return { ...node, props: { ...props, children: page } };
	}

	const { children } = props;
	if (!children) return node;

	if (Array.isArray(children)) {
		let found = false;

		const next = children.map((c) => {
			if (found) return c;
			const r = injectPage(c, page);
			found ||= r !== c;
			return r;
		});

		return found ? { ...node, props: { ...props, children: next } } : node;
	}

	const next = injectPage(children, page);
	return next !== children ? { ...node, props: { ...props, children: next } } : node;
}

export class Compiler {
	private readonly importMap: string | null;
	private readonly hasIslands: boolean;

	constructor(
		private readonly config: Config,
		vendorsManager: VendorsManager,
		islandsManager: IslandsManager,
	) {
		this.hasIslands = islandsManager.hasIslands();

		const imports: Record<string, string> = {};

		if (this.config.client || this.hasIslands) {
			for (const lib of vendorsManager.getSharedLibs()) {
				imports[lib] = libToVendorUrl(lib);
			}
		}

		this.importMap = Object.keys(imports).length > 0 ? JSON.stringify({ imports }) : null;
	}

	async compile<T>(req: HttpRequest, render: Render<T> | null): Promise<T | null> {
		return render instanceof Function ? await render(req) : render;
	}

	async createDOM(req: HttpRequest, template: Template, page: Page): Promise<string> {
		const [templateHead, templateBody, pageHead, pageBody, title, favicon] = await Promise.all([
			this.compile<VNode>(req, template.head),
			this.compile<VNode>(req, template.body),
			this.compile<VNode>(req, page.head),
			this.compile<VNode>(req, page.body),
			this.compile<string>(req, page.title),
			this.compile<string>(req, template.favicon),
		]);

		const combinedBody = templateBody ? renderToString(injectPage(templateBody, pageBody)) : "";

		const slickTypeAttr = (type: string) => this.config.client ? { "slick-type": type } : {};

		const html = renderToString(
			<html lang={this.config.lang}>
				<head>
					{templateHead}
					<title>{title}</title>

					<meta charset="UTF-8" />
					<meta http-equiv="X-UA-Compatible" content="IE=edge" />
					<meta
						name="viewport"
						content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
					/>

					{template.styles.map((s) => <link rel="stylesheet" href={s} {...slickTypeAttr("template")} />)}
					{page.styles.map((s) => <link rel="stylesheet" href={s} {...slickTypeAttr("page")} />)}

					<link rel="shortcut icon" href={favicon || ""} type="image/x-icon" />
					{pageHead}
				</head>
				<body>
					<div id="root" dangerouslySetInnerHTML={{ __html: combinedBody }} />

					{this.importMap && <script type="importmap" dangerouslySetInnerHTML={{ __html: this.importMap }} />}
					{this.config.client && (
						<script
							type="module"
							dangerouslySetInnerHTML={{
								__html:
									`import{Slick}from"@webtools/slick-client";Slick.initialize("${template.name}",true);`,
							}}
						/>
					)}
					{this.hasIslands && (
						<script type="module" dangerouslySetInnerHTML={{ __html: ISLAND_HYDRATION_SCRIPT }} />
					)}

					{template.scripts.map((s) => <script src={s} type="module" {...slickTypeAttr("template")} />)}
					{page.scripts.map((s) => <script src={s} type="module" {...slickTypeAttr("page")} />)}
				</body>
			</html>,
		);

		return `<!DOCTYPE html>${html}`;
	}

	async createDIC(req: HttpRequest, template: Template, page: Page): Promise<object> {
		const renderTemplate = req.headers.get("x-slick-template") !== page.template;

		const [templateHead, templateBody, pageHead, pageBody, title, favicon] = await Promise.all([
			renderTemplate ? this.compile<VNode>(req, template.head) : Promise.resolve(null),
			renderTemplate ? this.compile<VNode>(req, template.body) : Promise.resolve(null),
			this.compile<VNode>(req, page.head),
			this.compile<VNode>(req, page.body),
			this.compile<string>(req, page.title),
			this.compile<string>(req, template.favicon),
		]);

		return {
			url: req.url,
			title: title,
			favicon: favicon,
			template: renderTemplate
				? {
					name: template.name,
					styles: template.styles,
					scripts: template.scripts,
					head: templateHead ? renderToString(templateHead) : "",
					body: templateBody ? renderToString(templateBody) : "",
				}
				: null,
			page: {
				styles: page.styles,
				scripts: page.scripts,
				head: pageHead ? renderToString(pageHead) : "",
				body: pageBody ? renderToString(pageBody) : "",
			},
		};
	}
}
