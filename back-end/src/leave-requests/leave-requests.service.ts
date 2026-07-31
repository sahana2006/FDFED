import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DoctorsService } from '../doctors/doctors.service';
import { AppointmentsService } from '../appointments/appointments.service';

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
  ) {
    this.loadPersistedRequests();
  }

  createLeaveRequest(doctorId: string, date: string, type?: string, reason?: string): LeaveRequest {
    // Validate doctor exists
    this.doctorsService.getDoctorById(doctorId);
    
    const cleanDate = date?.trim();
    if (!cleanDate) {
      throw new BadRequestException('Date is required');
    }

    // Check if a request already exists for this date
    const existing = this.requests.find(r => r.doctorId === doctorId && r.date === cleanDate && r.status !== 'rejected');
    if (existing) {
      throw new BadRequestException(`A leave request for ${cleanDate} already exists (${existing.status})`);
    }
    
    const req: LeaveRequest = {
      id: `LR${Date.now()}`,
      doctorId,
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

  getAllRequests(): Array<LeaveRequest & { name: string; dept: string; dateRange: string }> {
    return this.requests.map((r) => {
      let doctorName = r.doctorId;
      let doctorDept = '';
      try {
        const doc = this.doctorsService.getDoctorById(r.doctorId);
        doctorName = doc.name;
        doctorDept = doc.department || doc.specialization;
      } catch (_) {}
      
      return {
        ...r,
        name: doctorName,
        dept: doctorDept,
        dateRange: new Date(r.date).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        }),
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  updateRequestStatus(id: string, status: LeaveRequestStatus): LeaveRequest {
    const req = this.requests.find((r) => r.id === id);
    if (!req) {
      throw new NotFoundException('Leave request not found');
    }
    
    if (status === 'approved') {
      // Check if there are booked appointments
      const existingAppointments = this.appointmentsService.getAppointmentsByDoctorId(req.doctorId);
      const bookedSlots = existingAppointments
        .filter((a) => a.date === req.date && a.status === 'upcoming')
        .map((a) => a.slot);

      if (bookedSlots.length > 0) {
        throw new BadRequestException(
          `Cannot approve leave for ${req.date} — ${bookedSlots.length} appointment(s) are already booked (slots: ${bookedSlots.join(', ')}). Please cancel them first.`,
        );
      }
      
      // Mark unavailable
      this.doctorsService.markDateUnavailable(req.doctorId, req.date);
    }
    
    req.status = status;
    req.actionedOn = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    this.persistRequests();
    
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
