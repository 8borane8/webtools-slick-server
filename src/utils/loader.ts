import { denoPlugin } from "esbuild-plugin";
import * as esbuild from "esbuild";
import * as path from "@std/path";

import { libToVendorUrl } from "./vendors.ts";

const JS_EXTENSIONS = new Set([".ts", ".js"]);
const JSX_EXTENSIONS = new Set([".tsx", ".jsx"]);

export const SUPPORTED_EXTENSIONS = new Set([...JS_EXTENSIONS, ...JSX_EXTENSIONS]);

const BUNDLE_CONFIG = {
	bundle: true,
	format: "esm",
	write: false,
	minify: true,
} as const satisfies Partial<esbuild.BuildOptions>;

const JSX_CONFIG = {
	jsx: "automatic",
	jsxImportSource: "preact",
} as const satisfies Partial<esbuild.BuildOptions>;

export function envToDefine(env: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(env).map(([k, v]) => [k, JSON.stringify(v)]),
	);
}

function crossRedirectPlugin(sharedLibs: string[], currentLib: string): esbuild.Plugin {
	const externals = new Map(
		sharedLibs
			.filter((lib) => lib !== currentLib)
			.map((lib) => [lib, libToVendorUrl(lib)]),
	);

	return {
		name: "vendor-cross-redirect",
		setup(build) {
			build.onResolve({ filter: /.*/ }, ({ path }) => {
				const url = externals.get(path);
				return url ? { path: url, external: true } : undefined;
			});
		},
	};
}

export async function buildVendorBundle(
	workspace: string,
	lib: string,
	sharedLibs: string[],
	define: Record<string, string>,
): Promise<string> {
	const libName = JSON.stringify(lib);

	const { outputFiles } = await esbuild.build({
		...BUNDLE_CONFIG,
		stdin: {
			contents:
				`export * from ${libName}; import * as __ns from ${libName}; export default __ns.default || __ns;`,
			resolveDir: workspace,
		},
		define,
		absWorkingDir: workspace,
		plugins: [
			crossRedirectPlugin(sharedLibs, lib),
			denoPlugin(),
		],
	});

	return new TextDecoder().decode(outputFiles[0].contents);
}

export async function buildIslandBundle(
	workspace: string,
	filePath: string,
	sharedLibs: string[],
	define: Record<string, string>,
): Promise<string> {
	const { outputFiles } = await esbuild.build({
		...BUNDLE_CONFIG,
		...JSX_CONFIG,
		entryPoints: [filePath],
		external: sharedLibs,
		define,
		absWorkingDir: workspace,
		plugins: [denoPlugin()],
	});

	return new TextDecoder().decode(outputFiles[0].contents);
}

export function buildStaticAsset(workspace: string, filePath: string, define: Record<string, string>): string {
	const isJsx = JSX_EXTENSIONS.has(path.extname(filePath));

	const { outputFiles } = esbuild.buildSync({
		...BUNDLE_CONFIG,
		...(isJsx ? JSX_CONFIG : {}),
		entryPoints: [filePath],
		define,
		absWorkingDir: workspace,
		plugins: [denoPlugin()],
	});

	return new TextDecoder().decode(outputFiles[0].contents);
}

function externalizeRelativeImportsPlugin(): esbuild.Plugin {
	return {
		name: "externalize-relative-imports",
		setup(build) {
			build.onResolve({ filter: /^\.\.?\// }, (args) => {
				const dir = args.importer.startsWith("file:")
					? path.dirname(path.fromFileUrl(args.importer))
					: path.dirname(args.importer);

				return {
					path: path.toFileUrl(path.resolve(dir, args.path)).href,
					external: true,
				};
			});
		},
	};
}

export async function loadModuleWithDefine<T>(
	workspace: string,
	filePath: string,
	define: Record<string, string>,
): Promise<T> {
	if (!SUPPORTED_EXTENSIONS.has(path.extname(filePath))) {
		throw new Error(`Unsupported module extension: ${path.extname(filePath)}`);
	}

	const { outputFiles } = await esbuild.build({
		...BUNDLE_CONFIG,
		...JSX_CONFIG,
		entryPoints: [filePath],
		define,
		absWorkingDir: workspace,
		plugins: [
			externalizeRelativeImportsPlugin(),
			denoPlugin(),
		],
	});

	const code = new TextDecoder().decode(outputFiles[0].contents);
	const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));

	try {
		return await import(url) as T;
	} finally {
		URL.revokeObjectURL(url);
	}
}
