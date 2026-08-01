import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { BranchRequestContext } from './branch-request-context';

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<BranchRequestContext>();

  run<T>(context: BranchRequestContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  getContext(): BranchRequestContext | undefined {
    return this.storage.getStore();
  }

  getRole(): string | undefined {
    return this.getContext()?.role;
  }

  getUserId(): string | undefined {
    return this.getContext()?.userId;
  }
}
