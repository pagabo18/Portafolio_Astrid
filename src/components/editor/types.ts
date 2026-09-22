import type { BlocksDocument } from "@/lib/blocks/schema";
import type { PhotoMap, PhotoView } from "@/lib/photos/view";
import type { ProjectCard } from "@/components/editorial/types";

export type EditorTarget =
  | {
      type: "project";
      id: string;
      slug: string;
      name: string;
      status: string;
      previewToken: string;
      publishedAt: string | null;
      hasUnpublished: boolean;
      meta: {
        name: string;
        slug: string;
        year: string;
        location: string;
        description: string;
        coverPhotoId: string | null;
        categoryId: string | null;
        featured: boolean;
        showOnHome: boolean;
        showInArchive: boolean;
        seoTitle: string;
        seoDescription: string;
        ogPhotoId: string | null;
      };
      photoIds: string[];
      index: number;
    }
  | {
      type: "page";
      id: string;
      slug: string;
      name: string;
      status: "published";
      previewToken: string;
      publishedAt: string | null;
      hasUnpublished: boolean;
      meta: { title: string; seoTitle: string; seoDescription: string; ogPhotoId: string | null };
    };

export type EditorProps = {
  target: EditorTarget;
  document: BlocksDocument;
  photos: PhotoMap;
  categories: { id: string; name: string }[];
  /** For pages: extra datasets the renderer needs. */
  projects?: ProjectCard[];
  archivePhotos?: PhotoView[];
  years?: string[];
};
