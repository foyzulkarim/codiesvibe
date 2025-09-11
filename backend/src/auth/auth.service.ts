import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async validateUser(userPayload: any): Promise<any> {
    const existingUser = await this.userModel.findOne({
      githubId: userPayload.githubId,
    });

    if (existingUser) {
      // Update existing user
      existingUser.username = userPayload.username;
      existingUser.email = userPayload.email;
      existingUser.displayName = userPayload.displayName;
      existingUser.avatarUrl = userPayload.avatarUrl;
      existingUser.accessToken = userPayload.accessToken;
      existingUser.lastLoginAt = new Date();
      
      await existingUser.save();
      return existingUser;
    } else {
      // Create new user
      const newUser = new this.userModel({
        ...userPayload,
        lastLoginAt: new Date(),
      });
      
      await newUser.save();
      return newUser;
    }
  }

  async generateToken(user: UserDocument): Promise<string> {
    const payload = {
      sub: user._id,
      username: user.username,
      githubId: user.githubId,
    };
    
    return this.jwtService.sign(payload);
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      lastLoginAt: new Date(),
    });
  }
}