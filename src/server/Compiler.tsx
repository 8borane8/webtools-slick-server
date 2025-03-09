import type { Template } from "../interfaces/Template.ts";
import type { Render } from "../interfaces/Render.ts";
import type { Page } from "../interfaces/Page.ts";

import { renderToString } from "preact-render-to-string";
import type { HttpRequest } from "@webtools/expressapi";
import type preact from "preact";

export class Compiler {
	constructor(private readonly lang: string) {}

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
			<html lang={this.lang}>
				<head>
					{templateHead}

					<title>{page.title}</title>
					<meta charset="UTF-8" />
					<meta http-equiv="X-UA-Compatible" content="IE=edge" />
					<meta
						name="viewport"
						content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
					/>

					{template.styles.map((s) => <link rel="stylesheet" href={s} />)}
					{page.styles.map((s) => <link rel="stylesheet" href={s} />)}

					<link rel="shortcut icon" href={template.favicon} />
					{pageHead}
				</head>
				<body>
					<div id="root" dangerouslySetInnerHTML={{ __html: combinedBody }}></div>

					{template.scripts.map((s) => <script src={s} type="module" />)}
					{page.scripts.map((s) => <script src={s} type="module" />)}
				</body>
			</html>,
		);

		return `<!DOCTYPE html>${html}`;
	}
}
