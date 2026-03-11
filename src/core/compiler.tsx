// deno-lint-ignore-file jsx-key

import { renderToString } from "preact-render-to-string";
import type { HttpRequest } from "@webtools/expressapi";
import type { VNode } from "preact";

import type { Template } from "../managers/templates.ts";
import type { Page } from "../managers/pages.ts";
import type { Config } from "./server.ts";

export type Render<T> = ((req: HttpRequest) => Promise<T> | T) | T;

export class Compiler {
	constructor(private readonly config: Config) {}

	async compile<T>(req: HttpRequest, render: Render<T> | null): Promise<T | null> {
		return render instanceof Function ? await render(req) : render;
	}

	async createDOM(req: HttpRequest, template: Template, page: Page): Promise<string> {
		const templateHead = await this.compile<VNode>(req, template.head);
		const templateBody = await this.compile<VNode>(req, template.body);

		const pageHead = await this.compile<VNode>(req, page.head);
		const pageBody = await this.compile<VNode>(req, page.body);

		const combinedBody = templateBody
			? renderToString(templateBody).replace(
				/(<[^>]*id\s*=\s*['"]app['"][^>]*>).*?(<\/[^>]*>)/s,
				(_match, p1, p2) => `${p1}${pageBody ? renderToString(pageBody) : ""}${p2}`,
			)
			: "";

		const title = await this.compile<string>(req, page.title) || "";
		const favicon = await this.compile<string>(req, template.favicon) || "";

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
					{this.config.client
						? (
							<>
								{template.styles.map((s) => <link rel="stylesheet" href={s} slick-type="template" />)}
								{page.styles.map((s) => <link rel="stylesheet" href={s} slick-type="page" />)}
							</>
						)
						: (
							<>
								{template.styles.map((s) => <link rel="stylesheet" href={s} />)}
								{page.styles.map((s) => <link rel="stylesheet" href={s} />)}
							</>
						)}
					<link rel="shortcut icon" href={favicon} type="image/x-icon" />
					{pageHead}
				</head>
				<body>
					<div id="root" dangerouslySetInnerHTML={{ __html: combinedBody }}></div>
					{this.config.client
						? (
							<>
								<script
									type="importmap"
									dangerouslySetInnerHTML={{
										__html: JSON.stringify({
											"imports": {
												"@webtools/slick-client": typeof this.config.client === "string"
													? this.config.client
													: "https://esm.sh/jsr/@webtools/slick-client@^0.3.0",
											},
										}),
									}}
								/>
								<script
									type="module"
									dangerouslySetInnerHTML={{
										__html:
											`import { Slick } from "@webtools/slick-client"; Slick.initialize("${template.name}", true);`,
									}}
								/>
								{template.scripts.map((s) => <script src={s} type="module" slick-type="template" />)}
								{page.scripts.map((s) => <script src={s} type="module" slick-type="page" />)}
							</>
						)
						: (
							<>
								{template.scripts.map((s) => <script src={s} type="module" />)}
								{page.scripts.map((s) => <script src={s} type="module" />)}
							</>
						)}
				</body>
			</html>,
		);

		return `<!DOCTYPE html>${html}`;
	}

	async createDIC(req: HttpRequest, template: Template, page: Page): Promise<object> {
		const renderTemplate = req.headers.get("x-slick-template") !== page.template;

		const templateHead = renderTemplate ? await this.compile<VNode>(req, template.head) : null;
		const templateBody = renderTemplate ? await this.compile<VNode>(req, template.body) : null;

		const pageHead = await this.compile<VNode>(req, page.head);
		const pageBody = await this.compile<VNode>(req, page.body);

		return {
			url: req.url,
			title: page.title,
			favicon: template.favicon,
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
