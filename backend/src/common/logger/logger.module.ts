import { Module, Global } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { CorrelationInterceptor } from './correlation.interceptor';

@Global()
@Module({
  providers: [LoggerService, CorrelationInterceptor],
  exports: [LoggerService, CorrelationInterceptor],
})
export class LoggerModule {}
