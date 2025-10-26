import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({
    description: 'Origin domain for validation',
    example: 'https://yourdomain.com',
  })
  @IsString()
  origin!: string;
}

export class SessionResponseDto {
  @ApiProperty({
    description: 'Session ID',
    example: 'sess_1234567890abcdef',
  })
  sessionId!: string;

  @ApiProperty({
    description: 'CSRF token',
    example: 'csrf_1234567890abcdef',
  })
  csrfToken!: string;

  @ApiProperty({
    description: 'Session expiry timestamp',
    example: '2024-01-01T12:00:00.000Z',
  })
  expiresAt!: string;

  @ApiProperty({
    description: 'Whether session is valid',
    example: true,
  })
  valid!: boolean;
}

export class VerifySessionDto {
  @ApiProperty({
    description: 'CSRF token from header',
    example: 'csrf_1234567890abcdef',
  })
  @IsString()
  csrfToken!: string;
}
