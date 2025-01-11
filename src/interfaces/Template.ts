import type { OnRequest } from "./OnRequest.ts";
import type { Render } from "./Render.ts";

import type preact from "preact";

export interface Template {
	readonly name: string;
	readonly favicon: string;

	readonly styles: Array<string>;
	readonly scripts: Array<string>;

	readonly head: Render | preact.VNode;
	readonly body: Render | preact.VNode;

	readonly onrequest: OnRequest | null;
}
