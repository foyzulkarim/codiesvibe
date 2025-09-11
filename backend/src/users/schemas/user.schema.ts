import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  githubId!: string;

  @Prop({ required: true, minlength: 1 })
  username!: string;

  @Prop({ 
    required: false,
    validate: {
      validator: function(email: string) {
        if (!email) return true; // Optional field
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      },
      message: 'Invalid email format'
    }
  })
  email?: string;

  @Prop({ required: true, minlength: 1 })
  displayName!: string;

  @Prop({ 
    required: true,
    validate: {
      validator: function(url: string) {
        return /^https?:\/\/.+/.test(url);
      },
      message: 'Invalid URL format'
    }
  })
  avatarUrl!: string;

  @Prop({ required: true })
  accessToken!: string;

  @Prop({ type: Date, default: Date.now })
  lastLoginAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes as specified in data-model.md
UserSchema.index({ githubId: 1 }, { unique: true }); // OAuth lookups
UserSchema.index({ username: 1 }); // Performance index for search/display