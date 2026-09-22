import { randomBytes } from "node:crypto";

export function id(prefix: string) {
  return `${prefix}_${randomBytes(9).toString("base64url")}`;
}

export function token() {
  return randomBytes(24).toString("base64url");
}

export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "untitled";
}
