# Frontend development

Use the root README for Docker startup and API configuration. This frontend uses Next.js App Router, React, React Bootstrap and colocated Sass modules.

For native development, install the versions in `.nvmrc` and `packageManager`, then run:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`. The server API proxy uses `API_BASE_URL`, defaulting to `http://localhost:8080` for native development. Docker supplies `http://backend:8080`. Browser Axios requests use `/api`; database configuration stays in the backend.

Metadata, social image URLs, robots and the sitemap use `SITE_URL` during the production build. Set it before `npm run build` for native deployments. Docker Compose passes `FRONTEND_ORIGIN` as the build value, defaulting to `http://localhost:3000`; rebuild the frontend image after changing that origin.

Before committing a feature:

```sh
npm run lint
npm run typecheck
npm run build
```

Reusable visual components, layouts, menus and main views have paired `.tsx` and `.module.scss` files. Keep page entrypoints thin. Use imported React Icons; authored SVG markup/assets are excluded. Client identity belongs in Context, while server state and request cancellation belong in TanStack Query and Axios.
