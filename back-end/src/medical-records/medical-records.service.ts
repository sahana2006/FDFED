import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AppointmentsService } from '../appointments/appointments.service';
import { DoctorsService } from '../doctors/doctors.service';
import { LabRequestsService } from '../lab-requests/lab-requests.service';
import { PatientsService } from '../patients/patients.service';

export type MedicalRecordType = 'consultation' | 'treatment' | 'lab';

export type MedicalRecord = {
  id: string;
  doctorId: string;
  patientId: string;
  type: MedicalRecordType;
  patientName?: string;
  doctorName: string;
  specialization: string;
  date: string;
  consultationNote?: string;
  medicines?: string;
  followUp?: string;
  followUpDate?: string;
  appointmentId?: string;
  // Treatment plan specific fields
  tests?: string;
  labTestDate?: string;
  lifestyle?: string;
  diet?: string;
  duration?: string;
};

export type CreateMedicalRecordInput = {
  doctorId: string;
  patientId: string;
  patientName?: string;
  type: MedicalRecordType;
  doctorName: string;
  specialization: string;
  date?: string;
  consultationNote?: string;
  medicines?: string;
  followUp?: string;
  followUpDate?: string;
  appointmentId?: string;
  tests?: string;
  labTestDate?: string;
  lifestyle?: string;
  diet?: string;
  duration?: string;
};

const MEDICAL_RECORDS_DATA_FILE = join(
  __dirname,
  '..',
  '..',
  'data',
  'medical-records.json',
);

