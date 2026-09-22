# Editorial photography portfolio + visual CMS

A photography portfolio with the feel of a printed photo book, plus an
admin (`/admin`) that lets you compose every page visually — what appears,
where, how big, with what caption, how much air around it, how it behaves on
desktop and mobile, and when it goes live — **without touching code**.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS 4 + a small editorial CSS system (12‑column grid, spacing tokens, container queries) |
| Database | Postgres via Drizzle ORM. **PGlite** (embedded Postgres, zero setup) by default, in a Docker volume in production; or any Postgres via `DATABASE_URL`. |
| Storage | Pluggable: `local` (files under `./storage`, a Docker volume in production) or `supabase` (Supabase Storage bucket). |
| Images | `sharp`: originals are kept untouched; AVIF + WebP variants at 480/768/1200/1600/2400, JPEG fallback, thumbnail, LQIP, dominant colour. Conservative quality settings for photography. |
| Auth | Email + password (bcrypt hash, never in code), HttpOnly session cookie, DB‑backed sessions, rate limiting, `proxy.ts` gate + per‑request verification. |
| Editor | zustand store with undo/redo, dnd‑kit drag & drop, autosave, live preview using the **same renderer** as the public site. |
| Deploy | GitHub Actions → Docker image on GHCR → `docker compose` on your server over SSH (`Dockerfile`, `docker-compose.yml`, `.github/workflows/`). |

## Quick start (local, no external services)

```bash
npm install
cp .env.example .env.local        # set ADMIN_EMAIL / ADMIN_PASSWORD
npm run db:seed                   # optional: demo photos + two demo projects
npm run dev                       # http://localhost:3000  ·  admin: /admin
```

The first sign‑in with the credentials from `.env.local` creates the admin
user (the password is stored only as a bcrypt hash). Without demo content the
library starts empty — upload photographs from **Photos**.

Other scripts:

```bash
npm run admin:create -- you@example.com "a long password"   # create / reset an admin
npm run db:migrate                                          # apply migrations (also runs automatically)
npm run db:generate                                         # after editing src/lib/db/schema.ts
npm run typecheck && npm run lint && npm run build
```

## Deploy with GitHub Actions (Docker on your own server)

The admin, uploads and database need a Node server, so the site cannot be a
static GitHub Pages export. The included pipeline builds a Docker image,
publishes it to GitHub Container Registry and deploys it on any Linux server
(a small VPS is enough) over SSH. No Vercel, no external database: the
embedded Postgres and the photographs live in two Docker volumes.

Workflows:

| File | Trigger | What it does |
| --- | --- | --- |
| `.github/workflows/ci.yml` | pull requests, pushes to other branches | typecheck, lint, build |
| `.github/workflows/deploy.yml` | push to `main`, or manual run | typecheck + lint → build image → push `ghcr.io/<owner>/<repo>:<sha>` and `:latest` → SSH into the server → `docker compose pull && up -d` |

### One-time server setup

```bash
# 1. Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER            # the SSH user must be able to run docker

# 2. App directory + environment
sudo mkdir -p /opt/portfolio && sudo chown $USER /opt/portfolio
cat > /opt/portfolio/.env <<'ENV'
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=change-me-to-something-long
PORT=3000
ENV
```

(`STORAGE_DRIVER` and `DATABASE_URL` stay unset: the container keeps the
database in the `portfolio-data` volume and the photos in
`portfolio-storage`. You can still switch to Supabase later by adding those
variables to `.env`.)

### Repository secrets

Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Value |
| --- | --- |
| `DEPLOY_HOST` | server IP or hostname |
| `DEPLOY_USER` | SSH user from the step above |
| `DEPLOY_SSH_KEY` | that user's **private** key (`ssh-keygen -t ed25519`, add the public key to `~/.ssh/authorized_keys` on the server) |
| `DEPLOY_PORT` | optional, default `22` |
| `DEPLOY_PATH` | optional, default `/opt/portfolio` |

If the repository (and therefore the package) is private, the server pulls
the image with the workflow's own `GITHUB_TOKEN`, which the deploy job passes
through — nothing else to configure. Under *Settings → Actions → General*
make sure "Workflow permissions" allows read and write (needed to push the
package).

### HTTPS

Put a reverse proxy in front of port 3000. With Caddy it is two lines:

```
photos.example.com {
    reverse_proxy 127.0.0.1:3000
}
```

Caddy obtains and renews the certificate automatically. Uploads can be
large, so allow a generous body size in the proxy (Caddy has no limit by
default; for nginx set `client_max_body_size 100m;`).

### Ship a change

Merge or push to `main`. The Actions tab shows the three jobs; the site is
updated in place with the same volumes, so photographs, layouts and the
admin account are kept. Rolling back is `IMAGE=ghcr.io/<owner>/<repo>:<old-sha>
docker compose up -d` on the server.

### Alternative: managed Postgres + object storage (Supabase)

Set these in the server `.env` (or in any host that runs the container):

