import * as esbuild from "esbuild";

export const VENDOR_PREFIX = "/~vendors/";

export const libToVendorUrl = (lib: string) => `${VENDOR_PREFIX}${lib}`;
export const vendorUrlToLib = (url: string) => url.slice(VENDOR_PREFIX.length);

export function crossRedirectPlugin(sharedLibs: string[], currentLib: string): esbuild.Plugin {
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

const SHARED_CONFIG = {
	bundle: true,
	format: "esm",
	write: false,
	minify: true,
} as const satisfies Partial<esbuild.BuildOptions>;

export async function buildVendorBundle(
	lib: string,
	sharedLibs: string[],
	define: Record<string, string>,
): Promise<string> {
	const libName = JSON.stringify(lib);

	const { outputFiles } = await esbuild.build({
		...SHARED_CONFIG,
		stdin: {
			contents:
				`export * from ${libName}; import * as __ns from ${libName}; export default __ns.default || __ns;`,
			resolveDir: Deno.cwd(),
		},
		define,
		plugins: [crossRedirectPlugin(sharedLibs, lib)],
	});

	return new TextDecoder().decode(outputFiles[0].contents);
}
