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
  /**
   * How project cards link out: to the public page, to the admin draft
   * preview, or nowhere (inside the editor canvas, where a click selects
   * the block instead of navigating away).
   */
  projectLinkMode?: "public" | "preview" | "none";
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
