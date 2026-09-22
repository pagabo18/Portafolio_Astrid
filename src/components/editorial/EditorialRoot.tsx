"use client";

import type { Block } from "@/lib/blocks/schema";
import { BlockFrame } from "./BlockFrame";
import { ImageBlockView, ImageGroupBlockView } from "./blocks/ImageBlocks";
import { ChapterBlockView, ProjectHeaderBlockView, SpacerBlockView, TextBlockView, TextImageBlockView } from "./blocks/TextBlocks";
import { PhotoArchiveBlockView, ProjectListBlockView } from "./blocks/ListBlocks";
import { LightboxProvider } from "./Lightbox";
import type { EditorialProps } from "./types";

function photosInBlock(b: Block) {
  if (b.type === "image" || b.type === "text-image") return 1;
  if (b.type === "image-group") return b.images.length;
  return 0;
}

function layoutItems(blocks: Block[]) {
  let counter = 0;
  let firstImage = true;
  return blocks.map((block) => {
    const startIndex = counter;
    counter += photosInBlock(block);
    const priority = firstImage && (block.type === "image" || block.type === "image-group");
    if (priority) firstImage = false;
    return { block, startIndex, priority };
  });
}

/**
 * The single renderer used by the public site, the preview and the editor.
 */
export function EditorialRoot({ document, data, editor, preview }: EditorialProps) {
  const items = layoutItems(document.blocks);
  return (
    <LightboxProvider>
      <div
        className="editorial"
        data-editing={editor ? "" : undefined}
        data-preview={preview ? "" : undefined}
        onClick={editor ? () => editor.onSelect(null) : undefined}
      >
        {items.map(({ block, startIndex, priority }, i) => (
          <BlockFrame key={block.id} block={block} editor={editor} index={i}>
            {renderBlock(block, startIndex, priority)}
          </BlockFrame>
        ))}
        {editor && !document.blocks.length ? (
          <div className="px-[var(--margin)] py-24 text-center eyebrow">Empty page — add a block</div>
        ) : null}
      </div>
    </LightboxProvider>
  );

  function renderBlock(block: Block, startIndex: number, priority: boolean) {
    switch (block.type) {
      case "image":
        return <ImageBlockView block={block} data={data} editor={editor} startIndex={startIndex} priority={priority} />;
      case "image-group":
        return <ImageGroupBlockView block={block} data={data} editor={editor} startIndex={startIndex} />;
      case "text":
        return <TextBlockView block={block} editor={editor} />;
      case "text-image":
        return <TextImageBlockView block={block} data={data} editor={editor} startIndex={startIndex} />;
      case "spacer":
        return <SpacerBlockView block={block} editor={editor} />;
      case "chapter":
        return <ChapterBlockView block={block} />;
      case "project-header":
        return <ProjectHeaderBlockView block={block} data={data} />;
      case "project-list":
        return <ProjectListBlockView block={block} data={data} editor={editor} />;
      case "photo-archive":
        return <PhotoArchiveBlockView block={block} data={data} editor={editor} />;
    }
  }
}
