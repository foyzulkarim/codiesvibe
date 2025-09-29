import { PartialType } from '@nestjs/swagger';
import { CreateToolDto } from './create-tool.dto';

/**
 * UpdateToolDto extends CreateToolDto but makes all fields optional
 * This allows for partial updates while maintaining all validation rules
 * when fields are provided.
 */
export class UpdateToolDto extends PartialType(CreateToolDto) {
  // All fields from CreateToolDto are automatically made optional
  // Validation rules are preserved when fields are provided
  // This provides a clean, maintainable approach for updates
}
