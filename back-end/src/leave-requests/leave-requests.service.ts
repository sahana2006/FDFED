import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DoctorsService } from '../doctors/doctors.service';
import { AppointmentsService } from '../appointments/appointments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestContextService } from '../common/request-context.service';
import { LabTechniciansService } from '../lab-technicians/lab-technicians.service';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

export type LeaveRequest = {
  id: string;
  doctorId: string;
  date: string;
  type: string;
  reason: string;
  status: LeaveRequestStatus;
  createdAt: string;
  actionedOn?: string;
};

const LEAVE_REQUESTS_FILE = join(
  __dirname,
  '..',
  '..',
  'data',
  'leave-requests.json',
);

@Injectable()
export class LeaveRequestsService {
  private requests: LeaveRequest[] = [];

  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly appointmentsService: AppointmentsService,
    private readonly notificationsService: NotificationsService,
    private readonly requestContextService: RequestContextService,
    private readonly labTechniciansService: LabTechniciansService,
  ) {
    this.loadPersistedRequests();
  }

  async createLeaveRequest(userId: string, date: string, type?: string, reason?: string): Promise<LeaveRequest> {
    const cleanUserId = userId?.trim();
    if (!cleanUserId) {
      throw new BadRequestException('User ID is required');
    }

    // Validate user exists (Doctor or Lab Technician)
    let isDoctor = false;
    let isLabTech = false;
    try {
      await this.doctorsService.getDoctorById(cleanUserId);
      isDoctor = true;
    } catch (_) {
      try {
        await this.labTechniciansService.findOne(cleanUserId);
        isLabTech = true;
      } catch (_) {}
    }

    if (!isDoctor && !isLabTech) {
      throw new NotFoundException('User not found');
    }

    const cleanDate = date?.trim();
    if (!cleanDate) {
      throw new BadRequestException('Date is required');
    }

    // Check if a request already exists for this date
    const existing = this.requests.find(
      (r) => r.doctorId === cleanUserId && r.date === cleanDate && r.status !== 'rejected',
    );
    if (existing) {
      throw new BadRequestException(`A leave request for ${cleanDate} already exists (${existing.status})`);
    }

    const req: LeaveRequest = {
      id: `LR${Date.now()}`,
      doctorId: cleanUserId,
      date: cleanDate,
      type: type?.trim() || 'Casual',
      reason: reason?.trim() || 'Requested via portal',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    this.requests.push(req);
    this.persistRequests();
    return req;
  }

  async getAllRequests(): Promise<Array<LeaveRequest & { name: string; dept: string; dateRange: string }>> {
    const branchId = this.requestContextService.getContext()?.branchId;

    const result = (
      await Promise.all(
        this.requests.map(async (r) => {
          let name = r.doctorId;
          let dept = 'Medical Staff';
          let reqBranchId = '';

          try {
            const doc = await this.doctorsService.getDoctorById(r.doctorId);
            name = doc.name;
            dept = doc.department || doc.specialization || 'Doctor';
            reqBranchId = doc.branchId;
          } catch (_) {
            try {
              const tech = await this.labTechniciansService.findOne(r.doctorId);
              name = tech.name;
              dept = 'Laboratory';
              reqBranchId = tech.branchId;
            } catch (_) {}
          }

          return {
            ...r,
            name,
            dept,
            branchId: reqBranchId,
            dateRange: new Date(r.date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
          };
        }),
      )
    ).filter((r) => {
      if (branchId) return r.branchId === branchId;
      return true;
    });

    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async updateRequestStatus(id: string, status: LeaveRequestStatus): Promise<LeaveRequest> {
    const req = this.requests.find((r) => r.id === id);
    if (!req) {
      throw new NotFoundException('Leave request not found');
    }

    if (status === 'approved') {
      try {
        const doc = await this.doctorsService.getDoctorById(req.doctorId);
        if (doc) {
          const existingAppointments = await this.appointmentsService.getAppointmentsByDoctorId(req.doctorId);
          const bookedSlots = existingAppointments
            .filter((a) => a.date === req.date && a.status === 'upcoming')
            .map((a) => a.slot);

          if (bookedSlots.length > 0) {
            throw new BadRequestException(
              `Cannot approve leave for ${req.date} — ${bookedSlots.length} appointment(s) are already booked (slots: ${bookedSlots.join(', ')}). Please cancel them first.`,
            );
          }

          await this.doctorsService.markDateUnavailable(req.doctorId, req.date);
        }
      } catch (err) {
        if (err instanceof BadRequestException) throw err;
      }
    }

    req.status = status;
    req.actionedOn = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    this.persistRequests();

    // Send notification
    const prettyDate = new Date(req.date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
    const notifMessage = `Your leave request for ${prettyDate} has been ${status.toUpperCase()}.`;
    const notifType = status === 'approved' ? 'success' : 'error';
    this.notificationsService.createNotification(req.doctorId, notifMessage, notifType);

    return req;
  }

  private loadPersistedRequests() {
    try {
      if (!existsSync(LEAVE_REQUESTS_FILE)) return;
      const data = JSON.parse(readFileSync(LEAVE_REQUESTS_FILE, 'utf8'));
      if (Array.isArray(data)) this.requests = data;
    } catch (_) {}
  }

  private persistRequests() {
    mkdirSync(dirname(LEAVE_REQUESTS_FILE), { recursive: true });
    writeFileSync(LEAVE_REQUESTS_FILE, JSON.stringify(this.requests, null, 2));
  }
}
