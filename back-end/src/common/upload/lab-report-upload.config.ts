import { existsSync, mkdirSync } from 'node:fs';
import { extname, join } from 'node:path';
const multer = require('multer');

export const LAB_REPORT_UPLOAD_DIR = join(process.cwd(), 'uploads', 'lab-reports');
export const LAB_REPORT_MAX_FILE_SIZE = 5 * 1024 * 1024;
export const LAB_REPORT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpg',
  'image/jpeg',
  'image/png',
]);

function ensureUploadDirectory() {
  if (!existsSync(LAB_REPORT_UPLOAD_DIR)) {
    mkdirSync(LAB_REPORT_UPLOAD_DIR, { recursive: true });
  }
}

function buildStoredFileName(originalName: string) {
  const safeExtension = extname(originalName).toLowerCase();
  const timestamp = Date.now();
  const randomSuffix = Math.floor(Math.random() * 1_000_000)
    .toString()
    .padStart(6, '0');

  return `lab-report-${timestamp}-${randomSuffix}${safeExtension}`;
}

export function createLabReportUpload() {
  ensureUploadDirectory();

  return multer({
    storage: multer.diskStorage({
      destination: (_req: unknown, _file: unknown, callback: (error: Error | null, destination?: string) => void) => {
        ensureUploadDirectory();
        callback(null, LAB_REPORT_UPLOAD_DIR);
      },
      filename: (_req: unknown, file: { originalname: string }, callback: (error: Error | null, filename?: string) => void) => {
        callback(null, buildStoredFileName(file.originalname));
      },
    }),
    limits: {
      fileSize: LAB_REPORT_MAX_FILE_SIZE,
    },
    fileFilter: (_req: unknown, file: { mimetype: string }, callback: (error: Error | null, acceptFile: boolean) => void) => {
      if (!LAB_REPORT_ALLOWED_MIME_TYPES.has(file.mimetype)) {
        callback(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'), false);
        return;
      }

      callback(null, true);
    },
  });
}
