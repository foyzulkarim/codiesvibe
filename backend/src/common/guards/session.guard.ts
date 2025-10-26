import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SessionService } from '../../auth/session.service';
import { Request } from 'express';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly sessionService: SessionService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Skip session validation in development
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }

    // Check if this endpoint requires session validation
    const requireSession = this.reflector.get<boolean>(
      'requireSession',
      context.getHandler(),
    );
    if (!requireSession) {
      return true;
    }

    const sessionCookie = request.cookies?.session;
    const csrfToken = request.headers['x-csrf-token'] as string;

    if (!sessionCookie || !csrfToken) {
      throw new ForbiddenException('Session and CSRF token required');
    }

    const sessionId = this.sessionService.verifySessionCookie(sessionCookie);

    if (!sessionId) {
      throw new ForbiddenException('Invalid session cookie');
    }

    const userAgent = request.headers['user-agent'];
    const ip = this.getClientIp(request);

    const isValid = this.sessionService.validateSession(
      sessionId,
      csrfToken,
      userAgent,
      ip,
    );

    if (!isValid) {
      throw new ForbiddenException('Invalid or expired session');
    }

    // Attach session info to request for use in controllers
    (request as any).sessionId = sessionId;

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIp = request.headers['x-real-ip'] as string;

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIp) {
      return realIp;
    }

    return request.socket.remoteAddress || 'unknown';
  }
}
