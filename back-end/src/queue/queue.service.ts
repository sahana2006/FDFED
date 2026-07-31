import { BadRequestException, Injectable } from '@nestjs/common';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';

export type QueueStatus = 'waiting' | 'in-consultation' | 'done';

export type QueueItem = {
  id: string;
  doctorId: string;
  userId: string;
  tokenNumber: number;
  status: QueueStatus;
};

export type CreateQueueInput = {
  doctorId: string;
  userId: string;
};

export type UpdateQueueInput = {
  status: QueueStatus;
};

@Injectable()
export class QueueService {
  private readonly queue: QueueItem[] = [
    {
      id: 'QUE001',
      doctorId: 'DOC003',
      userId: 'PAT001',
      tokenNumber: 1,
      status: 'in-consultation',
    },
    {
      id: 'QUE002',
      doctorId: 'DOC003',
      userId: 'PAT002',
      tokenNumber: 2,
      status: 'waiting',
    },
    {
      id: 'QUE003',
      doctorId: 'DOC001',
      userId: 'PAT003',
      tokenNumber: 1,
      status: 'waiting',
    },
  ];

  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly patientsService: PatientsService,
  ) {}

  createQueueToken(input: CreateQueueInput) {
    if (!input.doctorId || !input.userId) {
      throw new BadRequestException('doctorId and userId are required');
    }

    this.doctorsService.getDoctorById(input.doctorId);

    const nextTokenNumber =
      this.queue
        .filter((item) => item.doctorId === input.doctorId)
        .reduce((max, item) => Math.max(max, item.tokenNumber), 0) + 1;

    const queueItem: QueueItem = {
      id: `QUE${Date.now()}`,
      doctorId: input.doctorId,
      userId: input.userId,
      tokenNumber: nextTokenNumber,
      status: 'waiting',
    };

    this.queue.push(queueItem);
    return this.toQueueDetails(queueItem);
  }

  getAllQueueItems() {
    return this.queue
      .slice()
      .sort(this.compareQueueItems)
      .map((item) => this.toQueueDetails(item));
  }

  getQueueByDoctorId(doctorId: string) {
    this.doctorsService.getDoctorById(doctorId);
    return this.queue
      .filter((item) => item.doctorId === doctorId)
      .sort(this.compareQueueItems)
      .map((item) => this.toQueueDetails(item));
  }

  getQueueByUserId(userId: string) {
    return this.queue
      .filter((item) => item.userId === userId && item.status !== 'done')
      .sort(this.compareQueueItems)
      .map((item) => this.toQueueDetails(item));
  }

  updateQueueStatus(id: string, input: UpdateQueueInput) {
    const queueItem = this.queue.find((item) => item.id === id);
    if (!queueItem) {
      throw new BadRequestException('Queue item not found');
    }

    if (!['waiting', 'in-consultation', 'done'].includes(input.status)) {
      throw new BadRequestException(
        'status must be waiting, in-consultation, or done',
      );
    }

    queueItem.status = input.status;
    return this.toQueueDetails(queueItem);
  }

  private compareQueueItems(a: QueueItem, b: QueueItem) {
    const statusOrder: Record<QueueStatus, number> = {
      'in-consultation': 0,
      waiting: 1,
      done: 2,
    };

    if (a.doctorId !== b.doctorId) {
      return a.doctorId.localeCompare(b.doctorId);
    }

    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }

    return a.tokenNumber - b.tokenNumber;
  }

  private toQueueDetails(queueItem: QueueItem) {
    const doctor = this.doctorsService.getDoctorById(queueItem.doctorId);
    let patient: Record<string, string | number> = {
      userId: queueItem.userId,
      name: queueItem.userId,
    };

    try {
      const patientProfile = this.patientsService.getPatientByUserId(
        queueItem.userId,
      );
      patient = {
        userId: patientProfile.userId,
        firstName: patientProfile.firstName,
        lastName: patientProfile.lastName,
        name: `${patientProfile.firstName} ${patientProfile.lastName}`.trim(),
        phone: patientProfile.phone,
        gender: patientProfile.gender,
        dob: patientProfile.dob,
      };
    } catch (_) {}

    return {
      ...queueItem,
      doctor,
      patient,
    };
  }
}
