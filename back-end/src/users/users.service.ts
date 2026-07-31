import { BadRequestException, Injectable } from '@nestjs/common';
import { PatientsService } from '../patients/patients.service';

export type UserRole = 'admin' | 'patient' | 'doctor' | 'frontdesk';

export type User = {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
};

type SafeUser = Omit<User, 'password'> & {
  firstName?: string;
  lastName?: string;
};

export type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  guardianName: string;
  password: string;
};

export type CreateDoctorUserInput = {
  name: string;
  email: string;
  password: string;
};

export type UpdateDoctorUserInput = {
  name?: string;
  email?: string;
};

export type CreateFrontdeskUserInput = {
  name: string;
  email: string;
  password: string;
};

export type UpdateFrontdeskUserInput = {
  name?: string;
  email?: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly patientsService: PatientsService) {}

  private readonly users: User[] = [
    {
      id: 'ADM001',
      name: 'Admin User',
      email: 'admin@medbits.com',
      password: 'admin123',
      role: 'admin',
    },
    {
      id: 'PAT001',
      name: 'Ria Sharma',
      email: 'ria@medbits.com',
      password: 'patient123',
      role: 'patient',
    },
    {
      id: 'PAT002',
      name: 'Arun Menon',
      email: 'arun.menon@medbits.com',
      password: 'patient123',
      role: 'patient',
    },
    {
      id: 'PAT003',
      name: 'Farah Ali',
      email: 'farah.ali@medbits.com',
      password: 'patient123',
      role: 'patient',
    },
    {
      id: 'PAT004',
      name: 'Dev Patel',
      email: 'dev.patel@medbits.com',
      password: 'patient123',
      role: 'patient',
    },
    {
      id: 'DOC001',
      name: 'Dr. S Madhuri',
      email: 'madhuri@medbits.com',
      password: 'doctor123',
      role: 'doctor',
    },
    {
      id: 'DOC002',
      name: 'Dr. Ashwini Ray',
      email: 'ashwini.ray@medbits.com',
      password: 'doctor123',
      role: 'doctor',
    },
    {
      id: 'DOC003',
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@medbits.com',
      password: 'doctor123',
      role: 'doctor',
    },
    {
      id: 'DOC004',
      name: 'Dr. Ramesh Iyer',
      email: 'ramesh.iyer@medbits.com',
      password: 'doctor123',
      role: 'doctor',
    },
    {
      id: 'DOC005',
      name: 'Dr. Paul Johnson',
      email: 'paul.johnson@medbits.com',
      password: 'doctor123',
      role: 'doctor',
    },
    {
      id: 'DOC006',
      name: 'Dr. Robert Wilson',
      email: 'robert.wilson@medbits.com',
      password: 'doctor123',
      role: 'doctor',
    },
    {
      id: 'DOC007',
      name: 'Dr. Anita Gupta',
      email: 'anita.gupta@medbits.com',
      password: 'doctor123',
      role: 'doctor',
    },
    {
      id: 'DOC008',
      name: 'Dr. Kavita Sharma',
      email: 'kavita.sharma@medbits.com',
      password: 'doctor123',
      role: 'doctor',
    },
    {
      id: 'DOC009',
      name: 'Dr. Vikram Nair',
      email: 'vikram.nair@medbits.com',
      password: 'doctor123',
      role: 'doctor',
    },
    {
      id: 'FD001',
      name: 'Priya Nair',
      email: 'frontdesk@medbits.com',
      password: 'desk123',
      role: 'frontdesk',
    },
  ];

  login(email: string, password: string): SafeUser | null {
    const user = this.users.find((item) => item.email === email);
    if (!user || user.password !== password) {
      return null;
    }

    const { password: _password, ...safeUser } = user;
    if (safeUser.role !== 'patient') {
      return safeUser;
    }

    const patientProfile = this.patientsService.getPatientByUserId(safeUser.id);

    return {
      ...safeUser,
      firstName: patientProfile.firstName,
      lastName: patientProfile.lastName,
    };
  }

  signupPatient(input: SignupInput): SafeUser {
    const email = input.email.trim().toLowerCase();
    if (this.users.some((item) => item.email.toLowerCase() === email)) {
      throw new BadRequestException('Email is already registered');
    }

    const nextId = this.generateNextPatientId();
    const safeName =
      `${input.firstName.trim()} ${input.lastName.trim()}`.trim();

    const user: User = {
      id: nextId,
      name: safeName,
      email,
      password: input.password,
      role: 'patient',
    };

    this.users.push(user);
    this.patientsService.createPatientProfile({
      userId: nextId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      dob: input.dob.trim(),
      gender: input.gender.trim(),
      bloodGroup: input.bloodGroup.trim(),
      phone: input.phone.trim(),
      email,
      guardianName: input.guardianName.trim(),
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
    };
  }

  createDoctorUser(input: CreateDoctorUserInput): SafeUser {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    if (!name || !email || !input.password) {
      throw new BadRequestException('Name, email and password are required');
    }

    if (this.users.some((item) => item.email.toLowerCase() === email)) {
      throw new BadRequestException('Email is already registered');
    }

    const user: User = {
      id: this.generateNextDoctorId(),
      name,
      email,
      password: input.password,
      role: 'doctor',
    };

    this.users.push(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  updateDoctorUser(userId: string, input: UpdateDoctorUserInput): SafeUser {
    const user = this.users.find(
      (item) => item.id === userId && item.role === 'doctor',
    );

    if (!user) {
      throw new BadRequestException('Doctor user not found');
    }

    const email = input.email?.trim().toLowerCase();
    if (email && email !== user.email.toLowerCase()) {
      if (this.users.some((item) => item.email.toLowerCase() === email)) {
        throw new BadRequestException('Email is already registered');
      }
      user.email = email;
    }

    const name = input.name?.trim();
    if (name) {
      user.name = name;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  createFrontdeskUser(input: CreateFrontdeskUserInput): SafeUser {
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    if (!name || !email || !input.password) {
      throw new BadRequestException('Name, email and password are required');
    }

    if (this.users.some((item) => item.email.toLowerCase() === email)) {
      throw new BadRequestException('Email is already registered');
    }

    const user: User = {
      id: this.generateNextFrontdeskId(),
      name,
      email,
      password: input.password,
      role: 'frontdesk',
    };

    this.users.push(user);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  updateFrontdeskUser(
    userId: string,
    input: UpdateFrontdeskUserInput,
  ): SafeUser {
    const user = this.users.find(
      (item) => item.id === userId && item.role === 'frontdesk',
    );

    if (!user) {
      throw new BadRequestException('Frontdesk user not found');
    }

    const email = input.email?.trim().toLowerCase();
    if (email && email !== user.email.toLowerCase()) {
      if (this.users.some((item) => item.email.toLowerCase() === email)) {
        throw new BadRequestException('Email is already registered');
      }
      user.email = email;
    }

    const name = input.name?.trim();
    if (name) {
      user.name = name;
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  private generateNextPatientId(): string {
    const patientIds = this.users
      .filter((item) => item.role === 'patient')
      .map((item) => Number.parseInt(item.id.replace('PAT', ''), 10))
      .filter((value) => Number.isFinite(value));

    const nextNumber = (patientIds.length ? Math.max(...patientIds) : 0) + 1;
    return `PAT${nextNumber.toString().padStart(3, '0')}`;
  }

  private generateNextDoctorId(): string {
    const doctorIds = this.users
      .filter((item) => item.role === 'doctor')
      .map((item) => Number.parseInt(item.id.replace('DOC', ''), 10))
      .filter((value) => Number.isFinite(value));

    const nextNumber = (doctorIds.length ? Math.max(...doctorIds) : 0) + 1;
    return `DOC${nextNumber.toString().padStart(3, '0')}`;
  }

  private generateNextFrontdeskId(): string {
    const frontdeskIds = this.users
      .filter((item) => item.role === 'frontdesk')
      .map((item) => Number.parseInt(item.id.replace('FD', ''), 10))
      .filter((value) => Number.isFinite(value));

    const nextNumber =
      (frontdeskIds.length ? Math.max(...frontdeskIds) : 0) + 1;
    return `FD${nextNumber.toString().padStart(3, '0')}`;
  }
}
