import * as path from "@std/path";
import * as fs from "@std/fs";

import { SUPPORTED_EXTENSIONS } from "./loader.ts";

export function watchDirectory(dir: string, onChange: (filePath: string) => void | Promise<void>): void {
	if (!fs.existsSync(dir)) return;

	const root = path.resolve(dir);
	const pending = new Map<string, ReturnType<typeof setTimeout>>();

	(async () => {
		for await (const { kind, paths } of Deno.watchFs(root, { recursive: true })) {
			if (kind !== "create" && kind !== "modify") continue;

			for (const filePath of paths) {
				const resolved = path.resolve(filePath);
				const relative = path.relative(root, resolved);

				if (relative.startsWith("..") || path.isAbsolute(relative)) continue;
				if (!SUPPORTED_EXTENSIONS.has(path.extname(resolved))) continue;

				clearTimeout(pending.get(resolved));

				pending.set(
					resolved,
					setTimeout(() => {
						pending.delete(resolved);
						Promise.resolve(onChange(resolved)).catch(console.error);
					}, 50),
				);
			}
		}
	})().catch(console.error);
}
