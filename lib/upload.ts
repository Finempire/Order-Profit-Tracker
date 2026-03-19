import multer from "multer";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

// Ensure the base uploads directory exists
fs.mkdirSync(path.resolve(UPLOAD_DIR), { recursive: true });

export const invoiceUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const vendorName = (req.body?.vendorName as string) || "unknown-vendor";
      const invoiceNumber = (req.body?.invoiceNumber as string) || "unknown-invoice";
      const vendorSlug = slugifySimple(vendorName);
      const invoiceSlug = slugifySimple(invoiceNumber);
      const dir = path.resolve(UPLOAD_DIR, "vendors", vendorSlug, invoiceSlug);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const prefix =
        file.fieldname === "invoiceFile" ? "invoice" : "payment_proof";
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, PNG files are allowed"));
    }
  },
});

export const paymentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const vendorName = (req.body?.vendorName as string) || "unknown-vendor";
      const invoiceNumber = (req.body?.invoiceNumber as string) || "unknown-invoice";
      const vendorSlug = slugifySimple(vendorName);
      const invoiceSlug = slugifySimple(invoiceNumber);
      const dir = path.resolve(UPLOAD_DIR, "vendors", vendorSlug, invoiceSlug);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `payment_proof_${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF, JPG, PNG files are allowed"));
    }
  },
});

function slugifySimple(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

export function getRelativePath(absolutePath: string): string {
  const base = path.resolve(UPLOAD_DIR);
  return path.relative(base, absolutePath);
}

export function getAbsolutePath(relativePath: string): string {
  return path.resolve(UPLOAD_DIR, relativePath);
}
