import * as esbuild from "esbuild";

export const islandHydration = () => {
	const hydrated = new WeakSet<Element>();

	async function run(container: Document | Element) {
		const roots = Array.from(container.querySelectorAll("[data-slick-island]")).filter((r) => !hydrated.has(r));
		if (!roots.length) return;

		const { createRootFragment } = await import("preact-root-fragment");
		const { hydrate, h } = await import("preact");

		await Promise.all(roots.map(async (root: Element) => {
			hydrated.add(root);
			const name = root.getAttribute("data-slick-island");
			const props = JSON.parse(root.getAttribute("data-slick-props") || "{}");

			const { default: Island } = await import("/~islands/" + name);
			hydrate(h(Island, props), createRootFragment(root.parentElement!, root));
		}));
	}

	run(document);
	new MutationObserver(() => run(document)).observe(document, { childList: true, subtree: true });
};

export const { code: ISLAND_HYDRATION_SCRIPT } = await esbuild.transform(
	`(${islandHydration.toString()})()`,
	{ minify: true, format: "esm" },
);
