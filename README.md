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

- **Fast and lightweight** - Built for performance with minimal overhead
- **Server-side rendering** - Built-in SSR with Preact for optimal SEO
- **Automatic asset optimization** - CSS, JS, and TS files are minified and transpiled automatically
- **SPA capabilities** - Seamless client-side navigation with `@webtools/slick-client`
- **Type-safe** - Full TypeScript support with type checking
- **Static file serving** - Efficient static asset delivery
- **Easy configuration** - Simple setup with sensible defaults
- **Web Standards** - Built on modern web standards and Deno

## 📦 Installation

### Step 1: Install the Package

Install Slick Server using Deno's package manager:

```bash
deno add jsr:@webtools/slick-server
```

### Step 2: Configure `deno.json`

Create or update your `deno.json` file with the required configuration:

```json
{
	"imports": {
		"@webtools/slick-server": "jsr:@webtools/slick-server@^0.4.2"
	},
	"compilerOptions": {
		"jsxImportSource": "preact",
		"jsx": "react-jsx"
	}
}
```

**Important**: The `compilerOptions` are required for JSX to work with Preact. Without them, you'll get compilation
errors when using JSX syntax in your pages and templates.

### Optional: Add Client Package

If you're using SPA mode (`client: true`), also install the client package:

```bash
deno add jsr:@webtools/slick-client
```

And add it to your `deno.json`:

```json
{
	"imports": {
		"@webtools/slick-server": "jsr:@webtools/slick-server@^0.4.2",
		"@webtools/slick-client": "jsr:@webtools/slick-client@^0.2.15"
	},
	"compilerOptions": {
		"jsxImportSource": "preact",
		"jsx": "react-jsx"
	}
}
```

## 🚀 Quick Start

### 1. Create Project Structure

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

### 2. Setup Server (`server.ts`)

```ts
import { Slick } from "@webtools/slick-server";

const slick = new Slick(import.meta.dirname!, {
	env: {
		API_URL: Deno.env.get("API_URL") || "http://localhost:3000",
	},
	port: 5000,
	lang: "en",
	r404: "/",
	client: true, // Enable SPA mode
});

await slick.start();
```

### 3. Create a Template (`templates/app.tsx`)

```tsx
import * as Slick from "@webtools/slick-server";

export default {
	name: "app",
	favicon: "/favicon.ico",

	styles: [
		"/styles/reset.css",
		"/styles/app.css",
	],
	scripts: [
		"/scripts/app.ts",
	],

	head: (
		<>
			<meta name="description" content="My Slick App" />
		</>
	),
	body: (
		<div id="app">
			{/* Page content will be injected here */}
		</div>
	),

	onrequest: null,
} satisfies Slick.Template;
```

### 4. Create a Page (`pages/index.tsx`)

```tsx
import * as Slick from "@webtools/slick-server";

export default {
	url: "/",
	template: "app",

	title: "Home - My App",

	styles: [
		"/styles/pages/index.css",
	],
	scripts: [
		"/scripts/pages/index.ts",
	],

	head: (
		<>
			<meta property="og:title" content="Home" />
		</>
	),
	body: (
		<>
			<h1>Welcome to Slick Server!</h1>
			<p>This is your home page.</p>
		</>
	),

	onpost: null,
	onrequest: null,
} satisfies Slick.Page;
```

### 5. Run Your Server

```bash
deno run --allow-net --allow-read server.ts
```

## 📁 Project Structure

Slick Server requires a specific directory structure:

```
project-root/
├── pages/          # Page definitions (required)
│   ├── index.tsx
│   └── about.tsx
├── templates/      # Template definitions (required)
│   ├── app.tsx
│   └── admin.tsx
└── static/         # Static assets (required)
    ├── styles/
    │   ├── reset.css
    │   └── app.css
    ├── scripts/
    │   └── app.ts
    └── assets/
        └── favicon.ico
```

### Directory Descriptions

- **`pages/`** - Contains page components. Each file must export a default `Page` object.
- **`templates/`** - Contains template structures. Each file must export a default `Template` object.
- **`static/`** - All files are served as static assets. CSS, JS, and TS files are automatically minified and
  transpiled.

## ⚙️ Configuration

