import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export function getRelativePath(absolutePath: string): string {
  const base = path.resolve(UPLOAD_DIR);
  return path.relative(base, absolutePath);
}

export function getAbsolutePath(relativePath: string): string {
  return path.resolve(UPLOAD_DIR, relativePath);
}
