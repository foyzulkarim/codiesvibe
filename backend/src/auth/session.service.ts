import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { SessionResponseDto } from './dto/session.dto';

@Injectable()
export class SessionService {
  private readonly sessions = new Map<
    string,
    {
      csrfToken: string;
      expiresAt: number;
      origin: string;
      userAgent?: string;
      ip?: string;
    }
  >();

  private readonly cookieSecret: string;
  private readonly sessionTimeout: number;
  private readonly allowedDomains: string[];

  constructor(private configService: ConfigService) {
    this.cookieSecret =
      this.configService.get<string>('COOKIE_SECRET') ||
      'default-secret-change-in-production';
    this.sessionTimeout = parseInt(
      this.configService.get<string>('SESSION_TIMEOUT') || '900000',
    ); // 15 minutes
    this.allowedDomains = this.parseAllowedDomains();
  }

  createSession(
    origin: string,
    userAgent?: string,
    ip?: string,
  ): SessionResponseDto {
    const sessionId = this.generateSecureToken('sess_');
    const csrfToken = this.generateSecureToken('csrf_');
    const expiresAt = Date.now() + this.sessionTimeout;

    this.sessions.set(sessionId, {
      csrfToken,
      expiresAt,
      origin,
      userAgent,
      ip,
    });

    return {
      sessionId,
      csrfToken,
      expiresAt: new Date(expiresAt).toISOString(),
      valid: true,
    };
  }

  validateSession(
    sessionId: string,
    csrfToken: string,
    userAgent?: string,
    ip?: string,
  ): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    // Check expiry
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Verify CSRF token with timing-safe comparison
    const csrfBuffer = Buffer.from(csrfToken);
    const storedCsrfBuffer = Buffer.from(session.csrfToken);

    if (
      csrfBuffer.length !== storedCsrfBuffer.length ||
      !timingSafeEqual(csrfBuffer, storedCsrfBuffer)
    ) {
      return false;
    }

    // Optional: Verify user agent and IP for additional security
    if (userAgent && session.userAgent && userAgent !== session.userAgent) {
      return false;
    }

    if (ip && session.ip && ip !== session.ip) {
      return false;
    }

    // Extend session on successful validation
    session.expiresAt = Date.now() + this.sessionTimeout;

    return true;
  }

  validateOrigin(origin: string): boolean {
    if (process.env.NODE_ENV !== 'production') {
      return true; // Allow all origins in development
    }

    if (!origin) {
      return false;
    }

    // In production, allow frontend domains and subdomains
    const allowedOrigins = [
      'https://codiesvibe.com',
      'https://www.codiesvibe.com',
      'https://api.codiesvibe.com',
      ...this.allowedDomains,
    ];

    return allowedOrigins.some((allowed) => {
      if (allowed === origin) return true;
      return origin.endsWith(`.${allowed.replace(/^https?:\/\//, '')}`);
    });
  }

  getSessionCookie(sessionId: string): string {
    const signature = this.signCookie(sessionId);
    return `${sessionId}.${signature}`;
  }

  verifySessionCookie(cookie: string): string | null {
    if (!cookie) {
      return null;
    }

    const [sessionId, signature] = cookie.split('.');

    if (!sessionId || !signature) {
      return null;
    }

    const expectedSignature = this.signCookie(sessionId);

    // Timing-safe comparison
    const sigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSignature);

    if (
      sigBuffer.length !== expectedSigBuffer.length ||
      !timingSafeEqual(sigBuffer, expectedSigBuffer)
    ) {
      return null;
    }

    return sessionId;
  }

  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  private generateSecureToken(prefix: string): string {
    const bytes = randomBytes(16);
    return prefix + bytes.toString('hex');
  }

  private signCookie(sessionId: string): string {
    return createHmac('sha256', this.cookieSecret)
      .update(sessionId)
      .digest('hex')
      .substring(0, 32);
  }

  private parseAllowedDomains(): string[] {
    const domains = this.configService.get<string>('ALLOWED_DOMAINS');
    if (!domains) {
      return [];
    }

    return domains.split(',').map((domain) => domain.trim().toLowerCase());
  }
}
