import type { HttpRequest } from "@webtools/expressapi";

export type OnRequest = (req: HttpRequest) => Promise<string | void> | string | void;
