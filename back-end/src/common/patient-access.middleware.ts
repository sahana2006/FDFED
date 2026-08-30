import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApplicationLogger } from './application-logger.service';

/**
 * PatientAccessMiddleware — Router Middleware
 *
 * Runs ONLY on patient and medical-record routes (not on all routes like LoggerMiddleware).
 * Logs a dedicated "PATIENT_ACCESS" audit entry every time any user accesses
 * sensitive patient data — capturing role, userId, HTTP method, and path.
 *
 * Registered in:
 *  - PatientsModule  → forRoutes(PatientsController)
 *  - MedicalRecordsModule → forRoutes(MedicalRecordsController, FollowUpsController)
 */
@Injectable()
export class PatientAccessMiddleware implements NestMiddleware {
  constructor(private readonly logger: ApplicationLogger) {}

  use(req: Request, _res: Response, next: () => void): void {
    const role = req.headers['role'] ?? 'unknown';
    const userId = req.headers['x-user-id'] ?? 'unknown';
    const method = req.method;
    const path = req.originalUrl;

    // Extract patient ID from URL if present (e.g., /patients/abc123)
    const patientIdMatch = path.match(/\/patients\/([^/?]+)/);
    const patientId = patientIdMatch ? patientIdMatch[1] : 'N/A';

    this.logger.log(
      `PATIENT_ACCESS | role=${role} | userId=${userId} | patientId=${patientId} | ${method} ${path}`,
      'PatientAccessMiddleware',
    );

    next();
  }
}
