import { SetMetadata } from '@nestjs/common';
import { Role, UserRole } from '../../users/users.service';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const SuperAdminOnly = () => Roles(Role.SUPER_ADMIN);
