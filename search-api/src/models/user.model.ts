import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcrypt';

// User document interface
export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  name: string;
  role: 'admin' | 'user';
  refreshToken?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// User schema
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      maxlength: 255,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // Don't include in queries by default
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    role: {
      type: String,
      enum: ['admin', 'user'],
      default: 'user',
    },
    refreshToken: {
      type: String,
      select: false, // Don't include in queries by default
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch {
    return false;
  }
};

// Indexes
UserSchema.index({ email: 1 }, { unique: true, name: 'user_email_index' });
UserSchema.index({ role: 1 }, { name: 'user_role_index' });
UserSchema.index({ isActive: 1 }, { name: 'user_active_index' });
UserSchema.index({ createdAt: -1 }, { name: 'user_created_at_index' });

// Export the model
export const User = mongoose.model<IUser>('User', UserSchema);

// Type for user without sensitive fields
export type SafeUser = Omit<IUser, 'passwordHash' | 'refreshToken'>;

// Helper to convert user to safe user object
export function toSafeUser(user: IUser): SafeUser {
  const userObj = user.toObject();
  const { passwordHash, refreshToken, ...safeUser } = userObj;
  return safeUser as SafeUser;
}