The `Slick` constructor accepts a configuration object:

```ts
interface Config {
	env: Record<string, string>; // Environment variables for static files
	port: number; // Server port (default: 5000)
	lang: string; // HTML lang attribute (default: "en")
	r404: string; // 404 redirect URL (default: "/")
	client: boolean | string; // Enable SPA mode (default: false) or custom client URL
}
```

### Configuration Options

| Option   | Type                     | Default | Description                                                                                 |
| -------- | ------------------------ | ------- | ------------------------------------------------------------------------------------------- |
| `env`    | `Record<string, string>` | `{}`    | Environment variables available in static files via `esbuild.define`                        |
| `port`   | `number`                 | `5000`  | Port number for the HTTP server                                                             |
| `lang`   | `string`                 | `"en"`  | Language code for the HTML `lang` attribute                                                 |
| `r404`   | `string`                 | `"/"`   | URL to redirect to when a page is not found                                                 |
| `client` | `boolean \| string`      | `false` | Enable SPA mode with `@webtools/slick-client` or provide custom client URL (e.g., CDN link) |

## 📄 Pages

A `Page` object defines a route and its content:

```tsx
interface Page {
	url: string; // Route URL (must start with /)
	template: string; // Template name to use
	title: Render<string> | null; // Page title (static or dynamic)
	styles: string[]; // CSS file paths
	scripts: string[]; // JS/TS file paths
	head: Render<preact.VNode> | null; // Additional head content
	body: Render<preact.VNode> | null; // Page body content
	onpost: RequestListener | null; // POST request handler
	onrequest: RequestListener | null; // Request middleware (use res.redirect() for redirects)
}
```

### Page Example

```tsx
import * as Slick from "@webtools/slick-server";
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

	onpost: async (req: HttpRequest, res: HttpResponse) => {
		// Handle POST requests
		return res.json({ success: true });
	},

	onrequest: async (req: HttpRequest, res: HttpResponse) => {
		// Middleware - can redirect or modify request
		if (!req.headers.has("authorization")) {
			return res.redirect("/login");
		}
	},
} satisfies Slick.Page;
```

### Render Type

The `title`, `favicon`, `head` and `body` properties accept a generic `Render<T>` type:

```ts
type Render<T> =
	| ((req: HttpRequest) => Promise<T> | T)
	| T;
```

You can use:

- **Static value**: `"My page title"` or `<div>Hello</div>`
- **Function**: `(req) => \`Hello ${req.url}\` or `(req) => <div>Hello {req.url}</div>`
- **Async Function**: `async (req) => { const data = await fetchData(); return <div>{data}</div>; }`

## 🎨 Templates

A `Template` object defines the page structure:

```tsx
interface Template {
	name: string; // Unique template name
	favicon: Render<string> | null; // Favicon path (static or dynamic)
	styles: string[]; // Global CSS files
	scripts: string[]; // Global JS/TS files
	head: Render<preact.VNode> | null; // Global head content
	body: Render<preact.VNode> | null; // Template body (must contain element with id="app")
	onrequest: RequestListener | null; // Global request middleware (use res.redirect() for redirects)
}
```

### Template Example

```tsx
import * as Slick from "@webtools/slick-server";

export default {
	name: "app",
	favicon: "/assets/favicon.ico",

	styles: [
		"/styles/reset.css",
		"/styles/global.css",
	],
	scripts: [
		"/scripts/global.ts",
	],

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
			<main id="app">
				{/* Page content injected here */}
			</main>
			<footer>
				<p>&copy; 2024 My App</p>
			</footer>
		</>
	),

	onrequest: null,
} satisfies Slick.Template;
```

**Important**: The template's `body` must contain an element with `id="app"` where page content will be injected.

## 📦 Static Files

All files in the `static/` directory are served directly. Special handling applies to:

### CSS Files

- Automatically minified
- Served with `Content-Type: text/css`

### JavaScript/TypeScript Files

- Automatically transpiled (TS → JS)
- Automatically minified
- Served as ES modules
- Environment variables from `config.env` are available via `esbuild.define`

### Other Files

- Served as-is (images, fonts, etc.)

### Example Static File Structure

```
static/
├── styles/
│   ├── reset.css
│   ├── app.css
│   └── pages/
│       └── index.css
├── scripts/
│   ├── app.ts
│   └── pages/
│       └── index.ts
└── assets/
    ├── favicon.ico
    └── logo.png
