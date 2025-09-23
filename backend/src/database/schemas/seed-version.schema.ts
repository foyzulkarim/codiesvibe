import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SeedVersionDocument = SeedVersion & Document;

@Schema({ timestamps: true, collection: 'seed_versions' })
export class SeedVersion {
  @Prop({ required: true, unique: true, index: true, trim: true })
  component!: string;

  @Prop({ required: true, type: Number, min: 0 })
  version!: number;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  toolsCount!: number;

  @Prop({ type: Date, required: true, default: Date.now })
  lastUpdated!: Date;
}

export const SeedVersionSchema = SchemaFactory.createForClass(SeedVersion);

// Ensure unique index on component field
SeedVersionSchema.index(
  { component: 1 },
  { unique: true, name: 'unique_component' },
);
