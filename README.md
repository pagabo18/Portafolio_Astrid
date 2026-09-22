# Editorial photography portfolio + visual CMS — 100 % free on GitHub

A photography portfolio with the feel of a printed photo book, plus a visual
admin (`/admin`) to compose every page — what appears, where, how big, with
what caption, how much air around it, how it behaves on desktop and mobile,
and when it goes live — **without touching code**.

Everything runs on GitHub's free tier: the content lives in this repository,
the admin saves each change as a commit through the GitHub API, **GitHub
Actions** generates the responsive images and **GitHub Pages** hosts the
site. No servers, no database service, no credit card, nothing that pauses.

## How it works

```
 browser (admin, static page)           GitHub                    visitors
 ┌──────────────────────────┐   commits   ┌──────────────┐  build   ┌────────────┐
 │ upload / edit / publish  │ ──────────▶ │ content/*.json│ ──────▶ │ GitHub     │
 │ (GitHub API, your token) │             │ content/photos│ Actions │ Pages      │
 └──────────────────────────┘             └──────────────┘          └────────────┘
```

- `content/` — all data: `site.json`, `photos.json`, `categories.json`,
  `photos/<id>/original.jpg|thumb.webp|preview.webp`,
  `projects/<id>/project.json` (published snapshot + flags) and
  `draft.json` (working copy), `pages/<slug>/…`.
- The admin (`/admin`) is part of the static site. It asks for a GitHub
  personal access token once, keeps it in your browser, and writes files
  with atomic multi-file commits. Draft saves commit `draft.json` only and do
  **not** trigger a deploy; **Publish** writes the published snapshot and
  triggers the build.
- `scripts/process-images.ts` (run by the workflow and by `npm run dev`)
  turns each original into AVIF + WebP variants at 480/768/1200/1600/2400 px
  plus a JPEG fallback, cached between builds so only new photos are
  processed.
- Version history = git history. Every save and publish is a commit; the
  editor lists them and can restore any layout.

## Set it up (10 minutes)

1. **Create the repository** from this code (public — GitHub Pages is free
   for public repositories). Push to the `main` branch.
2. **Settings → Pages → Build and deployment → Source: “GitHub Actions”.**
   This single click creates the Pages site; the workflow cannot create it
   on its own.
3. **Create an access token** you will use to sign in to the admin:
   GitHub → Settings → Developer settings → Personal access tokens →
   *Fine-grained tokens* → Generate. Repository access: *Only select
   repositories* → this repo. Permissions → Repository → **Contents: Read and
   write**. Expiration: up to 1 year (you can create a new one later).
4. Push, wait for the *Deploy to GitHub Pages* workflow, open
   `https://<user>.github.io/<repo>/`, then `…/admin/`, paste the token.
5. Upload photographs, create a project, publish. A couple of minutes later
   the site is updated.

Custom domain: add a file `content/CNAME` with the domain and configure the
domain in Settings → Pages; the workflow copies it into the build.

### Where is the password?

The token *is* the credential. The admin page is public HTML but it cannot
read drafts or write anything without a token that has push access to this
repository. Nothing secret is stored in the repository or in the site.

## Local development

```bash
npm install
npm run seed        # optional: demo photos + two demo projects into ./content
npm run dev:local   # admin against a local mock of the GitHub API (no token)
# or
npm run dev         # admin against the real repository (needs NEXT_PUBLIC_GITHUB_REPO in .env.local and a token)
```

`npm run dev:local` starts `scripts/local-github.ts`, which serves the
working tree as if it were the repository: saves write files to `./content`
directly (commit them with git whenever you like), and history comes from
`git log`. `npm run build` produces the static site in `out/`.

Other scripts: `npm run media` (process images into `public/media`),
`npm run typecheck`, `npm run lint`.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 static export (App Router, React 19, TypeScript) |
| Styling | Tailwind CSS 4 + an editorial CSS system (12-column grid, spacing tokens, container queries) |
| Content | JSON + originals in `content/`, written through the GitHub Git Data API (one commit per change) |
| Images | Browser: dimensions, LQIP, thumb + preview at upload. Build: `sharp` variants (AVIF/WebP/JPEG), conservative quality for photography |
| Editor | zustand store with undo/redo, dnd-kit drag & drop, autosave, live preview using the **same renderer** as the public site |
| Hosting | GitHub Pages via `.github/workflows/pages.yml`; CI checks in `ci.yml` |

