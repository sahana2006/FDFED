import { Injectable } from '@nestjs/common';

// Branch Admin portal v1.0 — login fixed
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
  
 