```
DATABASE_URL=postgresql://...
STORAGE_DRIVER=supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...      # server only, never exposed to the browser
SUPABASE_BUCKET=photos             # create it as a PUBLIC bucket
```

Migrations run on first request (`DB_AUTO_MIGRATE=false` to disable). Storage
is an interface (`src/lib/storage/index.ts`); adding S3/R2 means
implementing four methods.

## How content is modelled

Content is separated from presentation:

- **photos** — the file (+ variants) and its metadata: title, description,
  alt, year, location, camera, lens, category, focal point, visibility flags
  (hidden / featured / show on home / show in archive). A photo exists once.
- **projects** and **pages** (home, archive, about) — each has a `draft`
  layout document and a `published` snapshot. The public site only ever
  reads `published`. Publishing copies draft → published and writes a
  version.
- **layout document** — an ordered list of **blocks**
  (`src/lib/blocks/schema.ts`, validated with zod):
  `project-header`, `image`, `image-group`, `text`, `text-image`,
  `chapter`, `spacer`, `project-list`, `photo-archive`.
  Image blocks hold **slots**: a photo id plus presentation settings
  (`span` 1–12, `start` column or auto, grid‑unit offsets X/Y, vertical
  alignment, crop aspect + object‑fit, per‑placement focal point, caption
  options, fullscreen, visibility, rotation/scale, overlap, and optional
  per‑breakpoint overrides for tablet/mobile). The same photo can appear in
  Home at 100% and in a project at 50%.
- **project_photos** — which photos belong to a project (ordered).
- **versions** — publish snapshots and manual snapshots, restorable.
- **settings** — site name, nav, SEO defaults, theme.

### The grid

Desktop: 12 columns. Slots are placed with `grid-column: start / span`, and
offsets are multiples of a column unit — never pixels, never absolute
positioning. Responsive behaviour is automatic (tablet keeps most
compositions; mobile stacks anything wider than a third and puts small items
two per row) and can be overridden per breakpoint from the inspector.
Breakpoints are **container queries**, so the editor's Desktop / Tablet /
Mobile preview is the real responsive behaviour, not a simulation.

Spacing tokens (`none … xxl`) create the editorial pauses; backgrounds are
limited to default / off‑white / black so the site stays coherent.

## The admin

- **Dashboard** — counts, list of unpublished changes.
- **Projects** — create (name → select photos → automatic first proposal
  based on aspect ratio, orientation and tone), reorder by drag, duplicate,
  feature / show on home / show in archive, hide (archive), delete with
  confirmation, private draft preview link.
- **Photos** — drag & drop multi‑upload, search, filters (category, project,
  orientation, year, hidden), sort, thumbnail size, multi‑select
  (⌘‑click, shift range, ⌘A) with bulk actions (add to project, category,
  hide/show, home/archive, create group, delete), details drawer with
  metadata, flags, focal‑point editor, replace file (keeps every placement).
- **Editor** (projects and pages) —
  block list with drag & drop, `+ Add block` with the layout library
  (single centered/left/right, full width, hero, panoramic, full bleed, two
  columns, large+small, small+large, vertical pair, horizontal pair,
  triptych, editorial offset, spread, grid, sequence, custom group, text,
  text+photo, chapter, spacer), inspector for the selected block or photo,
  visual 12‑column position bar, `Show grid`, Desktop/Tablet/Mobile preview,
  undo/redo, autosave (“Saving… / Saved / Unsaved changes”), Save draft,
  Preview ↗ (tokenised URL), Publish, Versions (snapshot / restore), Project
  settings (name, slug, year, location, description, cover, category,
  flags, SEO title/description/OG image, project photos).
  Shortcuts: ⌘Z / ⌘⇧Z / ⌘S / Delete / Esc (never inside inputs).
- **Archive page** — “Archive order & visibility”: drag photographs into
  order, toggle inclusion.
- **Settings** — identity, navigation, SEO defaults, theme, password.
- **Edit mode** — when logged in, the public site shows an “Edit page”
  button that opens the matching editor.

## Project layout

```
src/app/(site)            public pages, preview routes
src/app/admin             admin pages (shell + editor)
src/app/api/admin         JSON API (zod validated, auth required)
src/app/media/[...path]   serves files for the local storage driver
src/components/editorial  the ONE renderer (public + preview + editor)
src/components/editor     visual editor
src/components/admin      library, lists, pickers, forms
src/lib/blocks            block schema, layout templates, auto‑composition
src/lib/data              queries/mutations (photos, projects, pages, …)
src/lib/db                Drizzle schema + client (PGlite or Postgres)
src/lib/images            sharp pipeline
src/lib/storage           storage adapters
src/lib/auth              sessions, passwords
drizzle/                  SQL migrations
scripts/                  migrate, seed, create-admin
.github/workflows/        ci.yml (checks) · deploy.yml (image + SSH deploy)
Dockerfile, docker-compose.yml
```
