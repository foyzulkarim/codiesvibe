import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SESSION_KEY = 'requireSession';
export const RequireSession = () => SetMetadata(REQUIRE_SESSION_KEY, true);
