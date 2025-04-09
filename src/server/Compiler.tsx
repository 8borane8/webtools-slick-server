import type { Template } from "../interfaces/Template.ts";
import type { Config } from "../interfaces/Config.ts";
import type { Render } from "../interfaces/Render.ts";
import type { Page } from "../interfaces/Page.ts";

import { renderToString } from "preact-render-to-string";
import type { HttpRequest } from "@webtools/expressapi";
import type preact from "preact";

export class Compiler {
	constructor(private readonly config: Config) {}

	async compile(req: HttpRequest, render: Render | preact.VNode): Promise<preact.VNode> {
		return render instanceof Function ? await render(req) : render;
	}

	async createDOM(req: HttpRequest, template: Template, page: Page): Promise<string> {
		const templateHead = await this.compile(req, template.head);
		const pageHead = await this.compile(req, page.head);

		const templateBody = await this.compile(req, template.body);
		const pageBody = await this.compile(req, page.body);

		const combinedBody = renderToString(templateBody).replace(
			/(<[^>]*id\s*=\s*['"]app['"][^>]*>).*?(<\/[^>]*>)/s,
			(_match, p1, p2) => `${p1}${renderToString(pageBody)}${p2}`,
		);

		const html = renderToString(
			<html lang={this.config.lang}>
				<head>
					{templateHead}

					<title>{page.title}</title>
					<meta charset="UTF-8" />
					<meta http-equiv="X-UA-Compatible" content="IE=edge" />
					<meta
						name="viewport"
						content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
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

					<link rel="shortcut icon" href={template.favicon} />
					{pageHead}
				</head>
				<body>
					<div id="root" dangerouslySetInnerHTML={{ __html: combinedBody }}></div>

					{this.config.client
						? (
							<>
								<script type="importmap">
									{`{"imports":{"@webtools/slick-client":"https://esm.sh/jsr/@webtools/slick-client"}}`}
								</script>

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
		return {
			url: req.url,
			title: page.title,
			favicon: template.favicon,

			template: req.body.template == page.template ? null : {
				name: template.name,
				styles: template.styles,
				scripts: template.scripts,
				head: renderToString(await this.compile(req, template.head)),
				body: renderToString(await this.compile(req, template.body)),
			},
			page: {
				styles: page.styles,
				scripts: page.scripts,
				head: renderToString(await this.compile(req, page.head)),
				body: renderToString(await this.compile(req, page.body)),
			},
		};
	}
}
