import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-github2';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('github.clientId') || '',
      clientSecret: configService.get<string>('github.clientSecret') || '',
      callbackURL: configService.get<string>('github.callbackUrl') || '',
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    const { id, username, displayName, emails, photos } = profile;
    
    const userPayload = {
      githubId: id,
      username: username,
      email: emails && emails.length > 0 ? emails[0].value : null,
      displayName: displayName || username,
      avatarUrl: photos && photos.length > 0 ? photos[0].value : '',
      accessToken,
    };

    // Create or update user
    const user = await this.authService.validateUser(userPayload);
    return user;
  }
}