## Content model

Content is separated from presentation:

- **photos** — the file and its metadata (title, description, alt, year,
  location, camera, lens, category, focal point, hidden / featured / show on
  home / show in archive). A photo exists once.
- **projects / pages** — a `draft` layout and a `published` snapshot. The
  site only ever renders `published`.
- **layout document** — an ordered list of **blocks**
  (`src/lib/blocks/schema.ts`, validated with zod): `project-header`,
  `image`, `image-group`, `text`, `text-image`, `chapter`, `spacer`,
  `project-list`, `photo-archive`. Image blocks hold **slots**: a photo id
  plus presentation settings (`span` 1–12, `start` column or auto, grid-unit
  offsets, vertical alignment, crop aspect + object-fit, per-placement focal
  point, caption options, fullscreen, visibility, rotation/scale, overlap,
  optional tablet/mobile overrides). The same photo can appear on Home at
  100 % and in a project at 50 %.

### The grid

Desktop: 12 columns; slots are placed with `grid-column: start / span` and
offsets are multiples of a column unit — never pixels, never absolute
positioning. Responsive behaviour is automatic (tablet keeps most
compositions; mobile stacks anything wider than a third and puts small items
two per row) and can be overridden per breakpoint. Breakpoints are
**container queries**, so the editor's Desktop / Tablet / Mobile preview is
the real responsive behaviour.

## The admin

- **Dashboard** — counts and the list of unpublished changes.
- **Projects** — create (name → select photos → automatic first proposal
  from aspect ratio, orientation and tone), drag to reorder, duplicate,
  feature / show on home / show in archive, hide, delete with confirmation.
- **Photos** — drag & drop multi-upload, search, filters, sort, multi-select
  (⌘-click, shift range, ⌘A) with bulk actions, metadata drawer, focal-point
  editor, replace file (keeps every placement), hide vs delete.
- **Editor** (projects and pages) — block list with drag & drop, `+ Add
  block` with the layout library (single centered/left/right, full width,
  hero, panoramic, full bleed, two columns, large+small, small+large,
  vertical pair, horizontal pair, triptych, editorial offset, spread, grid,
  sequence, custom group, text, text+photo, chapter, spacer), inspector for
  the selected block or photo, visual position bar, `Show grid`,
  Desktop/Tablet/Mobile preview, undo/redo, autosave, Preview, Publish,
  Versions, Project settings (name, slug, year, location, description,
  cover, category, flags, SEO, photos). Shortcuts: ⌘Z / ⌘⇧Z / ⌘S / Delete /
  Esc.
- **Archive page** — “Archive order & visibility”: drag photographs into
  order, toggle inclusion.
- **Settings** — identity, navigation, SEO defaults, theme, and an optional
  downscale-on-upload size to keep the repository small.
- **Edit mode** — when this browser has an admin session, the public site
  shows an “Edit page” button.

## Limits worth knowing

- Originals are stored in the repository. GitHub recommends keeping a
  repository under ~1 GB and files under 100 MB; a portfolio of a few hundred
  photographs is fine. Settings → *Downscale originals on upload* (e.g.
  4000 px) keeps things compact — the largest web variant is 2400 px anyway.
- Publishing takes the time of a build (typically 1–3 minutes). Drafts,
  previews and everything in the admin are instant.
- Draft previews open with your admin session; they are not shareable links
  (drafts are never deployed).
- GitHub Pages serves ~100 GB/month of bandwidth on the free tier, more than
  enough for a portfolio.

## Project layout

```
content/                  the data (JSON + originals)
src/app/(site)            public pages + /preview
src/app/admin             admin routes (static, client-side)
src/components/editorial  the ONE renderer (public + preview + editor)
src/components/editor     visual editor
src/components/admin      library, lists, pickers, forms, session
src/lib/blocks            block schema, layout templates, auto-composition
src/lib/content           types, defaults, static loader, admin store
src/lib/github            GitHub API client (Git Data API commits)
src/lib/images            browser-side image processing
scripts/                  process-images, seed, local-github mock
.github/workflows/        pages.yml (build + deploy) · ci.yml (checks)
```
