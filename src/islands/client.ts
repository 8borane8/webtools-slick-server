import { createRootFragment } from "preact-root-fragment";
import { h, hydrate } from "preact";

const hydrated = new WeakSet<Element>();

async function run(container: Document | Element): Promise<void> {
	const roots = Array.from(container.querySelectorAll("[data-slick-island]")).filter((r) => !hydrated.has(r));
	if (!roots.length) return;

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