const DEFAULT_BRANCH_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class MedicalRecordsService {
  private medicalRecords: MedicalRecord[] = [
    {
      id: 'MR001',
      doctorId: 'DOC001',
      patientId: 'PAT001',
      type: 'consultation',
      doctorName: 'Dr. S Madhuri',
      specialization: 'Dermatologist',
      date: '2026-03-10',
      consultationNote:
        'Reviewed recurring skin irritation and advised trigger avoidance plus hydration.',
      medicines: 'Cetirizine 10mg once daily, Calamine lotion twice daily',
      followUp: '2026-05-10',
      followUpDate: '2026-05-10',
    },
    {
      id: 'MR002',
      doctorId: 'DOC001',
      patientId: 'PAT001',
      type: 'treatment',
      doctorName: 'Dr. S Madhuri',
      specialization: 'Dermatologist',
      date: '2026-03-10',
      medicines: 'Cetirizine 10mg, Calamine lotion',
      tests: 'Patch test',
      lifestyle: 'Avoid harsh soaps and synthetic fabrics',
      diet: 'Increase omega-3 rich foods',
      duration: '4 weeks',
    },
    {
      id: 'MR003',
      doctorId: 'DOC001',
      patientId: 'PAT001',
      type: 'lab',
      doctorName: 'Dr. S Madhuri',
      specialization: 'Dermatologist',
      date: '2026-03-10',
    },
  ];

  private readonly logger = new Logger(MedicalRecordsService.name);

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly patientsService: PatientsService,
    private readonly labRequestsService: LabRequestsService,
    private readonly doctorsService: DoctorsService,
  ) {
    this.loadPersistedRecords();
  }

  getRecordsByPatientId(patientId: string) {
    const cleanId = patientId?.trim();
    if (!cleanId) return [];

    const directRecords = this.medicalRecords.filter((record) => record.patientId === cleanId);

    let labReports: any[] = [];
    try {
      labReports = this.labRequestsService.findReportsForPatient(cleanId);
    } catch (_) {}

    const labRecordsFromReports: MedicalRecord[] = (labReports || [])
      .filter((report) => !directRecords.some((dr) => dr.id === report.id || dr.id === report.labRequestId))
      .map((report) => ({
        id: report.id,
        doctorId: report.doctorId,
        patientId: report.patientId,
        patientName: report.patientName,
        type: 'lab',
        doctorName: report.doctorName,
        specialization: 'Diagnostic Laboratory',
        date: report.submittedAt
          ? report.submittedAt.split('T')[0]
          : (report.createdAt ? report.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
        tests: report.testName,
        consultationNote: report.result ? `Diagnostic Result: ${report.result}` : undefined,
        appointmentId: report.appointmentId,
      }));

    return [...directRecords, ...labRecordsFromReports];
  }

  getRecordsByDoctorId(doctorId: string) {
    return this.medicalRecords.filter((record) => record.doctorId === doctorId);
  }

  getFollowUps() {
    return this.medicalRecords
      .filter((record) => record.type === 'consultation')
      .map((record) => this.toRecordWithFollowUpDetails(record))
      .filter((record) => record.followUpDate)
      .filter(
        (record) =>
          !this.appointmentsService.hasUpcomingAppointment(
            record.patientId,
            record.doctorId,
            record.followUpDate,
          ),
      );
  }

  private toRecordWithFollowUpDetails(record: MedicalRecord) {
    const followUpDate = record.followUpDate || record.followUp || '';

    let patientName = record.patientId;
    let patientPhone = '';
    try {
      const patient = this.patientsService.getPatientByUserId(record.patientId);
      patientName = `${patient.firstName} ${patient.lastName}`.trim();
      patientPhone = patient.phone;
    } catch (_) {}

    return {
      ...record,
      followUpDate,
      patientName,
      patientPhone,
    };
  }

  async createRecord(input: CreateMedicalRecordInput): Promise<MedicalRecord> {
    if (!input.doctorId || !input.patientId || !input.type) {
      throw new BadRequestException('doctorId, patientId, and type are required');
    }

    const allowedTypes: MedicalRecordType[] = ['consultation', 'treatment', 'lab'];
    if (!allowedTypes.includes(input.type)) {
      throw new BadRequestException(`type must be one of: ${allowedTypes.join(', ')}`);
    }

    const normalizedFollowUpDate =
      input.followUpDate?.trim() || input.followUp?.trim() || undefined;

    const record: MedicalRecord = {
      id: `MR${Date.now()}`,
      doctorId: input.doctorId,
      patientId: input.patientId,
      patientName: input.patientName?.trim(),
      type: input.type,
      doctorName: input.doctorName?.trim() || 'Unknown Doctor',
      specialization: input.specialization?.trim() || 'General',
      date: input.date?.trim() || new Date().toISOString().split('T')[0],
      consultationNote: input.consultationNote?.trim(),
      medicines: input.medicines?.trim(),
      followUp: normalizedFollowUpDate,
      followUpDate: normalizedFollowUpDate,
      appointmentId: input.appointmentId?.trim(),
      tests: input.tests?.trim(),
      labTestDate: input.labTestDate?.trim(),
      lifestyle: input.lifestyle?.trim(),
      diet: input.diet?.trim(),
      duration: input.duration?.trim(),
    };

    if (record.type === 'consultation' && record.appointmentId) {
      try {
        await this.appointmentsService.completeAppointment(record.appointmentId);
      } catch (err) {
        this.logger.warn(
          `Could not complete appointment ${record.appointmentId}: ${err?.message}`,
        );
      }
    }

    this.medicalRecords.unshift(record);
    this.persistRecords();

    if (record.tests) {
      await this.createLabRequestsForRecord(record);
    }

    return {
      ...record,
      followUpDate: record.followUpDate || record.followUp,
    };
  }

  private async createLabRequestsForRecord(record: MedicalRecord): Promise<void> {
    if (!record.tests) return;

    // Split tests by pipe (primary), newline, or comma outside parentheses
    let rawTests: string[] = [];
    if (record.tests.includes('|')) {
      rawTests = record.tests.split('|');
    } else if (record.tests.includes('\n')) {
      rawTests = record.tests.split('\n');
    } else {
      rawTests = record.tests.split(/,(?![^(]*\))/);
    }

    const testNames = Array.from(
      new Set(
        rawTests
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    if (testNames.length === 0) return;

    // Determine branchId from appointment or doctor, always fallback to DEFAULT_BRANCH_ID
    let branchId = '';
    let appointmentDetails: any = null;

    if (record.appointmentId) {
      try {
        appointmentDetails = await this.appointmentsService.getAppointmentById(
          record.appointmentId,
        );
        branchId = appointmentDetails?.branchId || '';
      } catch (_) {}
    }

    if (!branchId && record.doctorId) {
      try {
        const allDocs = await this.doctorsService.findAll(undefined, undefined);
        const doc = allDocs.find(
          (d) => d.id === record.doctorId || d.userId === record.doctorId,
        );
        branchId = doc?.branchId || '';
      } catch (_) {}
    }

    if (!branchId) {
      branchId = DEFAULT_BRANCH_ID;
    }

    // Determine patientName accurately
    let patientName = record.patientName?.trim() || '';
    if (!patientName) {
      try {
        const patientProfile = this.patientsService.getPatientByUserId(record.patientId);
        patientName =
          `${patientProfile.firstName} ${patientProfile.lastName}`.trim() ||
          patientProfile.userId;
      } catch (_) {
        if (appointmentDetails?.patient?.name) {
          patientName = appointmentDetails.patient.name;
        }
      }
    }
    if (!patientName) {
      patientName = record.patientId;
    }

    const doctorName =
      record.doctorName || appointmentDetails?.doctor?.name || 'Unknown Doctor';
    const recommendationDate = record.date || new Date().toISOString().split('T')[0];
    const labTestDate = record.labTestDate || record.date || recommendationDate;
    const requestDate = record.labTestDate || record.date || recommendationDate;

    for (const testName of testNames) {
      try {
        this.labRequestsService.createRequest({
          medicalRecordId: record.id,
          appointmentId: record.appointmentId || '',
          patientId: record.patientId,
          patientName,
          doctorId: record.doctorId,
          doctorName,
          branchId,
          testName,
          recommendationDate,
          labTestDate,
          requestDate,
          consultationNote: record.consultationNote || '',
          prescriptionMedicines: record.medicines || '',
        });
      } catch (error) {
        this.logger.error(
          `Failed to create lab request for test "${testName}" (medicalRecordId: ${record.id}): ${error?.message}`,
        );
      }
    }
  }

  private loadPersistedRecords() {
    try {
      if (!existsSync(MEDICAL_RECORDS_DATA_FILE)) {
        return;
      }

      const saved = JSON.parse(readFileSync(MEDICAL_RECORDS_DATA_FILE, 'utf8'));
      if (Array.isArray(saved)) {
        this.medicalRecords = saved;
      }
    } catch (_) {}
  }

  private persistRecords() {
    mkdirSync(dirname(MEDICAL_RECORDS_DATA_FILE), { recursive: true });
    writeFileSync(
      MEDICAL_RECORDS_DATA_FILE,
      JSON.stringify(this.medicalRecords, null, 2),
    );
  }
}
