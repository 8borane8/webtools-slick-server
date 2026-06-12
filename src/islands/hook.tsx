import { type ComponentType, options, type VNode } from "preact";

export function activateIslandsHook(registry: Map<ComponentType, string>): void {
	const opts = options as { __b?: (vnode: VNode) => void };
	const prevDiff = opts.__b;

	let inject: { name: string; props: string } | null = null;

	opts.__b = (vnode: VNode) => {
		const name = registry.get(vnode.type as ComponentType);
		if (name) {
			inject = { name, props: JSON.stringify(vnode.props) };
		} else if (inject && typeof vnode.type === "string") {
			Object.assign(vnode.props as object, {
				"data-slick-island": inject.name,
				"data-slick-props": inject.props,
			});
			inject = null;
		}
		prevDiff?.(vnode);
	};
}
