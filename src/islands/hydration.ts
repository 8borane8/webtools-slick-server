import * as esbuild from "esbuild";
import * as path from "@std/path";

const CLIENT_ENTRY = path.fromFileUrl(import.meta.resolve("./client.ts"));

const { outputFiles } = await esbuild.build({
	entryPoints: [CLIENT_ENTRY],
	bundle: true,
	format: "esm",
	minify: true,
	write: false,
	external: ["preact", "preact-root-fragment"],
});

export const ISLAND_HYDRATION_SCRIPT = new TextDecoder().decode(outputFiles[0].contents);
