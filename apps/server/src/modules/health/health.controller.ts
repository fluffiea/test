import { Controller, Get } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

interface HealthPayload {
  status: 'ok';
  mongo: 'up' | 'down';
}

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  async check(): Promise<HealthPayload> {
    const mongo = this.connection.readyState === 1 ? 'up' : 'down';
    return { status: 'ok', mongo };
  }
}
