import type { HttpRequest } from "@webtools/expressapi";
import type { VNode } from "preact";

export type Render = (req: HttpRequest) => Promise<VNode> | VNode;
