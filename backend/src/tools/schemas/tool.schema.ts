import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ToolDocument = Tool & Document;

@Schema({ timestamps: true })
export class Tool {
  @Prop({ 
    required: true, 
    minlength: 1, 
    maxlength: 100,
    trim: true 
  })
  name!: string;

  @Prop({ 
    required: true, 
    minlength: 1, 
    maxlength: 500,
    trim: true 
  })
  description!: string;

  @Prop({ 
    type: Types.ObjectId, 
    ref: 'User', 
    required: true 
  })
  createdBy!: Types.ObjectId;
}

export const ToolSchema = SchemaFactory.createForClass(Tool);

// Create indexes as specified in data-model.md
ToolSchema.index({ createdBy: 1 }); // User-specific queries
ToolSchema.index({ 
  name: 'text', 
  description: 'text' 
}, { 
  name: 'tool_search_index' 
}); // Text search on name and description