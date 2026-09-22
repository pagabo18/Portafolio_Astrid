import type { PhotoMap, PhotoView } from "@/lib/photos/view";
import type { BlocksDocument } from "@/lib/blocks/schema";

export type ProjectHeaderData = {
  name: string;
  year: string;
  location: string;
  description: string;
  categoryName: string;
  index?: number;
};

export type ProjectCard = {
  id: string;
  slug: string;
  name: string;
  year: string;
  location: string;
  categoryName: string;
  description: string;
  coverPhotoId: string | null;
  featured: boolean;
};

export type RenderData = {
  photos: PhotoMap;
  project?: ProjectHeaderData;
  projects?: ProjectCard[];
  archivePhotos?: PhotoView[];
  categories?: { id: string; name: string }[];
  years?: string[];
  /** Base path for project links (e.g. "/projects" or "/preview/project"). */
  projectHrefBase?: string;
  interactive?: boolean; // lightbox etc.
};

export type Selection = { blockId: string; slotId?: string } | null;

export type EditorHooks = {
  selection: Selection;
  onSelect: (sel: Selection) => void;
  showGrid: boolean;
};

export type EditorialProps = {
  document: BlocksDocument;
  data: RenderData;
  editor?: EditorHooks;
  preview?: boolean;
};
