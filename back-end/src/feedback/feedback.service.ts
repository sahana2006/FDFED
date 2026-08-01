import { BadRequestException, Injectable } from '@nestjs/common';
import { AppointmentsService } from '../appointments/appointments.service';
import { DoctorsService } from '../doctors/doctors.service';
import { HospitalBranchService } from '../hospital-branch/hospital-branch.service';
import { HospitalBranch } from '../hospital-branch/entities/hospital-branch.entity';

export type Feedback = {
  id: string;
  userId: string;
  doctorId: string;
  rating: string;
  comment: string;
  branchId: string;
  branch?: HospitalBranch;
};

export type CreateFeedbackInput = {
  userId: string;
  doctorId: string;
  rating: string;
  comment: string;
  branchId?: string;
};

@Injectable()
export class FeedbackService {
  private readonly feedbacks: Feedback[] = [];

  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly doctorsService: DoctorsService,
    private readonly hospitalBranchService: HospitalBranchService,
  ) {}

  async createFeedback(input: CreateFeedbackInput) {
    if (!input.userId || !input.doctorId || !input.rating || !input.comment) {
      throw new BadRequestException(
        'userId, doctorId, rating and comment are required',
      );
    }

    const doctor = this.doctorsService.getDoctorById(input.doctorId);
    const branchId = input.branchId?.trim() || doctor.branchId;
    const branch = await this.hospitalBranchService.findOne(branchId);
    if (doctor.branchId !== branchId) {
      throw new BadRequestException('Doctor does not belong to the selected hospital branch');
    }

    if (
      !this.appointmentsService.hasCompletedAppointment(
        input.userId,
        input.doctorId,
      )
    ) {
      throw new BadRequestException(
        'Feedback is only allowed for completed appointments',
      );
    }

    const existingFeedback = this.feedbacks.find(
      (feedback) =>
        feedback.userId === input.userId && feedback.doctorId === input.doctorId,
    );
    if (existingFeedback) {
      throw new BadRequestException(
        'Feedback has already been submitted for this doctor',
      );
    }

    const feedback: Feedback = {
      id: `FDBK${Date.now()}`,
      userId: input.userId,
      doctorId: input.doctorId,
      rating: input.rating,
      comment: input.comment,
      branchId,
      branch,
    };

    this.feedbacks.unshift(feedback);
    return this.toFeedbackDetails(feedback);
  }

  getFeedbackByDoctorId(doctorId: string) {
    return this.feedbacks
      .filter((feedback) => feedback.doctorId === doctorId)
      .map((feedback) => this.toFeedbackDetails(feedback));
  }

  getFeedbackByUserId(userId: string) {
    return this.feedbacks
      .filter((feedback) => feedback.userId === userId)
      .map((feedback) => this.toFeedbackDetails(feedback));
  }

  private toFeedbackDetails(feedback: Feedback) {
    const doctor = this.doctorsService.getDoctorById(feedback.doctorId);

    return {
      ...feedback,
      doctor,
    };
  }
}
