import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/users.service';
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

    if (!requiredRoles.includes(role)) {
      throw new ForbiddenException(`Access denied for role: ${role}`);
    }

    return true;
  }
}
