export const CONTENT_DIR = "content";

export const paths = {
  site: `${CONTENT_DIR}/site.json`,
  photos: `${CONTENT_DIR}/photos.json`,
  categories: `${CONTENT_DIR}/categories.json`,
  photoDir: (id: string) => `${CONTENT_DIR}/photos/${id}`,
  photoOriginal: (id: string, ext: string) => `${CONTENT_DIR}/photos/${id}/original.${ext}`,
  photoThumb: (id: string) => `${CONTENT_DIR}/photos/${id}/thumb.webp`,
  photoPreview: (id: string) => `${CONTENT_DIR}/photos/${id}/preview.webp`,
  projectsDir: `${CONTENT_DIR}/projects`,
  projectDir: (id: string) => `${CONTENT_DIR}/projects/${id}`,
  project: (id: string) => `${CONTENT_DIR}/projects/${id}/project.json`,
  projectDraft: (id: string) => `${CONTENT_DIR}/projects/${id}/draft.json`,
  pagesDir: `${CONTENT_DIR}/pages`,
  page: (slug: string) => `${CONTENT_DIR}/pages/${slug}/page.json`,
  pageDraft: (slug: string) => `${CONTENT_DIR}/pages/${slug}/draft.json`,
};

/** Base path of the deployed site ("/repo" on project Pages, "" otherwise). */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const withBase = (p: string) => `${BASE_PATH}${p}`;
export const mediaUrl = (rel: string) => withBase(`/media/${rel}`);
