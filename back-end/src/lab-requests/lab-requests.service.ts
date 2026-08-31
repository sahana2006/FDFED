import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LabTechniciansService } from '../lab-technicians/lab-technicians.service';
import { FileAttachmentDto, SaveLabReportDraftDto, SubmitLabReportDto } from './dto/lab-requests.dto';

export type LabRequestStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'draft_report'
  | 'completed'
  | 'rejected';

export type LabRequest = {
  id: string;
  medicalRecordId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  branchId: string;
  testName: string;
  recommendationDate?: string;
  labTestDate?: string;
  requestDate: string;
  consultationNote: string;
  prescriptionMedicines: string;
  status: LabRequestStatus;
  acceptedByTechnicianId: string | null;
  acceptedAt: string | null;
  startedAt: string | null;
  draftSavedAt: string | null;
  completedAt: string | null;
  rejectedAt?: string | null;
  rejectedByTechnicianId?: string | null;
  rejectionReason?: string | null;
  reportId: string | null;
  sourceType?: 'doctor_order' | 'patient_labtest';
  sourceBookingId?: string;
  createdAt: string;
  updatedAt: string;
};

export type LabReportStatus = 'draft' | 'submitted';

export type LabReport = {
  id: string;
  labRequestId: string;
  medicalRecordId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  branchId: string;
  technicianId: string;
  technicianName?: string;
  testName: string;
  result: string;
  findings: string;
  remarks: string;
  fileAttachment?: FileAttachmentDto | null;
  uploadedFileName?: string | null;
  uploadedFilePath?: string | null;
  uploadedFileOriginalName?: string | null;
  uploadedFileMimeType?: string | null;
  uploadedFileSize?: number | null;
  uploadedAt?: string | null;
  status: LabReportStatus;
  sourceType?: 'doctor_order' | 'patient_labtest';
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
};

export type CreateLabRequestInput = {
  medicalRecordId: string;
  appointmentId: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  branchId: string;
  testName: string;
  recommendationDate?: string;
  labTestDate?: string;
  requestDate: string;
  consultationNote?: string;
  prescriptionMedicines?: string;
};

export type UploadedLabReportFile = {
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path?: string;
};

export type CreateDirectPatientLabRequestInput = {
  sourceBookingId: string;
  orderId: string;
  patientId: string;
  patientName: string;
  branchId: string;
  testName: string;
  requestDate: string;
};

const LAB_REQUESTS_DATA_FILE = join(
  __dirname,
  '..',
  '..',
  'data',
  'lab-requests.json',
);

const LAB_REPORTS_DATA_FILE = join(
  __dirname,
  '..',
  '..',
  'data',
  'lab-reports.json',
);

const DEFAULT_BRANCH_ID = '00000000-0000-4000-8000-000000000001';

function isBranchAllowed(requestBranchId?: string, technicianBranchId?: string): boolean {
  if (!requestBranchId || !technicianBranchId) return true;
  if (requestBranchId === technicianBranchId) return true;
  if (requestBranchId === DEFAULT_BRANCH_ID || technicianBranchId === DEFAULT_BRANCH_ID) return true;
  return false;
}

@Injectable()
export class LabRequestsService {
  private labRequests: LabRequest[] = [];
  private labReports: LabReport[] = [];

  constructor(
    @Inject(forwardRef(() => LabTechniciansService))
    private readonly labTechniciansService: LabTechniciansService,
  ) {
    this.loadPersistedData();
  }

  createRequest(input: CreateLabRequestInput): LabRequest {
    this.validateCreateInput(input);

    const normalizedMedicalRecordId = input.medicalRecordId.trim();
    const normalizedAppointmentId = input.appointmentId.trim();
    const normalizedTestName = input.testName.trim().toLowerCase();

    // Deduplicate only if exact same test on the same medical record was already processed
    const existing = this.labRequests.find((req) => {
      const matchMedicalRecord = req.medicalRecordId === normalizedMedicalRecordId;
      return (
        matchMedicalRecord &&
        req.testName.trim().toLowerCase() === normalizedTestName &&
        req.status !== 'rejected'
      );
    });

    if (existing) {
      return { ...existing };
    }

    const now = new Date().toISOString();
    const request: LabRequest = {
      id: this.generateRequestId(),
      medicalRecordId: normalizedMedicalRecordId,
      appointmentId: normalizedAppointmentId,
      patientId: input.patientId.trim(),
      patientName: input.patientName.trim(),
      doctorId: input.doctorId.trim(),
      doctorName: input.doctorName.trim(),
      branchId: input.branchId.trim(),
      testName: input.testName.trim(),
      recommendationDate: (input.recommendationDate || input.requestDate || now.split('T')[0]).trim(),
      labTestDate: (input.labTestDate || input.recommendationDate || input.requestDate || now.split('T')[0]).trim(),
      requestDate: input.requestDate.trim(),
      consultationNote: input.consultationNote?.trim() || '',
      prescriptionMedicines: input.prescriptionMedicines?.trim() || '',
      status: 'pending',
      acceptedByTechnicianId: null,
      acceptedAt: null,
      startedAt: null,
      draftSavedAt: null,
      completedAt: null,
      rejectedAt: null,
      rejectedByTechnicianId: null,
      rejectionReason: null,
      reportId: null,
      sourceType: 'doctor_order',
      createdAt: now,
      updatedAt: now,
    };

    this.labRequests.unshift(request);
    this.persistData();
    return { ...request };
  }

