import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AppointmentsService } from '../appointments/appointments.service';
import { PatientsService } from '../patients/patients.service';

export type MedicalRecordType = 'consultation' | 'treatment' | 'lab';

export type MedicalRecord = {
  id: string;
  doctorId: string;
  patientId: string;
  type: MedicalRecordType;
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
  lifestyle?: string;
  diet?: string;
  duration?: string;
};

export type CreateMedicalRecordInput = {
  doctorId: string;
  patientId: string;
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

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly patientsService: PatientsService,
  ) {
    this.loadPersistedRecords();
  }

  getRecordsByPatientId(patientId: string) {
    return this.medicalRecords.filter((record) => record.patientId === patientId);
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

  createRecord(input: CreateMedicalRecordInput): MedicalRecord {
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
      lifestyle: input.lifestyle?.trim(),
      diet: input.diet?.trim(),
      duration: input.duration?.trim(),
    };

    if (record.type === 'consultation' && record.appointmentId) {
      this.appointmentsService.completeAppointment(record.appointmentId);
    }

    this.medicalRecords.unshift(record);
    this.persistRecords();

    return {
      ...record,
      followUpDate: record.followUpDate || record.followUp,
    };
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
