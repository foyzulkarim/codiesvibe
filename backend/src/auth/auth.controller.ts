import {
  Controller,
  Post,
  Body,
  Res,
  Req,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { SessionService } from './session.service';
import { CreateSessionDto, SessionResponseDto } from './dto/session.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly sessionService: SessionService) {}

  @Post('session')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({
    status: 201,
    description: 'Session created successfully',
    type: SessionResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Origin not allowed' })
  async createSession(
    @Body() createSessionDto: CreateSessionDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponseDto> {
    const origin = createSessionDto.origin;

    // Validate origin in production
    if (!this.sessionService.validateOrigin(origin)) {
      throw new ForbiddenException('Origin not allowed');
    }

    const userAgent = req.headers['user-agent'];
    const ip = this.getClientIp(req);

    const session = this.sessionService.createSession(origin, userAgent, ip);

    // Set secure cookie
    const cookieValue = this.sessionService.getSessionCookie(session.sessionId);
    const isProduction = process.env.NODE_ENV === 'production';

    res.cookie('session', cookieValue, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict', // 'none' for cross-subdomain in production
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
      ...(isProduction && { domain: '.codiesvibe.com' }), // Work across all subdomains
    });

    return session;
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify session validity' })
  @ApiResponse({ status: 200, description: 'Session is valid' })
  @ApiResponse({ status: 401, description: 'Invalid or expired session' })
  async verifySession(
    @Headers('x-csrf-token') csrfToken: string,
    @Req() req: Request,
  ): Promise<{ valid: boolean }> {
    const sessionCookie = req.cookies?.session;

    if (!sessionCookie || !csrfToken) {
      return { valid: false };
    }

    const sessionId = this.sessionService.verifySessionCookie(sessionCookie);

    if (!sessionId) {
      return { valid: false };
    }

    const userAgent = req.headers['user-agent'];
    const ip = this.getClientIp(req);

    const isValid = this.sessionService.validateSession(
      sessionId,
      csrfToken,
      userAgent,
      ip,
    );

    return { valid: isValid };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh session' })
  @ApiResponse({ status: 200, description: 'Session refreshed' })
  async refreshSession(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<SessionResponseDto> {
    const sessionCookie = req.cookies?.session;

    if (!sessionCookie) {
      throw new ForbiddenException('No session found');
    }

    const sessionId = this.sessionService.verifySessionCookie(sessionCookie);

    if (!sessionId) {
      throw new ForbiddenException('Invalid session');
    }

    // Get existing session data
    const session = (this.sessionService as any).sessions.get(sessionId);
    if (!session) {
      throw new ForbiddenException('Session expired');
    }

    // Create new session with same data
    const newSession = this.sessionService.createSession(
      session.origin,
      session.userAgent,
      session.ip,
    );

    // Set new cookie
    const cookieValue = this.sessionService.getSessionCookie(newSession.sessionId);
    const isProduction = process.env.NODE_ENV === 'production';
    
    res.cookie('session', cookieValue, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict', // 'none' for cross-subdomain in production
      maxAge: 15 * 60 * 1000, // 15 minutes
      path: '/',
      ...(isProduction && { domain: '.codiesvibe.com' }), // Work across all subdomains
    });

    return newSession;
  }

  @Get('csrf')
  @ApiOperation({ summary: 'Get CSRF token' })
  @ApiResponse({ status: 200, description: 'CSRF token retrieved' })
  async getCsrfToken(@Req() req: Request): Promise<{ csrfToken: string }> {
    const sessionCookie = req.cookies?.session;

    if (!sessionCookie) {
      throw new ForbiddenException('No session found');
    }

    const sessionId = this.sessionService.verifySessionCookie(sessionCookie);

    if (!sessionId) {
      throw new ForbiddenException('Invalid session');
    }

    const session = (this.sessionService as any).sessions.get(sessionId);
    if (!session) {
      throw new ForbiddenException('Session expired');
    }

    return { csrfToken: session.csrfToken };
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'] as string;
    const realIp = req.headers['x-real-ip'] as string;

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    if (realIp) {
      return realIp;
    }

    return req.socket.remoteAddress || 'unknown';
  }

  private getCookieDomain(origin: string): string {
    try {
      const url = new URL(origin);
      return url.hostname;
    } catch {
      return '';
    }
  }
}
