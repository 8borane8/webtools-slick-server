import type { RequestListener } from "@webtools/expressapi";
import type { OnRequest } from "./OnRequest.ts";
import type { Render } from "./Render.ts";

export interface Page {
	readonly url: string;
	readonly title: string;
	readonly template: string;

	readonly styles: Array<string>;
	readonly scripts: Array<string>;

	readonly head: Render | preact.VNode;
	readonly body: Render | preact.VNode;

	readonly onpost: RequestListener | null;
	readonly onrequest: OnRequest | null;
}
