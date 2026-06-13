import { VENDOR_PREFIX } from "../utils/vendors.ts";
import { ISLAND_PREFIX } from "../utils/islands.ts";
import * as esbuild from "esbuild";

// Replaced at build time with VENDOR_PREFIX (see esbuild `define` below).
// The vendor URL is built at runtime instead of using a bare `import("preact")`,
// because JSR (on publish) and Deno (on transpile) rewrite literal specifiers
// into unusable `npm:pkg@version` URLs. A computed specifier is left untouched.
declare const __VENDOR_PREFIX__: string;
declare const __ISLAND_PREFIX__: string;

const islandHydration = () => {
	const hydrated = new WeakSet<Element>();

	async function run(container: Document | Element) {
		const roots = Array.from(container.querySelectorAll("[data-slick-island]")).filter((r) => !hydrated.has(r));
		if (!roots.length) return;

		const { createRootFragment } = await import(__VENDOR_PREFIX__ + "preact-root-fragment");
		const { hydrate, h } = await import(__VENDOR_PREFIX__ + "preact");

		await Promise.all(roots.map(async (root: Element) => {
			hydrated.add(root);
			const name = root.getAttribute("data-slick-island");
			const props = JSON.parse(root.getAttribute("data-slick-props") || "{}");

			const { default: Island } = await import(__ISLAND_PREFIX__ + name);
			hydrate(h(Island, props), createRootFragment(root.parentElement!, root));
		}));
	}

	run(document);
	new MutationObserver(() => run(document)).observe(document, { childList: true, subtree: true });
};

const { code } = await esbuild.transform(`(${islandHydration.toString()})()`, {
	loader: "ts",
	minify: true,
	format: "esm",
	define: {
		__VENDOR_PREFIX__: JSON.stringify(VENDOR_PREFIX),
		__ISLAND_PREFIX__: JSON.stringify(ISLAND_PREFIX),
	},
});

export const ISLAND_HYDRATION_SCRIPT = code;
