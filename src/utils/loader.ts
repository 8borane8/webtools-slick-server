import { denoPlugin } from "esbuild-plugin";
import * as esbuild from "esbuild";
import * as path from "@std/path";
import * as fs from "@std/fs";

import { libToVendorUrl } from "./vendors.ts";

const RESOLVE_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"] as const;
export const SUPPORTED_EXTENSIONS = new Set<string>(RESOLVE_EXTENSIONS);

const blobCache = new Map<string, string>();
const compiling = new Map<string, Promise<string>>();
const deno = denoPlugin();

const BUNDLE = { bundle: true, format: "esm", write: false, minify: true } as const;
const JSX = { jsx: "automatic", jsxImportSource: "preact" } as const;

export function envToDefine(env: Record<string, string>): Record<string, string> {
	return Object.fromEntries(Object.entries(env).map(([k, v]) => [k, JSON.stringify(v)]));
}

async function bundle(options: esbuild.BuildOptions): Promise<string> {
	const { outputFiles } = await esbuild.build(options);
	if (!outputFiles?.[0]) throw new Error("esbuild produced no output");
	return new TextDecoder().decode(outputFiles[0].contents);
}

function resolveRelativeSource(importer: string, specifier: string): string {
	const dir = importer.startsWith("file:") ? path.dirname(path.fromFileUrl(importer)) : path.dirname(importer);
	const resolved = path.resolve(dir, specifier);

	if (SUPPORTED_EXTENSIONS.has(path.extname(resolved)) && fs.existsSync(resolved)) return resolved;

	for (const ext of RESOLVE_EXTENSIONS) {
		const candidate = `${resolved}${ext}`;
		if (fs.existsSync(candidate)) return candidate;
	}

	throw new Error(`Cannot resolve "${specifier}" from "${importer}"`);
}

function isPackageImport(specifier: string): boolean {
	return !specifier.startsWith(".") && !path.isAbsolute(specifier);
}

function vendorExternalsPlugin(sharedLibs: string[], excludeLib?: string): esbuild.Plugin {
	const vendors = new Map(
		sharedLibs.filter((lib) => lib !== excludeLib).map((lib) => [lib, libToVendorUrl(lib)]),
	);

	return {
		name: "vendor-externals",
		setup(build) {
			build.onResolve({ filter: /.*/ }, ({ path: importPath }) => {
				const url = vendors.get(importPath);
				return url ? { path: url, external: true } : undefined;
			});
		},
	};
}

function packageExternalPlugin(): esbuild.Plugin {
	return {
		name: "package-external",
		setup(build) {
			build.onResolve(
				{ filter: /.*/ },
				({ path: importPath }) =>
					isPackageImport(importPath) ? { path: importPath, external: true } : undefined,
			);
		},
	};
}

function ssrPlugins(workspace: string, define: Record<string, string>): esbuild.Plugin[] {
	return [
		{
			name: "ssr-relative-imports",
			setup(build) {
				build.onResolve({ filter: /^\.\.?\// }, async (args) => ({
					path: await compileModuleToBlobUrl(
						workspace,
						resolveRelativeSource(args.importer, args.path),
						define,
					),
					external: true,
				}));
			},
		},
		packageExternalPlugin(),
		deno,
	];
}

function clientPlugins(sharedLibs: string[]): esbuild.Plugin[] {
	return sharedLibs.length ? [vendorExternalsPlugin(sharedLibs), deno] : [deno];
}

async function compileModuleToBlobUrl(
	workspace: string,
	filePath: string,
	define: Record<string, string>,
): Promise<string> {
	const source = path.resolve(filePath);
	if (!SUPPORTED_EXTENSIONS.has(path.extname(source))) {
		throw new Error(`Unsupported module extension: ${path.extname(source)}`);
	}

	const cached = blobCache.get(source);
	if (cached) return cached;

	const pending = compiling.get(source);
	if (pending) return pending;

	const task = bundle({
		...BUNDLE,
		...JSX,
		entryPoints: [source],
		define,
		absWorkingDir: workspace,
		plugins: ssrPlugins(workspace, define),
	}).then((code) => {
		const url = URL.createObjectURL(new Blob([code], { type: "text/javascript" }));
		blobCache.set(source, url);
		return url;
	});

	compiling.set(source, task);

	try {
		return await task;
	} catch (error) {
		compiling.delete(source);
		throw error;
	}
}

function buildClientEntry(
	workspace: string,
	filePath: string,
	define: Record<string, string>,
	sharedLibs: string[],
): Promise<string> {
	const isJsx = path.extname(filePath) === ".tsx" || path.extname(filePath) === ".jsx";

	return bundle({
		...BUNDLE,
		...(isJsx ? JSX : {}),
		entryPoints: [filePath],
		define,
		absWorkingDir: workspace,
		plugins: clientPlugins(sharedLibs),
	});
}

export function buildVendorBundle(
	workspace: string,
	lib: string,
	sharedLibs: string[],
	define: Record<string, string>,
): Promise<string> {
	const libName = JSON.stringify(lib);

	return bundle({
		...BUNDLE,
		stdin: {
			contents:
				`export * from ${libName}; import * as __ns from ${libName}; export default __ns.default || __ns;`,
			resolveDir: workspace,
		},
		define,
		absWorkingDir: workspace,
		plugins: [vendorExternalsPlugin(sharedLibs, lib), deno],
	});
}

export function buildIslandBundle(
	workspace: string,
	filePath: string,
	sharedLibs: string[],
	define: Record<string, string>,
): Promise<string> {
	return buildClientEntry(workspace, filePath, define, sharedLibs);
}

export function buildStaticAsset(
	workspace: string,
	filePath: string,
	define: Record<string, string>,
	sharedLibs: string[] = [],
): Promise<string> {
	return buildClientEntry(workspace, filePath, define, sharedLibs);
}

export async function loadModuleWithDefine<T>(
	workspace: string,
	filePath: string,
	define: Record<string, string>,
): Promise<T> {
	return await import(await compileModuleToBlobUrl(workspace, filePath, define)) as T;
}
