import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, UserRole } from '../../users/users.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required for this endpoint
    }

    const request = context.switchToHttp().getRequest();
    const role = request.headers['role'] as UserRole;

    if (!role) {
      throw new UnauthorizedException('Role header is missing');
    }

    // Super admins retain unrestricted access without changing the route-level
    // permissions assigned to the existing roles.
    if (role === Role.SUPER_ADMIN) {
      return true;
    }

    // Branch admins replace the legacy admin account. Existing endpoints keep
    // their `admin` metadata so their public API contracts remain unchanged.
    if (role === Role.BRANCH_ADMIN && requiredRoles.includes(Role.ADMIN)) {
      return true;
    }

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(`Access denied for role: ${role}`);
    }

    return true;
  }
}
