export interface Config {
	// deno-lint-ignore no-explicit-any
	readonly env: any;
	readonly port: number;
	readonly lang: string;
	readonly r404: string;
	readonly client: boolean;
}
