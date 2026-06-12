<h1 align="center">Welcome to Slick Server!</h1>

<p align="center">
    <em>
        Slick is a small, simple, and ultrafast web framework built on Web Standards for Deno.
    </em>
</p>

<p align="center">
    <img src="https://img.shields.io/github/issues-closed/8borane8/webtools-slick-server.svg" alt="issues-closed" />
    &nbsp;
    <img src="https://img.shields.io/github/license/8borane8/webtools-slick-server.svg" alt="license" />
    &nbsp;
    <img src="https://img.shields.io/github/stars/8borane8/webtools-slick-server.svg" alt="stars" />
    &nbsp;
    <img src="https://img.shields.io/github/forks/8borane8/webtools-slick-server.svg" alt="forks" />
</p>

<hr>

## ✨ Features

- **Ultrafast & lightweight** Built on [`@webtools/expressapi`](https://jsr.io/@webtools/expressapi) and the native Deno
  HTTP stack with minimal overhead.
- **Server-side rendering** Pages and templates are rendered to HTML with Preact for great SEO and fast first paint.
- **Islands architecture** Ship static HTML by default, then hydrate only the interactive components you mark as
  _islands_.
- **Zero-config asset pipeline** CSS, JS and TS files in `static/` are transpiled and minified on the fly with esbuild,
  then cached.
- **SPA navigation** Optional client mode (`@webtools/slick-client`) swaps pages over `fetch` without full reloads,
  while keeping SSR for the first request.
- **Bring your own npm libraries** Use any npm/JSR package inside islands through automatic, shared, deduplicated vendor
  bundles and an import map.
- **Type-safe** First-class TypeScript and JSX (Preact) support everywhere.
- **Simple by default** Sensible defaults, a tiny configuration surface, and a predictable folder convention.

## 📖 Table of Contents

- [How It Works](#-how-it-works)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Templates](#-templates)
- [Pages](#-pages)
- [Dynamic Rendering](#-dynamic-rendering)
- [Static Files](#-static-files)
- [Islands](#-islands)
- [Shared Libraries & Vendors](#-shared-libraries--vendors)
- [Client Mode (SPA)](#-client-mode-spa)
- [Routing & Reserved Paths](#-routing--reserved-paths)
- [API Reference](#-api-reference)
- [License](#-license)

## 🧠 How It Works

Slick is built around three simple building blocks and a convention-based file system.

```plaintext
             ┌──────────────────────────────────────────────┐
HTTP GET  →  │  Template  +  Page   →  SSR (Preact)  → HTML  │  → Browser
             └──────────────────────────────────────────────┘
                       │
                       ├─ Islands are detected during SSR and tagged in the HTML
                       │
Browser   →  loads the island hydration script
                       │
                       └─ Each tagged element is hydrated with its Preact component,
                          pulling shared libraries from a generated import map.
```

1. **Templates** describe the shared shell of your site (header, footer, `<head>` content). A template must contain an
   element with `id="app"` where page content is injected.
2. **Pages** describe a single route. Each page references a template and provides its own `title`, `head`, `body`,
   styles, scripts and handlers.
3. **Islands** are interactive Preact components that are rendered on the server and _hydrated_ on the client, only the
   islands ship JavaScript, the rest stays static HTML.

When **client mode** is enabled, navigation between pages happens over `fetch`: the server returns a JSON payload (only
the parts that changed) and the client patches the DOM instead of reloading the page.

## 📦 Installation

### Step 1: Add the package

```bash
deno add jsr:@webtools/slick-server
```

### Step 2: Configure `deno.json`

JSX must be configured for Preact, otherwise pages and templates won't compile.

```json
{
	"imports": {
		"@webtools/slick-server": "jsr:@webtools/slick-server@^0.6.0"
	},
	"compilerOptions": {
		"jsxImportSource": "preact",
		"jsx": "react-jsx"
	}
}
```

### Optional: Enable SPA mode

If you plan to use client mode (`client: true`), also add the client package:

```bash
deno add jsr:@webtools/slick-client
```

```json
{
	"imports": {
		"@webtools/slick-server": "jsr:@webtools/slick-server@^0.6.0",
		"@webtools/slick-client": "jsr:@webtools/slick-client@^0.3.0"
	},
	"compilerOptions": {
		"jsxImportSource": "preact",
		"jsx": "react-jsx"
	}
}
```

## 🚀 Quick Start

### 1. Create the project structure

```plaintext
my-slick-app/
├── pages/
│   └── index.tsx
├── templates/
│   └── app.tsx
├── static/
│   ├── styles/
│   └── scripts/
└── server.ts
```

### 2. Start the server (`server.ts`)

```ts
import { Slick } from "@webtools/slick-server";

const app = new Slick(import.meta.dirname!, {
	env: {
		API_URL: Deno.env.get("API_URL") ?? "http://localhost:3000",
	},
	port: 5000,
	lang: "en",
	r404: "/",
	client: true, // Enable SPA navigation
});

await app.start();
```

### 3. Create a template (`templates/app.tsx`)

```tsx
import type { Template } from "@webtools/slick-server";

export default {
	name: "app",
	favicon: "/assets/favicon.ico",

	styles: ["/styles/reset.css", "/styles/app.css"],
	scripts: ["/scripts/app.ts"],

	head: <meta name="description" content="My Slick App" />,
	body: (
		<>
			<header>
				<nav>
					<a href="/">Home</a>
					<a href="/about">About</a>
				</nav>
			</header>
			<main id="app">{/* Page content is injected here */}</main>
		</>
	),

	onrequest: null,
} satisfies Template;
```

### 4. Create a page (`pages/index.tsx`)

```tsx
import type { Page } from "@webtools/slick-server";

export default {
	url: "/",
	template: "app",
	title: "Home - My App",

	styles: ["/styles/pages/index.css"],
	scripts: ["/scripts/pages/index.ts"],

	head: <meta property="og:title" content="Home" />,
	body: (
		<>
			<h1>Welcome to Slick Server!</h1>
			<p>This is your home page.</p>
		</>
	),

	onpost: null,
	onrequest: null,
} satisfies Page;
```

### 5. Run it

```bash
deno run -A server.ts
```

> Slick relies on esbuild (for transpiling assets, islands and vendor bundles) and dynamically imports your pages,
> templates and islands. The `-A` flag is the simplest way to grant the required permissions. For a tighter sandbox you
> need at least `--allow-net --allow-read --allow-env --allow-run --allow-write`.

## 📁 Project Structure

Slick uses a strict, convention-based layout. The `templates/`, `pages/` and `static/` directories are **required**; the
`islands/` directory is **optional**.

```plaintext
project-root/
├── pages/          # Route definitions      (required)
│   ├── index.tsx
│   └── about.tsx
├── templates/      # Page shells            (required)
│   ├── app.tsx
│   └── admin.tsx
├── islands/        # Interactive components (optional)
│   └── Counter.tsx
└── static/         # Public assets          (required)
    ├── styles/
    │   ├── reset.css
    │   └── app.css
    ├── scripts/
    │   └── app.ts
    └── assets/
        └── favicon.ico
```

| Directory    | Required | Description                                                                                          |
| ------------ | :------: | ---------------------------------------------------------------------------------------------------- |
| `pages/`     |    ✅    | Each file (`.ts`, `.tsx`, `.js`, `.jsx`) must `export default` a `Page`. Subdirectories are scanned. |
| `templates/` |    ✅    | Each file must `export default` a `Template`. Subdirectories are scanned.                            |
| `static/`    |    ✅    | Served at the site root. CSS/JS/TS are transpiled and minified; everything else is served as-is.     |
| `islands/`   |    ⬜    | Each file must `export default` a Preact function component to be hydrated on the client.            |

> Pages and templates are discovered recursively, so you can organize them in nested folders freely.

## ⚙️ Configuration

The `Slick` constructor takes the workspace path and a partial configuration object:

```ts
new Slick(workspace: string, config: Partial<Config>)
```

```ts
interface Config {
	env: Record<string, string>; // Variables injected into static files, islands and vendors
	port: number; // HTTP port
	lang: string; // <html lang="..."> attribute
	r404: string; // Fallback URL when no route/asset matches
	client: boolean | string; // SPA mode: false, true, or a custom client URL
	noCache: boolean; // Disable the compiled-asset in-memory cache
	trustProxy: boolean; // Trust X-Forwarded-* headers (behind a reverse proxy)
	sharedLibs: string[]; // Extra libraries made available to islands
}
```

### Options

| Option       | Type                     | Default | Description                                                                                                                                           |
| ------------ | ------------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `env`        | `Record<string, string>` | `{}`    | Compile-time constants injected via esbuild `define` into static scripts, islands and vendor bundles.                                                 |
| `port`       | `number`                 | `5000`  | Port the HTTP server listens on.                                                                                                                      |
| `lang`       | `string`                 | `"en"`  | Value of the HTML `lang` attribute.                                                                                                                   |
| `r404`       | `string`                 | `"/"`   | Page URL to redirect to when a route or asset is not found. **Must match an existing page.**                                                          |
| `client`     | `boolean \| string`      | `false` | `true` injects `@webtools/slick-client` from `esm.sh`; a string uses it as a custom client script URL.                                                |
| `noCache`    | `boolean`                | `false` | When `true`, compiled assets are recompiled on every request (useful during development).                                                             |
| `trustProxy` | `boolean`                | `false` | Forwarded to the underlying HTTP server to honor proxy headers (real client IP, protocol, etc.).                                                      |
| `sharedLibs` | `string[]`               | `[]`    | Libraries bundled once globally and shared across all islands (avoids duplicating them in every island bundle). Merged with the built-in Preact libs. |

## 🎨 Templates

A `Template` defines the structure shared across the pages that use it.

```ts
interface Template {
	name: string; // Unique template name (referenced by pages)
	favicon: Render<string> | null; // Favicon URL (static or dynamic)
	styles: string[]; // Global stylesheet URLs
	scripts: string[]; // Global module script URLs
	head: Render<VNode> | null; // Extra <head> content
	body: Render<VNode> | null; // Shell markup, must contain an element with id="app"
	onrequest: RequestListener | null; // Middleware run before every page using this template
}
```

```tsx
import type { Template } from "@webtools/slick-server";

export default {
	name: "app",
	favicon: "/assets/favicon.ico",

	styles: ["/styles/reset.css", "/styles/global.css"],
	scripts: ["/scripts/global.ts"],

	head: (
		<>
			<meta name="theme-color" content="#000000" />
			<link rel="preconnect" href="https://fonts.googleapis.com" />
		</>
	),

	body: (
		<>
			<header>
				<nav>
					<a href="/">Home</a>
					<a href="/about">About</a>
				</nav>
			</header>
			<main id="app">{/* Page content injected here */}</main>
			<footer>
				<p>&copy; 2026 My App</p>
			</footer>
		</>
	),

	onrequest: null,
} satisfies Template;
```

> **Required:** the template `body` must contain exactly one element with `id="app"`. The page's `body` is injected as
> the children of that element.

## 📄 Pages

A `Page` defines a single route, the template it uses, and its content.

```ts
interface Page {
	url: string; // Route path (must start with "/")
	template: string; // Name of the template to render into
	title: Render<string> | null; // Document <title>
	styles: string[]; // Page-specific stylesheet URLs
	scripts: string[]; // Page-specific module script URLs
	head: Render<VNode> | null; // Extra <head> content for this page
	body: Render<VNode> | null; // Page content (injected into the template's #app)
	onpost: RequestListener | null; // Handler for POST requests to this URL
	onrequest: RequestListener | null; // Middleware run before rendering this page
}
```

### Example

```tsx
import type { Page } from "@webtools/slick-server";
import type { HttpRequest, HttpResponse } from "@webtools/expressapi";

export default {
	url: "/about",
	template: "app",
	title: "About Us",

	styles: ["/styles/pages/about.css"],
	scripts: ["/scripts/pages/about.ts"],

	head: <meta name="description" content="Learn more about us" />,
	body: (
		<>
			<h1>About Us</h1>
			<p>We are a great company!</p>
		</>
	),

	onpost: (req: HttpRequest, res: HttpResponse) => res.json({ success: true }),

	onrequest: (req: HttpRequest, res: HttpResponse) => {
		if (!req.headers.has("authorization")) return res.redirect("/login");
	},
} satisfies Page;
```

### Middleware (`onrequest`)

`onrequest` runs **before** the page is rendered, for both the template (`template.onrequest`) and the page
(`page.onrequest`), in that order. Return a response (e.g. `res.redirect(...)`) to short-circuit rendering; return
nothing to continue.

### POST handling (`onpost`)

`onpost` is called for `POST` requests to the page URL. In client (SPA) mode, `POST` requests carrying the
`X-Slick-Template` header are intercepted by Slick to perform SPA navigation, so use `onpost` for your own form
submissions and API endpoints on standard POST requests.

## 🔁 Dynamic Rendering

`title`, `favicon`, `head` and `body` accept a `Render<T>` value: either a static value, or a (possibly async) function
of the request.

```ts
type Render<T> = ((req: HttpRequest) => Promise<T> | T) | T;
```

```tsx
import type { Page } from "@webtools/slick-server";
import type { HttpRequest } from "@webtools/expressapi";

export default {
	url: "/products/:id",
	template: "app",
	title: (req: HttpRequest) => `Product ${req.url.split("/").pop()}`,

	body: async (req: HttpRequest) => {
		const productId = req.url.split("/").pop();
		const product = await fetchProduct(productId);
		return (
			<>
				<h1>{product.name}</h1>
				<p>{product.description}</p>
				<p>Price: ${product.price}</p>
			</>
		);
	},

	styles: [],
	scripts: [],
	head: null,
	onpost: null,
	onrequest: null,
} satisfies Page;
```

## 📦 Static Files

Everything inside `static/` is served from the site root (e.g. `static/styles/app.css` → `/styles/app.css`). Path
traversal outside `static/` is blocked.

| File type       | Handling                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| `.css`          | Minified, served as `text/css`.                                           |
| `.js` / `.ts`   | Transpiled (TS → JS), minified, served as ES modules (`text/javascript`). |
| Everything else | Served as-is (images, fonts, JSON, etc.).                                 |

Compiled CSS/JS/TS results are cached in memory after the first request. Set `noCache: true` to recompile on every
request during development.

### Environment variables in static scripts

Keys from `config.env` are injected at compile time via esbuild `define`, so you can reference them directly:

```ts
// static/scripts/app.ts
console.log(API_URL); // Replaced with the value from config.env at build time
```

## 🏝️ Islands

Islands are interactive Preact components that are **rendered on the server** and **hydrated on the client**. Only
islands ship JavaScript to the browser, the rest of the page stays static HTML. This keeps pages fast while still
allowing rich interactivity exactly where you need it.

### 1. Create an island (`islands/Counter.tsx`)

Each island file must `export default` a Preact function component.

```tsx
import { useSignal } from "@preact/signals";

interface Props {
	start: number;
	label?: string;
}

export default function Counter({ start, label = "Counter" }: Props) {
	const count = useSignal(start);

	return (
		<div style="display:flex;align-items:center;gap:12px">
			<strong>{label}</strong>
			<button type="button" onClick={() => count.value--}>−</button>
			<span>{count}</span>
			<button type="button" onClick={() => count.value++}>+</button>
		</div>
	);
}
```

### 2. Use it inside a page or template

Import the island like any component and use it in your JSX. Slick automatically detects it during SSR, tags it in the
HTML, and hydrates it on the client.

```tsx
import type { Page } from "@webtools/slick-server";
import Counter from "../islands/Counter.tsx";

export default {
	url: "/",
	template: "app",
	title: "Home",

	body: (
		<section>
			<h1>Interactive counters</h1>
			<Counter start={0} label="A" />
			<Counter start={100} label="B" />
		</section>
	),

	styles: [],
	scripts: [],
	head: null,
	onpost: null,
	onrequest: null,
} satisfies Page;
```

That's it, no manual registration, no extra script tags. The hydration runtime is injected automatically whenever at
least one island exists, and it even hydrates islands added later via SPA navigation.

> **Props must be JSON-serializable.** Island props are serialized on the server and parsed on the client to re-create
> the component. Plain data (numbers, strings, booleans, arrays, objects) works; functions and class instances do not
> survive hydration.

### How islands work under the hood

- During SSR, a Preact hook tags each island's root element with `data-slick-island` (its file name) and
  `data-slick-props` (its serialized props).
- A tiny hydration script scans the DOM, lazily imports each island from `/~islands/<name>`, and hydrates it in place
  with Preact.
- A `MutationObserver` re-runs hydration when new islands appear (e.g. after SPA navigation).
- Each island is bundled individually with esbuild; shared libraries are kept external and loaded once (see below).

## 📚 Shared Libraries & Vendors

Each island is bundled **individually** with esbuild. By default, esbuild inlines every dependency an island imports
directly into that island's bundle. So if three islands all import `chart.js`, the **entire `chart.js` library gets
duplicated three times** once in each bundle, and the browser downloads and parses it three times.

`sharedLibs` solves this. A shared library is **bundled once, globally**, into a standalone **vendor bundle** served
from `/~vendors/<lib>`. It is then kept _external_ to every island bundle: instead of inlining the code, islands simply
`import` it, and a generated `<script type="importmap">` redirects that import to the single shared vendor bundle. The
result: each shared library is downloaded, parsed and cached **once**, no matter how many islands use it.

```plaintext
Without sharedLibs                         With sharedLibs
─────────────────                          ───────────────
island A [ chart.js ⨉ full copy ]        island A ─┐
island B [ chart.js ⨉ full copy ]        island B ─┼─→ import map ─→ /~vendors/chart.js  (one copy)
island C [ chart.js ⨉ full copy ]        island C ─┘
```

### Libraries bundled by default

The Preact ecosystem is always treated as shared, so these are **available to every island out of the box** (you don't
need to add them to `sharedLibs`):

- `preact`
- `preact/hooks`
- `preact/jsx-runtime`
- `@preact/signals`
- `preact-root-fragment`

`sharedLibs` is **merged** with this built-in list, so anything you declare is added on top of the defaults.

> **Rule of thumb:** any third-party library imported by **more than one island** (or any large library imported even
> once) should be added to `sharedLibs` to avoid duplicating it across bundles.

To use **any other npm/JSR package** inside an island, add it in two places:

1. Your `deno.json` `imports` (so Deno and esbuild can resolve it).
2. The `sharedLibs` config option (so Slick exposes it through the import map).

```ts
// server.ts
const app = new Slick(import.meta.dirname!, {
	client: true,
	sharedLibs: ["chart.js", "canvas-confetti", "marked"],
});

await app.start();
```

```json
// deno.json
{
	"imports": {
		"@webtools/slick-server": "jsr:@webtools/slick-server@^0.6.0",
		"chart.js": "npm:chart.js@^4.5.1",
		"canvas-confetti": "npm:canvas-confetti@^1.9.4",
		"marked": "npm:marked@^18.0.5"
	},
	"compilerOptions": {
		"jsxImportSource": "preact",
		"jsx": "react-jsx"
	}
}
```

You can now import those libraries directly in your islands:

```tsx
// islands/BarChart.tsx
import { useEffect, useRef } from "preact/hooks";
import { BarController, BarElement, CategoryScale, Chart, LinearScale } from "chart.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale);

export default function BarChart({ labels, values }: { labels: string[]; values: number[] }) {
	const canvas = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		if (!canvas.current) return;
		const chart = new Chart(canvas.current, {
			type: "bar",
			data: { labels, datasets: [{ data: values }] },
		});
		return () => chart.destroy();
	}, []);

	return <canvas ref={canvas} />;
}
```

## 🔄 Client Mode (SPA)

When `client` is set, Slick turns your multi-page app into a single-page app **without giving up SSR**:

- The **first request** of every page is fully server-rendered (great for SEO and first paint).
- Subsequent **navigations** are performed over `fetch`: the server returns a JSON payload describing only what changed
  (the page, and the template only if it differs), and the client patches the DOM.

### Enabling it

```ts
// Use the default client served from esm.sh
const app = new Slick(import.meta.dirname!, { client: true });
```

```ts
// Or point to a custom client build (CDN, local file, etc.)
const app = new Slick(import.meta.dirname!, {
	client: "https://cdn.example.com/slick-client.js",
});
```

### How it works

- With `client: true`, Slick injects `@webtools/slick-client` from `https://esm.sh/jsr/@webtools/slick-client@^0.3.0`.
- With `client: "<url>"`, your custom URL is injected instead.
- The client initializes with the current template name and intercepts navigations.
- On navigation, the server is asked (via the `X-Slick-Template` header) for a JSON payload containing the new page, and
  the template too, only when it changed, which the client applies in place.
- `styles` and `scripts` marked with a `slick-type` attribute let the client swap page/template assets correctly between
  navigations.

## 🧭 Routing & Reserved Paths

For each registered page, Slick exposes:

- `GET <page.url> server-rendered HTML (or SPA JSON in client mode).
- `POST <page.url> routed to`onpost`, or handled by Slick for SPA navigation when the`X-Slick-Template` header is
  present.

The following path prefixes are **reserved** by Slick and should not be used for your own routes or static files:

| Path          | Purpose                                      |
| ------------- | -------------------------------------------- |
| `/~islands/*` | Per-island client bundles.                   |
| `/~vendors/*` | Shared library (vendor) bundles for islands. |

Any request that matches no page, reserved path, or static file is redirected to `r404`.

## 🔌 API Reference

### `Slick`

```ts
class Slick {
	constructor(workspace: string, config: Partial<Config>);
	start(): Promise<void>;
}
```

#### `new Slick(workspace, config)`

- **`workspace`** Absolute path to your project root. Use `import.meta.dirname!`.
- **`config`** A partial [`Config`](#-configuration); any omitted option falls back to its default.

#### `start(): Promise<void>`

Validates the workspace, loads islands, templates and pages, registers all routes, and starts the HTTP server. It throws
if:

- the workspace or a required directory (`templates/`, `static/`, `pages/`) is missing,
- the `r404` URL does not match any page,
- a page references a template that does not exist,
- an island file does not `export default` a function component.

```ts
await app.start();
```

### Exported types

| Export     | Description                                      |
| ---------- | ------------------------------------------------ |
| `Slick`    | The server class.                                |
| `Config`   | The configuration interface.                     |
| `Page`     | The shape of a default-exported page module.     |
| `Template` | The shape of a default-exported template module. |

```ts
import { type Config, type Page, Slick, type Template } from "@webtools/slick-server";
```

## 📝 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
