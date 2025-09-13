import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  HealthCheckService,
  HealthCheck,
  MongooseHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private db: MongooseHealthIndicator,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @HealthCheck()
  async check() {
    const healthResult = await this.health.check([
      () => this.db.pingCheck('database'),
    ]);
    
    return {
      ...healthResult,
      timestamp: new Date().toISOString(),
      database: healthResult.info?.database || healthResult.details?.database
    };
  }
}