  createDirectPatientRequest(input: CreateDirectPatientLabRequestInput): LabRequest {
    const normalizedBookingId = input.sourceBookingId.trim();
    const normalizedOrderId = input.orderId.trim();
    const normalizedPatientId = input.patientId.trim();
    const normalizedPatientName = input.patientName.trim();
    const normalizedBranchId = input.branchId.trim();
    const normalizedTestName = input.testName.trim();
    const normalizedRequestDate = input.requestDate.trim();

    if (
      !normalizedBookingId ||
      !normalizedOrderId ||
      !normalizedPatientId ||
      !normalizedPatientName ||
      !normalizedBranchId ||
      !normalizedTestName ||
      !normalizedRequestDate
    ) {
      throw new BadRequestException('All direct patient lab request fields are required');
    }

    const existing = this.labRequests.find(
      (req) =>
        req.sourceType === 'patient_labtest' &&
        req.sourceBookingId === normalizedBookingId,
    );
    if (existing) {
      return { ...existing };
    }

    const now = new Date().toISOString();
    const request: LabRequest = {
      id: this.generateRequestId(),
      medicalRecordId: normalizedBookingId,
      appointmentId: normalizedOrderId,
      patientId: normalizedPatientId,
      patientName: normalizedPatientName,
      doctorId: 'PATIENT_PORTAL',
      doctorName: 'Patient Portal',
      branchId: normalizedBranchId,
      testName: normalizedTestName,
      recommendationDate: normalizedRequestDate,
      labTestDate: normalizedRequestDate,
      requestDate: normalizedRequestDate,
      consultationNote: 'Booked directly by the patient from the lab tests page.',
      prescriptionMedicines: '',
      status: 'pending',
      acceptedByTechnicianId: null,
      acceptedAt: null,
      startedAt: null,
      draftSavedAt: null,
      completedAt: null,
      rejectedAt: null,
      rejectedByTechnicianId: null,
      rejectionReason: null,
      reportId: null,
      sourceType: 'patient_labtest',
      sourceBookingId: normalizedBookingId,
      createdAt: now,
      updatedAt: now,
    };

    this.labRequests.unshift(request);
    this.persistData();
    return { ...request };
  }

  private generateRequestId(): string {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    let candidate = `LREQ${timestamp}${randomSuffix}`;
    while (this.labRequests.some((r) => r.id === candidate)) {
      candidate = `LREQ${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
    return candidate;
  }

  private generateReportId(): string {
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    let candidate = `LREP${timestamp}${randomSuffix}`;
    while (this.labReports.some((r) => r.id === candidate)) {
      candidate = `LREP${Date.now()}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    }
    return candidate;
  }

  findAll(): LabRequest[] {
    return this.labRequests.map((request) => ({ ...request }));
  }

  findById(id: string): LabRequest {
    const request = this.labRequests.find((item) => item.id === id);
    if (!request) throw new NotFoundException('Lab request not found');
    return { ...request };
  }