```

### Using Environment Variables in Static Files

Environment variables defined in `config.env` are available in your static TypeScript/JavaScript files:

```ts
// static/scripts/app.ts
console.log(API_URL); // Available if defined in config.env
```

## 🔄 Client Mode (SPA)

When `client: true` is enabled, Slick Server integrates with `@webtools/slick-client` for SPA functionality:

### Features

- Client-side navigation without full page reloads
- Automatic template and page updates
- Optimized asset loading
- Custom client URL support for CDN or local hosting

### Setup

1. Enable client mode in your server config:

```ts
const slick = new Slick(import.meta.dirname!, {
	client: true, // Use default client from esm.sh
	// ... other config
});
```

2. Or provide a custom client URL (useful for CDN or local development):

```ts
const slick = new Slick(import.meta.dirname!, {
	client: "https://cdn.example.com/slick-client.js", // Custom URL
	// ... other config
});
```

3. Install the client package in your static scripts:

```ts
// static/scripts/app.ts
import { Slick } from "@webtools/slick-client";

// Client is automatically initialized by the server
// You can add custom navigation handlers here
```

### How It Works

- The server injects `@webtools/slick-client` automatically
- When `client: true`, the default URL is `https://esm.sh/jsr/@webtools/slick-client@^0.2.15`
- When `client: "custom-url"`, your custom URL is used instead
- Pages are loaded via AJAX when navigating
- Only changed parts (template or page) are updated
- Full HTML is served on initial load for SEO

## 🔌 API Reference

### `Slick` Class

#### Constructor

```ts
new Slick(workspace: string, config: Partial<Config>)
```

- `workspace`: Path to your project root (use `import.meta.dirname!`)
- `config`: Partial configuration object

#### Methods

##### `start(): Promise<void>`

Starts the server. This method:

- Validates the workspace structure
- Loads all pages and templates
- Registers routes
- Starts the HTTP server

```ts
await slick.start();
```

### Types

#### `Page`

```ts
interface Page {
	readonly url: string;
	readonly template: string;
	readonly title: Render<string> | null;
	readonly styles: string[];
	readonly scripts: string[];
	readonly head: Render<preact.VNode> | null;
	readonly body: Render<preact.VNode> | null;
	readonly onpost: RequestListener | null;
	readonly onrequest: RequestListener | null;
}
```

#### `Template`

```ts
interface Template {
	readonly name: string;
	readonly favicon: Render<string> | null;
	readonly styles: string[];
	readonly scripts: string[];
	readonly head: Render<preact.VNode> | null;
	readonly body: Render<preact.VNode> | null;
	readonly onrequest: RequestListener | null;
}
```

#### `Render`

```ts
type Render<T> =
	| ((req: HttpRequest) => Promise<T> | T)
	| T;
```

## 💡 Examples

### Dynamic Page Content

```tsx
export default {
	url: "/products/:id",
	template: "app",
	title: "Product",

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
	// ... other properties
} satisfies Slick.Page;
```

### Authentication Middleware

```tsx
import type { HttpRequest, HttpResponse } from "@webtools/expressapi";

export default {
	url: "/dashboard",
	template: "app",
	title: "Dashboard",

	onrequest: async (req: HttpRequest, res: HttpResponse) => {
		const token = req.headers.get("authorization");
		if (!token || !await validateToken(token)) {
			return res.redirect("/login"); // Redirect to login
		}
	},
	// ... other properties
} satisfies Slick.Page;
```

### POST Handler

```tsx
import type { HttpRequest, HttpResponse } from "@webtools/expressapi";

export default {
	url: "/api/contact",
	template: "app",
	title: "Contact",

	onpost: async (req: HttpRequest, res: HttpResponse) => {
		const { name, email, message } = req.body;

		// Process the form submission
		await sendEmail({ name, email, message });

		return res.json({ success: true, message: "Message sent!" });
	},
	// ... other properties
} satisfies Slick.Page;
```

## 📝 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
