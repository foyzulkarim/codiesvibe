import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ToolsService } from './tools.service';
import { ToolsController } from './tools.controller';
import { Tool, ToolSchema } from './schemas/tool.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Tool.name, schema: ToolSchema }]),
  ],
  controllers: [ToolsController],
  providers: [ToolsService],
})
export class ToolsModule {}