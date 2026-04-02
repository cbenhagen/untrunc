# rsv.repair (web)

Web interface for **rsv.repair**: it fixes Sony `.rsv` files in the browser using WebAssembly. Includes **Astro** marketing pages, **Starlight** docs (Markdown lives in `src/content/docs/docs/` so URLs are `/docs/…`, matching the ALEx landing setup), and the **React** repair tool at `/`.

## Features

- **100% client-side repair**: Processing stays in your browser; no file uploads to a server
- **Large file support**: Streaming / worker-based handling for big videos
- **Docs & support**: Starlight documentation and a support page (same general style as our other product sites)
- **RSV-focused**: Built around interrupted Sony `.rsv` recordings and a same-camera reference clip

## Quick start

### Development

```bash
# Install dependencies (use Bun; do not use npm for this project)
bun install

# Dev server (Astro)
bun run dev
```

The site defaults to `http://localhost:4321` (Astro). The repair tool is at `/`; documentation is at `/docs/`; support at `/support/`.

### Build WASM (repair engine)

**Prerequisites:** Emscripten (e.g. `brew install emscripten` on macOS)

```bash
cd web/src/wasm
./build.sh
```

Outputs `untrunc.js` and `untrunc.wasm` into `public/`.

### Production build

```bash
bun run build
bun run preview
```

Dependency versions follow the **ALEx** landing app (`astro` 5.18, `@astrojs/starlight` 0.37.x). `package.json` uses **`overrides`** so `zod` stays on **3.25.76** and `@astrojs/sitemap` on **3.7.0**. Newer `@astrojs/sitemap` pulls Zod 4, which breaks Starlight’s content schema unless the tree is deduped (see `bun.lock` after `bun install`).

## Project structure (high level)

```
web/
├── src/
│   ├── pages/           # Astro routes (index, support)
│   ├── layouts/         # App shell + marketing layout
│   ├── components/      # React UI + Astro partials (nav, footer)
│   ├── content/docs/    # Starlight markdown docs
│   ├── hooks/, workers/, wasm/, …
│   ├── App.tsx
│   └── index.css
├── public/              # Static assets + WASM after build
├── astro.config.mjs
└── package.json
```

## Stack

- **Astro** + **React** (`client:only` for the WASM app)
- **Starlight** + **starlight-theme-black** for documentation
- **Tailwind CSS** for marketing/docs styling
- **Framer Motion**, **Web Workers**, **Emscripten** / **FFmpeg** (WASM)

## Browser requirements

- WebAssembly and (for the repair flow) **SharedArrayBuffer**; the dev server sends COOP/COEP headers
- **File System Access API** recommended (e.g. current Chrome/Edge) for picking files and save location

## License

GPL-2.0, same as the Untrunc project
