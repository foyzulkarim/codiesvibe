import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnhancedSeedService } from './enhanced-seed.service';
import { Tool, ToolSchema } from '../../tools/schemas/tool.schema';
import { SeedVersion, SeedVersionSchema } from '../schemas/seed-version.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tool.name, schema: ToolSchema },
      { name: SeedVersion.name, schema: SeedVersionSchema },
    ]),
  ],
  providers: [EnhancedSeedService],
  exports: [EnhancedSeedService],
})
export class SeedingModule {}
