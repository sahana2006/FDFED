import { Injectable, NestMiddleware } from '@nestjs/common';
import { isBranchAdminRole } from './branch-request-context';
import { RequestContextService } from './request-context.service';
import { UsersService } from '../users/users.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly usersService: UsersService,
  ) {}

  async use(req: { headers: Record<string, string | string[] | undefined> }, _res: unknown, next: () => void): Promise<void> {
    const roleHeader = req.headers.role;
    const userIdHeader = req.headers['x-user-id'];
    const role = typeof roleHeader === 'string' ? roleHeader : undefined;
    const userId = typeof userIdHeader === 'string' ? userIdHeader : undefined;
    const branchId = isBranchAdminRole(role) && userId
      ? await this.usersService.getBranchAdminBranchId(userId)
      : undefined;

    this.requestContextService.run({ role, userId, branchId: branchId ?? undefined }, () => next());
  }
}