  async findForTechnician(technicianId: string): Promise<LabRequest[]> {
    let technician: any = null;
    try {
      technician = await this.labTechniciansService.findOne(technicianId);
    } catch (_) {}
    const techBranchId = technician?.branchId || DEFAULT_BRANCH_ID;

    return this.labRequests
      .filter((request) => {
        if (!isBranchAllowed(request.branchId, techBranchId)) return false;

        // 1. Initial pending requests are visible to all technicians in the branch
        if (request.status === 'pending') return true;

        // 2. Once accepted, only the accepting technician sees the request
        if (request.acceptedByTechnicianId && request.acceptedByTechnicianId === technicianId) {
          return true;
        }

        // 3. If rejected by this technician, only this technician sees the rejection record
        if (request.rejectedByTechnicianId && request.rejectedByTechnicianId === technicianId) {
          return true;
        }

        // Other technicians in the branch do not get the request once accepted by someone else
        return false;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.requestDate || 0).getTime();
        const timeB = new Date(b.createdAt || b.requestDate || 0).getTime();
        return timeB - timeA;
      })
      .map((request) => ({ ...request }));
  }

  findForPatient(patientId: string): LabRequest[] {
    const cleanPatientId = patientId?.trim().toLowerCase();
    if (!cleanPatientId) {
      throw new BadRequestException('Patient ID is required');
    }
    return this.labRequests
      .filter((request) => request.patientId.trim().toLowerCase() === cleanPatientId)
      .map((request) => ({ ...request }));
  }

  async findByIdForTechnician(id: string, technicianId: string): Promise<LabRequest> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    const request = this.findById(id);
    if (!isBranchAllowed(request.branchId, technician.branchId)) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
    if (
      request.status !== 'pending' &&
      request.acceptedByTechnicianId &&
      request.acceptedByTechnicianId !== technicianId &&
      request.rejectedByTechnicianId !== technicianId
    ) {
      throw new ForbiddenException('This lab request is assigned to another lab technician');
    }
    return request;
  }

  async acceptRequest(id: string, technicianId: string): Promise<LabRequest> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    const request = this.findById(id);
    if (!isBranchAllowed(request.branchId, technician.branchId)) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }

    if (request.status !== 'pending') {
      if (request.acceptedByTechnicianId && request.acceptedByTechnicianId !== technicianId) {
        throw new ConflictException('This lab request has already been accepted by another lab technician');
      }
    }

    return this.updateStatus(id, 'in_progress', technicianId);
  }

  async rejectRequest(id: string, technicianId: string, reason?: string): Promise<LabRequest> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    const request = this.findById(id);
    if (!isBranchAllowed(request.branchId, technician.branchId)) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
    if (
      request.status !== 'pending' &&
      request.acceptedByTechnicianId &&
      request.acceptedByTechnicianId !== technicianId
    ) {
      throw new ForbiddenException('This lab request is assigned to another lab technician');
    }

    const reqItem = this.labRequests.find((item) => item.id === id);
    if (!reqItem) throw new NotFoundException('Lab request not found');

    this.assertAllowedTransition(reqItem.status, 'rejected');
    const now = new Date().toISOString();
    reqItem.status = 'rejected';
    reqItem.rejectedAt = now;
    reqItem.rejectedByTechnicianId = technicianId;
    reqItem.rejectionReason = reason?.trim() || 'Declined by lab technician';
    reqItem.updatedAt = now;

    this.persistData();
    return { ...reqItem };
  }

  async startRequest(id: string, technicianId: string): Promise<LabRequest> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    const request = this.findById(id);
    if (!isBranchAllowed(request.branchId, technician.branchId)) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
    if (request.acceptedByTechnicianId && request.acceptedByTechnicianId !== technicianId) {
      throw new ForbiddenException('This lab request is assigned to another lab technician');
    }
    return this.updateStatus(id, 'in_progress', technicianId);
  }

  updateStatus(id: string, nextStatus: LabRequestStatus, technicianId: string): LabRequest {
    const request = this.labRequests.find((item) => item.id === id);
    if (!request) throw new NotFoundException('Lab request not found');

    this.assertAllowedTransition(request.status, nextStatus);
    const now = new Date().toISOString();
    request.status = nextStatus;
    request.updatedAt = now;

    if (nextStatus === 'in_progress' || nextStatus === 'accepted') {
      request.acceptedByTechnicianId = technicianId;
      request.acceptedAt = request.acceptedAt || now;
      request.startedAt = now;
    } else if (nextStatus === 'draft_report') {
      request.draftSavedAt = now;
    } else if (nextStatus === 'completed') {
      request.completedAt = now;
    }

    this.persistData();
    return { ...request };
  }

  // --- Lab Reports Methods ---

  async getReportByRequestId(requestId: string, technicianId: string): Promise<LabReport | null> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    const request = this.findById(requestId);
    if (!isBranchAllowed(request.branchId, technician.branchId)) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }

    const report = this.labReports.find((r) => r.labRequestId === requestId);
    return report ? { ...report } : null;
  }

  async saveDraftReport(
    requestId: string,
    dto: SaveLabReportDraftDto,
    technicianId: string,
  ): Promise<{ request: LabRequest; report: LabReport }> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    const request = this.findById(requestId);
    if (!isBranchAllowed(request.branchId, technician.branchId)) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
    if (request.acceptedByTechnicianId && request.acceptedByTechnicianId !== technicianId) {
      throw new ForbiddenException('This lab request is assigned to another lab technician');
    }

    if (
      request.status !== 'accepted' &&
      request.status !== 'in_progress' &&
      request.status !== 'draft_report'
    ) {
      throw new BadRequestException(`Cannot save draft for request with status "${request.status}"`);
    }

    const now = new Date().toISOString();
    let report = this.labReports.find((r) => r.labRequestId === requestId);

    if (report) {
      report.result = dto.result || '';
      report.findings = dto.findings || '';
      report.remarks = dto.remarks || '';
      if (dto.fileAttachment !== undefined) {
        report.fileAttachment = dto.fileAttachment;
      }
      report.uploadedFileName = report.uploadedFileName ?? null;
      report.uploadedFilePath = report.uploadedFilePath ?? null;
      report.uploadedFileOriginalName = report.uploadedFileOriginalName ?? null;
      report.uploadedFileMimeType = report.uploadedFileMimeType ?? null;
      report.uploadedFileSize = report.uploadedFileSize ?? null;
      report.uploadedAt = report.uploadedAt ?? null;
      report.technicianId = technicianId;
      report.technicianName = technician.name;
      report.status = 'draft';
      report.updatedAt = now;
    } else {
      report = {
        id: this.generateReportId(),
        labRequestId: request.id,
        medicalRecordId: request.medicalRecordId,
        appointmentId: request.appointmentId,
        patientId: request.patientId,
        patientName: request.patientName,
        doctorId: request.doctorId,
        doctorName: request.doctorName,
        branchId: request.branchId,
        technicianId,
        technicianName: technician.name,
        testName: request.testName,
        result: dto.result || '',
        findings: dto.findings || '',
        remarks: dto.remarks || '',
        fileAttachment: dto.fileAttachment || null,
        uploadedFileName: null,
        uploadedFilePath: null,
        uploadedFileOriginalName: null,
        uploadedFileMimeType: null,
        uploadedFileSize: null,
        uploadedAt: null,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
      };
      this.labReports.unshift(report);
    }

    const reqItem = this.labRequests.find((r) => r.id === requestId)!;
    reqItem.status = 'draft_report';
    reqItem.draftSavedAt = now;
    reqItem.reportId = report.id;
    reqItem.updatedAt = now;

    this.persistData();
    return { request: { ...reqItem }, report: { ...report } };
  }

  async submitReport(
    requestId: string,
    dto: SubmitLabReportDto,
    technicianId: string,
  ): Promise<{ request: LabRequest; report: LabReport }> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    const request = this.findById(requestId);
    if (!isBranchAllowed(request.branchId, technician.branchId)) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
    if (request.acceptedByTechnicianId && request.acceptedByTechnicianId !== technicianId) {
      throw new ForbiddenException('This lab request is assigned to another lab technician');
    }

    if (
      request.status !== 'accepted' &&
      request.status !== 'in_progress' &&
      request.status !== 'draft_report'
    ) {
      throw new BadRequestException(`Cannot submit report for request with status "${request.status}"`);
    }

    if (!dto.result?.trim()) {
      throw new BadRequestException('Result is required before submitting the report');
    }

    const now = new Date().toISOString();
    let report = this.labReports.find((r) => r.labRequestId === requestId);

    if (report) {
      report.result = dto.result.trim();
      report.findings = dto.findings?.trim() || '';
      report.remarks = dto.remarks?.trim() || '';
      if (dto.fileAttachment !== undefined) {
        report.fileAttachment = dto.fileAttachment;
      }
      report.uploadedFileName = report.uploadedFileName ?? null;
      report.uploadedFilePath = report.uploadedFilePath ?? null;
      report.uploadedFileOriginalName = report.uploadedFileOriginalName ?? null;
      report.uploadedFileMimeType = report.uploadedFileMimeType ?? null;
      report.uploadedFileSize = report.uploadedFileSize ?? null;
      report.uploadedAt = report.uploadedAt ?? null;
      report.technicianId = technicianId;
      report.technicianName = technician.name;
      report.status = 'submitted';
      report.submittedAt = now;
      report.updatedAt = now;
    } else {
      report = {
        id: this.generateReportId(),
        labRequestId: request.id,
        medicalRecordId: request.medicalRecordId,
        appointmentId: request.appointmentId,
        patientId: request.patientId,
        patientName: request.patientName,
        doctorId: request.doctorId,
        doctorName: request.doctorName,
        branchId: request.branchId,
        technicianId,
        technicianName: technician.name,
        testName: request.testName,
        result: dto.result.trim(),
        findings: dto.findings?.trim() || '',
        remarks: dto.remarks?.trim() || '',
        fileAttachment: dto.fileAttachment || null,
        uploadedFileName: null,
        uploadedFilePath: null,
        uploadedFileOriginalName: null,
        uploadedFileMimeType: null,
        uploadedFileSize: null,
        uploadedAt: null,
        status: 'submitted',
        createdAt: now,
        updatedAt: now,
        submittedAt: now,
      };
      this.labReports.unshift(report);
    }

    const reqItem = this.labRequests.find((r) => r.id === requestId)!;
    reqItem.status = 'completed';
    reqItem.completedAt = now;
    reqItem.reportId = report.id;
    reqItem.updatedAt = now;

    this.persistData();
    return { request: { ...reqItem }, report: { ...report } };
  }

  async findAllReportsForTechnician(technicianId: string): Promise<LabReport[]> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    return this.labReports
      .filter((r) => isBranchAllowed(r.branchId, technician.branchId) && r.technicianId === technicianId)
      .map((r) => ({ ...r }));
  }

  async uploadReportFile(
    requestId: string,
    technicianId: string,
    file: UploadedLabReportFile,
  ): Promise<{ request: LabRequest; report: LabReport }> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    const request = this.findById(requestId);
    if (!isBranchAllowed(request.branchId, technician.branchId)) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
    if (request.acceptedByTechnicianId && request.acceptedByTechnicianId !== technicianId) {
      throw new ForbiddenException('This lab request is assigned to another lab technician');
    }

    if (
      request.status !== 'accepted' &&
      request.status !== 'in_progress' &&
      request.status !== 'draft_report'
    ) {
      throw new BadRequestException(`Cannot upload a report for request with status "${request.status}"`);
    }

    const now = new Date().toISOString();
    const publicFilePath = ['uploads', 'lab-reports', file.filename].join('/');
    let report = this.labReports.find((r) => r.labRequestId === requestId);
    const fileAttachment = {
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      fileData: `/${publicFilePath}`,
    };

    if (report) {
      report.fileAttachment = fileAttachment;
      report.uploadedFileName = file.filename;
      report.uploadedFilePath = publicFilePath;
      report.uploadedFileOriginalName = file.originalname;
      report.uploadedFileMimeType = file.mimetype;
      report.uploadedFileSize = file.size;
      report.uploadedAt = now;
      report.technicianId = technicianId;
      report.technicianName = technician.name;
      report.updatedAt = now;
      if (report.status !== 'submitted') {
        report.status = 'draft';
      }
    } else {
      report = {
        id: this.generateReportId(),
        labRequestId: request.id,
        medicalRecordId: request.medicalRecordId,
        appointmentId: request.appointmentId,
        patientId: request.patientId,
        patientName: request.patientName,
        doctorId: request.doctorId,
        doctorName: request.doctorName,
        branchId: request.branchId,
        technicianId,
        technicianName: technician.name,
        testName: request.testName,
        result: '',
        findings: '',
        remarks: '',
        fileAttachment,
        uploadedFileName: file.filename,
        uploadedFilePath: publicFilePath,
        uploadedFileOriginalName: file.originalname,
        uploadedFileMimeType: file.mimetype,
        uploadedFileSize: file.size,
        uploadedAt: now,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
        submittedAt: null,
      };
      this.labReports.unshift(report);
    }

    const reqItem = this.labRequests.find((r) => r.id === requestId)!;
    reqItem.status = 'draft_report';
    reqItem.draftSavedAt = now;
    reqItem.reportId = report.id;
    reqItem.updatedAt = now;

    this.persistData();
    return { request: { ...reqItem }, report: { ...report } };
  }

  async findReportByIdForTechnician(reportId: string, technicianId: string): Promise<LabReport> {
    const technician = await this.labTechniciansService.findOne(technicianId);
    const report = this.labReports.find((r) => r.id === reportId || r.labRequestId === reportId);
    if (!report) throw new NotFoundException('Lab report not found');
    if (!isBranchAllowed(report.branchId, technician.branchId) || report.technicianId !== technicianId) {
      throw new ForbiddenException('Access denied for this hospital branch');
    }
    return { ...report };
  }

  findAllReports(): LabReport[] {
    return this.labReports.map((r) => ({ ...r }));
  }

  findReportsForDoctor(doctorId: string): LabReport[] {
    const cleanDoctorId = doctorId?.trim();
    if (!cleanDoctorId) throw new BadRequestException('Doctor ID is required');

    return this.labReports
      .filter((r) => r.doctorId === cleanDoctorId && r.status === 'submitted')
      .map((r) => ({ ...r }));
  }

  findReportsForPatient(patientId: string): LabReport[] {
    const cleanPatientId = patientId?.trim();
    if (!cleanPatientId) throw new BadRequestException('Patient ID is required');

    return this.labReports
      .filter((r) => r.patientId === cleanPatientId && r.status === 'submitted')
      .map((r) => ({ ...r }));
  }

  async findReportForUser(reportId: string, role: string, userId: string): Promise<LabReport> {
    const report = this.labReports.find((r) => r.id === reportId || r.labRequestId === reportId);
    if (!report) throw new NotFoundException('Lab report not found');

    if (role === 'admin') {
      return { ...report };
    }

    if (role === 'branch_admin' || role === 'labtech') {
      const tech = await this.labTechniciansService.findOne(userId).catch(() => null);
      if (tech && tech.branchId !== report.branchId) {
        throw new ForbiddenException('Access denied for this hospital branch');
      }
      return { ...report };
    }

    if (role === 'doctor') {
      if (report.doctorId !== userId) {
        throw new ForbiddenException('You do not have permission to view this lab report');
      }
      if (report.status !== 'submitted') {
        throw new ForbiddenException('This report is still being processed and has not been submitted yet');
      }
      return { ...report };
    }

    if (role === 'patient') {
      if (report.patientId !== userId) {
        throw new ForbiddenException('You do not have permission to view this lab report');
      }
      if (report.status !== 'submitted') {
        throw new ForbiddenException('This report is still being processed and has not been submitted yet');
      }
      return { ...report };
    }

    throw new ForbiddenException('Access denied');
  }

  private validateCreateInput(input: CreateLabRequestInput) {
    const required: (keyof CreateLabRequestInput)[] = [
      'medicalRecordId',
      'patientId',
      'patientName',
      'doctorId',
      'doctorName',
      'branchId',
      'testName',
      'requestDate',
    ];

    const missing = required.filter((field) => !input[field] || !String(input[field]).trim());
    if (missing.length > 0) {
      throw new BadRequestException(`${missing.join(', ')} are required`);
    }
  }

  private assertAllowedTransition(current: LabRequestStatus, next: LabRequestStatus) {
    const allowedTransitions: Record<LabRequestStatus, LabRequestStatus[]> = {
      pending: ['in_progress', 'accepted', 'rejected'],
      accepted: ['in_progress', 'draft_report', 'completed', 'rejected'],
      in_progress: ['draft_report', 'completed', 'rejected'],
      draft_report: ['draft_report', 'completed', 'rejected'],
      completed: [],
      rejected: [],
    };

    if (!allowedTransitions[current].includes(next)) {
      throw new BadRequestException(`Cannot change lab request status from ${current} to ${next}`);
    }
  }

  private loadPersistedData() {
    try {
      if (existsSync(LAB_REQUESTS_DATA_FILE)) {
        const saved = JSON.parse(readFileSync(LAB_REQUESTS_DATA_FILE, 'utf8'));
        if (Array.isArray(saved)) this.labRequests = saved;
      }
      if (existsSync(LAB_REPORTS_DATA_FILE)) {
        const savedReports = JSON.parse(readFileSync(LAB_REPORTS_DATA_FILE, 'utf8'));
        if (Array.isArray(savedReports)) this.labReports = savedReports;
      }
    } catch (_) {}
  }

  private persistData() {
    mkdirSync(dirname(LAB_REQUESTS_DATA_FILE), { recursive: true });
    writeFileSync(
      LAB_REQUESTS_DATA_FILE,
      JSON.stringify(this.labRequests, null, 2),
    );
    writeFileSync(
      LAB_REPORTS_DATA_FILE,
      JSON.stringify(this.labReports, null, 2),
    );
  }
}
