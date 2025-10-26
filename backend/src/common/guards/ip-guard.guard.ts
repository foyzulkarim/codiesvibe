import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class IpGuard implements CanActivate {
  private readonly blockedIps = new Set<string>();
  private readonly requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly MAX_REQUESTS_PER_MINUTE = 30;
  private readonly BLOCK_DURATION = 5 * 60 * 1000; // 5 minutes

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = this.getClientIp(request);

    // Check if IP is blocked
    if (this.blockedIps.has(ip)) {
      throw new ForbiddenException(
        'IP address temporarily blocked due to suspicious activity',
      );
    }

    // Track request frequency
    this.trackRequestFrequency(ip);

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

    return (
      request.socket.remoteAddress ||
      (request as any).connection?.remoteAddress ||
      'unknown'
    );
  }

  private trackRequestFrequency(ip: string): void {
    const now = Date.now();
    const current = this.requestCounts.get(ip);

    if (!current) {
      this.requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
      return;
    }

    if (now > current.resetTime) {
      // Reset counter
      this.requestCounts.set(ip, { count: 1, resetTime: now + 60000 });
      return;
    }

    current.count++;

    // Block IP if exceeding threshold
    if (current.count > this.MAX_REQUESTS_PER_MINUTE) {
      this.blockedIps.add(ip);
      setTimeout(() => {
        this.blockedIps.delete(ip);
        this.requestCounts.delete(ip);
      }, this.BLOCK_DURATION);
    }
  }
}
