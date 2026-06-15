import { VENDOR_PREFIX } from "../utils/vendors.ts";
import { ISLAND_PREFIX } from "../utils/islands.ts";
import * as esbuild from "esbuild";

declare const __VENDOR_PREFIX__: string;
declare const __ISLAND_PREFIX__: string;

const islandHydration = () => {
	const hydrated = new WeakSet<Element>();
	let pending: Promise<void> | null = null;

	async function run(container: Document | Element) {
		if (pending) await pending;
		pending = doRun(container);
		await pending;
		pending = null;
	}

	async function doRun(container: Document | Element) {
		const roots = Array.from(container.querySelectorAll("[data-slick-island]")).filter((r) =>
			!hydrated.has(r) && r.isConnected
		);

		if (!roots.length) return;
		for (const root of roots) hydrated.add(root);

		const { createRootFragment } = await import(__VENDOR_PREFIX__ + "preact-root-fragment");
		const { hydrate, h } = await import(__VENDOR_PREFIX__ + "preact");

		await Promise.all(roots.map(async (root: Element) => {
			if (!root.isConnected) return;

			const name = root.getAttribute("data-slick-island");
			const props = JSON.parse(root.getAttribute("data-slick-props") || "{}");
			try {
				const { default: Island } = await import(__ISLAND_PREFIX__ + name);
				hydrate(h(Island, props), createRootFragment(root.parentElement!, root));
			} catch (e) {
				hydrated.delete(root);
				console.error(`Failed to hydrate island ${name}`, e);
			}
		}));
	}

	let scheduled = false;
	const observer = new MutationObserver(() => {
		if (scheduled) return;
		scheduled = true;
		queueMicrotask(() => {
			scheduled = false;
			run(document);
		});
	});

	run(document);
	observer.observe(document, { childList: true, subtree: true });
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
