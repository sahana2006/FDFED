import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NestMiddleware,
  PayloadTooLargeException,
  UnauthorizedException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { createLabReportUpload } from '../../common/upload/lab-report-upload.config';

const multer = require('multer');

@Injectable()
export class LabReportUploadMiddleware implements NestMiddleware {
  private readonly logger = new Logger(LabReportUploadMiddleware.name);
  private readonly upload = createLabReportUpload();

  use(
    req: { headers: Record<string, string | string[] | undefined> },
    res: unknown,
    next: (error?: unknown) => void,
  ): void {
    const roleHeader = req.headers.role;
    const userIdHeader = req.headers['x-user-id'];
    const role = typeof roleHeader === 'string' ? roleHeader.toLowerCase() : '';
    const userId = typeof userIdHeader === 'string' ? userIdHeader.trim() : '';

    if (!role) {
      next(new UnauthorizedException('Role header is missing'));
      return;
    }

    if (role !== 'labtech') {
      next(new ForbiddenException('Only lab technicians can upload lab reports'));
      return;
    }

    if (!userId) {
      next(new UnauthorizedException('x-user-id header is missing'));
      return;
    }

    this.upload.single('report')(req, res, (error: unknown) => {
      if (error) {
        const mappedError = this.mapUploadError(error);
        this.logger.warn(
          `Lab report upload failed for user ${userId}: ${mappedError.message}`,
        );
        next(mappedError);
        return;
      }

      if (!(req as { file?: unknown }).file) {
        const fileError = new BadRequestException('Report file is required');
        this.logger.warn(
          `Lab report upload rejected for user ${userId}: ${fileError.message}`,
        );
        next(fileError);
        return;
      }

      next();
    });
  }

  private mapUploadError(error: unknown) {
    const uploadError = error as { code?: string; message?: string };

    if (error instanceof multer.MulterError) {
      if (uploadError.code === 'LIMIT_FILE_SIZE') {
        return new PayloadTooLargeException('File size must not exceed 5 MB');
      }

      return new BadRequestException(uploadError.message || 'File upload failed');
    }

    const message = error instanceof Error ? error.message : uploadError.message || 'File upload failed';
    if (message.includes('Only PDF, JPG, JPEG, and PNG files are allowed')) {
      return new UnsupportedMediaTypeException(message);
    }

    return new BadRequestException(message);
  }
}
