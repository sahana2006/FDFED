import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateHospitalBranchDto } from './dto/create-hospital-branch.dto';
import { UpdateHospitalBranchDto } from './dto/update-hospital-branch.dto';
import { HospitalBranch, PlanTier } from './entities/hospital-branch.entity';
import { SubscriptionPayment } from './entities/subscription-payment.entity';

function getPlanCost(tier: PlanTier): number {
  switch (tier) {
    case PlanTier.BASE: return 999;
    case PlanTier.PRO: return 2999;
    case PlanTier.ENTERPRISE: return 9999;
    default: return 999;
  }
}

@Injectable()
export class HospitalBranchService {
  constructor(
    @InjectRepository(HospitalBranch)
    private readonly hospitalBranchRepository: Repository<HospitalBranch>,
    @InjectRepository(SubscriptionPayment)
    private readonly subscriptionPaymentRepository: Repository<SubscriptionPayment>,
  ) {}

  async create(createHospitalBranchDto: CreateHospitalBranchDto): Promise<HospitalBranch> {
    const email = createHospitalBranchDto.email.trim().toLowerCase();
    const existingBranch = await this.hospitalBranchRepository.findOneBy({ email });
    if (existingBranch) {
      throw new ConflictException('A hospital branch with this email already exists');
    }

    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1); // 1 month from now

    const branch = this.hospitalBranchRepository.create({
      ...this.cleanTextFields(createHospitalBranchDto),
      email,
      planTier: createHospitalBranchDto.planTier || PlanTier.BASE,
      subscriptionDue: dueDate,
    });
    const savedBranch = await this.hospitalBranchRepository.save(branch);

    // Record the initial subscription payment
    const payment = this.subscriptionPaymentRepository.create({
      branchId: savedBranch.id,
      planTier: savedBranch.planTier,
      amount: getPlanCost(savedBranch.planTier),
    });
    await this.subscriptionPaymentRepository.save(payment);

    return savedBranch;
  }

  findAll(): Promise<HospitalBranch[]> {
    return this.hospitalBranchRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<HospitalBranch> {
    const branch = await this.hospitalBranchRepository.findOneBy({ id });
    if (!branch) {
      throw new NotFoundException('Hospital branch not found');
    }
    return branch;
  }

  async update(id: string, updateHospitalBranchDto: UpdateHospitalBranchDto): Promise<HospitalBranch> {
    const branch = await this.findOne(id);
    const update = this.cleanTextFields(updateHospitalBranchDto);

    if (update.email !== undefined) {
      update.email = update.email.toLowerCase();
      const existingBranch = await this.hospitalBranchRepository.findOneBy({ email: update.email });
      if (existingBranch && existingBranch.id !== id) {
        throw new ConflictException('A hospital branch with this email already exists');
      }
    }

    Object.assign(branch, update);
    return this.hospitalBranchRepository.save(branch);
  }

  async remove(id: string): Promise<void> {
    const branch = await this.findOne(id);
    await this.hospitalBranchRepository.remove(branch);
  }

  async getEarnings() {
    const payments = await this.subscriptionPaymentRepository.find({
      relations: ['branch'],
      order: { paymentDate: 'DESC' },
    });

    const totalEarnings = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    
    // Optional: Calculate this month's earnings
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const thisMonthEarnings = payments
      .filter(p => p.paymentDate.getMonth() === currentMonth && p.paymentDate.getFullYear() === currentYear)
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      totalEarnings,
      thisMonthEarnings,
      recentPayments: payments.slice(0, 50).map(p => ({
        id: p.id,
        branchName: p.branch?.branchName || 'Unknown',
        hospitalName: p.branch?.hospitalName || 'Unknown',
        amount: p.amount,
        planTier: p.planTier,
        paymentDate: p.paymentDate,
      })),
    };
  }

  async renewSubscription(branchId: string): Promise<HospitalBranch> {
    const branch = await this.findOne(branchId);
    
    // Extend due date by 1 month
    const currentDue = branch.subscriptionDue ? new Date(branch.subscriptionDue) : new Date();
    currentDue.setMonth(currentDue.getMonth() + 1);
    branch.subscriptionDue = currentDue;
    
    const savedBranch = await this.hospitalBranchRepository.save(branch);

    // Log payment
    const payment = this.subscriptionPaymentRepository.create({
      branchId: savedBranch.id,
      planTier: savedBranch.planTier,
      amount: getPlanCost(savedBranch.planTier),
    });
    await this.subscriptionPaymentRepository.save(payment);

    return savedBranch;
  }

  private cleanTextFields(
    dto: Partial<CreateHospitalBranchDto>,
  ): Partial<CreateHospitalBranchDto> {
    const cleaned = { ...dto };
    const textFields: Array<keyof CreateHospitalBranchDto> = [
      'hospitalName',
      'branchName',
      'address',
      'city',
      'state',
      'pincode',
      'phone',
      'email',
    ];

    for (const field of textFields) {
      const value = cleaned[field] as string | undefined;
      if (typeof value === 'string') {
        (cleaned as Record<string, unknown>)[field] = value.trim();
      }
    }
    return cleaned;
  }
}
