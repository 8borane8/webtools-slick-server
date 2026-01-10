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

- Fast and lightweight
- Easy integration with the Deno ecosystem
- Built-in server-side rendering with templating
- Automatic minification of assets (CSS, JS, TS)
- SPA capabilities with `@webtools/slick-client`
- Compatible with modern web standards
- Static file serving
- SEO optimized

## 📁 Project Structure

Your project should include the following directory structure:

```plaintext
project-root/
│
├── pages/
│   └── index.tsx
│
├── templates/
│   └── app.tsx
│
└── static/
    ├── styles/
    │   ├── app/
    │   │   └── index.css
    │   ├── reset.css
    │   └── app.css
    ├── scripts/
    │   ├── app/
    │   │   └── index.ts
    │   └── app.ts
    └── assets/
```

- **pages/**: Contains your page components, each exporting a `Page` object.
- **templates/**: Contains your template structures, each exporting a `Template` object.
- **static/**: All files here are served directly as static files. CSS, JS, and TS files are minified automatically, and
  TS files are natively transpiled.

## 📦 Installation

```bash
deno add jsr:@webtools/slick-server
```

## 🧠 Usage Example

### Main server setup (index.ts)

Here's how you could set up your main server:

```ts
import { Slick } from "@webtools/slick-server";

const slick = new Slick(import.meta.dirname!, {
	env: {
		API_URL: Deno.env.get("API_URL")!,
	},
	port: 5000,
	lang: "en",
	r404: "/",
	client: true,
});

await slick.start();
```

### Example Page (`pages/index.tsx`)

This is a simple page setup leveraging the Slick Page interface:

```tsx
import * as Slick from "@webtools/slick-server";

export default {
	url: "/",
	template: "app",

	title: "Home - Slick Server",

	styles: [
		"/styles/app/index.css",
	],
	scripts: [
		"/scripts/app/index.ts",
	],

	head: <title>Welcome to Slick</title>,
	body: (
		<>
			<h1>Welcome to Slick Server!</h1>
			<p>This is the home page of your Slick Server application.</p>
		</>
	),

	onpost: null,
	onrequest: null,
} satisfies Slick.Page;
```

### Example Template (`templates/app.tsx`)

This is how you can define a template:

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

	head: <meta name="viewport" content="width=device-width, initial-scale=1.0" />,
	body: (
		<>
			<div id="app">
				{/** Page content will be injected here */}
			</div>
		</>
	),

	onrequest: null,
} satisfies Slick.Template;
```

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.
