import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { SessionService } from './session.service';

@Module({
  controllers: [AuthController],
  providers: [SessionService],
  exports: [SessionService],
})
export class AuthModule {}
