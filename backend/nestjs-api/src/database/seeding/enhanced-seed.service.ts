import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { Tool, ToolDocument } from '../../tools/schemas/tool.schema';
import { CreateToolDto } from '../../tools/dto/create-tool.dto';
import {
  SeedVersion,
  SeedVersionDocument,
} from '../schemas/seed-version.schema';

interface SeedFileShape {
  version: number;
  lastUpdated?: string;
  contributors?: any[];
  tools: any[];
}

interface SeedFileInfo {
  filePath: string;
  filename: string;
  fileVersion: number;
  data: SeedFileShape;
}

@Injectable()
export class EnhancedSeedService {
  private readonly logger = new Logger(EnhancedSeedService.name);

  constructor(
    @InjectModel(Tool.name) private readonly toolModel: Model<ToolDocument>,
    @InjectModel(SeedVersion.name)
    private readonly seedVersionModel: Model<SeedVersionDocument>,
  ) {}

  async seedTools(): Promise<void> {
    try {
      const currentVersion = await this.getCurrentSeedVersion();
      const seedFiles = await this.loadAllSeedFiles();

      this.logger.log(
        `Current version: ${currentVersion}, Found ${seedFiles.length} seed file(s)`,
      );

      // Filter files that need processing (version > currentVersion)
      const filesToProcess = seedFiles.filter(
        (file) => file.fileVersion > currentVersion,
      );

      if (filesToProcess.length === 0) {
        this.logger.log('Database is up to date, skipping seed');
        return;
      }

      this.logger.log(`Processing ${filesToProcess.length} file(s):`);
      filesToProcess.forEach((file) => {
        this.logger.log(`  - ${file.filename} (v${file.fileVersion})`);
      });

      // Process files sequentially
      for (const seedFile of filesToProcess) {
        await this.processSeedFile(seedFile);
        await this.updateSeedVersion(seedFile.fileVersion);
        this.logger.log(
          `Processed ${seedFile.filename} successfully. Version updated to ${seedFile.fileVersion}`,
        );
      }

      this.logger.log(
        `Seeding completed successfully. Final version: ${filesToProcess[filesToProcess.length - 1].fileVersion}`,
      );
    } catch (error: any) {
      this.logger.error(`Seeding failed: ${error?.message || error}`);
      throw error;
    }
  }

  private async validateTools(
    tools: any[],
  ): Promise<{ validTools: CreateToolDto[]; errors: string[] }> {
    const validTools: CreateToolDto[] = [];
    const errors: string[] = [];

    if (!Array.isArray(tools)) {
      return { validTools, errors: ['Seed tools must be an array'] };
    }

    for (let i = 0; i < tools.length; i++) {
      const toolData = tools[i];
      const label = toolData?.name || toolData?.id || `#${i + 1}`;
      try {
        const dto = plainToInstance(CreateToolDto, toolData);
        const validationErrors = await validate(dto, {
          whitelist: true,
          forbidUnknownValues: false,
        });

        // Additional checks to ensure compatibility with our Mongoose schema
        const additionalErrors: string[] = [];
        if (!dto.logoUrl) additionalErrors.push('logoUrl is required');
        if (!dto.searchKeywords || dto.searchKeywords.length === 0)
          additionalErrors.push('searchKeywords must be a non-empty array');
        const hasPrimaryCategories =
          Array.isArray(dto.categories?.primary) &&
          dto.categories.primary.length > 0;
        const hasSecondaryCategories =
          Array.isArray(dto.categories?.secondary) &&
          dto.categories.secondary.length > 0;
        if (!(hasPrimaryCategories || hasSecondaryCategories))
          additionalErrors.push(
            'categories must have at least one non-empty array (primary or secondary)',
          );

        if (validationErrors.length > 0 || additionalErrors.length > 0) {
          const classValidatorMsgs = validationErrors
            .map((e) =>
              e.constraints
                ? Object.values(e.constraints).join(', ')
                : 'invalid',
            )
            .filter(Boolean)
            .join('; ');
          const msg = [classValidatorMsgs, ...additionalErrors]
            .filter(Boolean)
            .join('; ');
          errors.push(`Tool ${label}: ${msg}`);
          continue;
        }

        validTools.push(dto);
      } catch (err: any) {
        errors.push(`Tool ${label}: ${err?.message || 'Unknown error'}`);
      }
    }

    return { validTools, errors };
  }

  private mapSeedToToolDoc(dto: CreateToolDto, createdBy: Types.ObjectId) {
    return {
      id: dto.id,
      name: dto.name,
      description: dto.description,
      createdBy,
      longDescription: dto.longDescription ?? null,
      interface: dto.interface,
      functionality: dto.functionality,
      deployment: dto.deployment,
      logoUrl: dto.logoUrl,
      searchKeywords: dto.searchKeywords,
      categories: dto.categories,
      capabilities: dto.capabilities,
      semanticTags: dto.semanticTags,
      aliases: dto.aliases,
      pricingSummary: dto.pricingSummary,
      pricingDetails: dto.pricingDetails,
      pricingUrl: dto.pricingUrl,
      useCases: dto.useCases,
      slug: dto.slug,
      tagline: dto.tagline,
      website: dto.website,
      documentation: dto.documentation,
      status: dto.status,
    } as Partial<Tool>;
  }

  private async loadAllSeedFiles(): Promise<SeedFileInfo[]> {
    const seedsDirs = this.getSeedDirectories();
    const allFiles: SeedFileInfo[] = [];

    for (const seedsDir of seedsDirs) {
      if (fs.existsSync(seedsDir)) {
        const files = fs
          .readdirSync(seedsDir)
          .filter((filename) => filename.endsWith('.json'))
          .map((filename) => path.join(seedsDir, filename));

        for (const filePath of files) {
          try {
            const seedFile = await this.loadAndValidateSeedFile(filePath);
            allFiles.push(seedFile);
          } catch (error: any) {
            this.logger.warn(
              `Skipping invalid seed file ${filePath}: ${error.message}`,
            );
          }
        }

        if (allFiles.length > 0) {
          break; // Use files from the first directory that has valid files
        }
      }
    }

    if (allFiles.length === 0) {
      throw new Error(
        `No valid seed files found in directories: ${seedsDirs.join(', ')}`,
      );
    }

    // Sort by version number
    allFiles.sort((a, b) => a.fileVersion - b.fileVersion);

    // Check for duplicate tool IDs across all files
    this.validateNoDuplicateTools(allFiles);

    return allFiles;
  }

  private getSeedDirectories(): string[] {
    const override = process.env.SEEDS_FILE;
    if (override && fs.existsSync(override)) {
      return [path.dirname(override)];
    }

    const seedsDirDist = path.join(__dirname, '../seeds');
    const cwd = process.cwd();
    const seedsDirSrcBackend = path.resolve(cwd, 'backend/src/database/seeds');
    const seedsDirSrc = path.resolve(cwd, 'src/database/seeds');

    return [seedsDirDist, seedsDirSrcBackend, seedsDirSrc];
  }

  private async loadAndValidateSeedFile(
    filePath: string,
  ): Promise<SeedFileInfo> {
    const filename = path.basename(filePath);

    // Parse version from filename (e.g., tools-v1.2.json -> 1.2)
    const versionMatch = filename.match(
      /^tools-v(\d+(?:\.\d+)?(?:\.\d+)?)\.json$/,
    );
    if (!versionMatch) {
      throw new Error(
        `Invalid filename format. Expected: tools-v<version>.json, got: ${filename}`,
      );
    }

    const fileVersion = parseFloat(versionMatch[1]);
    if (isNaN(fileVersion)) {
      throw new Error(`Invalid version number in filename: ${versionMatch[1]}`);
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw) as SeedFileShape;

    // Validate that file content version matches filename version
    if (typeof data.version !== 'number') {
      throw new Error(
        `File content must have numeric version field, got: ${typeof data.version}`,
      );
    }

    if (data.version !== fileVersion) {
      throw new Error(
        `Version mismatch: filename has v${fileVersion} but content has v${data.version}`,
      );
    }

    if (!Array.isArray(data.tools)) {
      throw new Error(
        `File content must have 'tools' array, got: ${typeof data.tools}`,
      );
    }

    return {
      filePath,
      filename,
      fileVersion,
      data,
    };
  }

  private validateNoDuplicateTools(seedFiles: SeedFileInfo[]): void {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();

    for (const seedFile of seedFiles) {
      for (const tool of seedFile.data.tools) {
        const toolId = tool.id?.toLowerCase?.();
        const toolName = tool.name?.toLowerCase?.();

        if (toolId && seenIds.has(toolId)) {
          throw new Error(
            `Duplicate tool ID '${tool.id}' found in ${seedFile.filename}`,
          );
        }
        if (toolName && seenNames.has(toolName)) {
          throw new Error(
            `Duplicate tool name '${tool.name}' found in ${seedFile.filename}`,
          );
        }

        if (toolId) seenIds.add(toolId);
        if (toolName) seenNames.add(toolName);
      }
    }
  }

  private async processSeedFile(seedFile: SeedFileInfo): Promise<void> {
    this.logger.log(
      `Processing ${seedFile.filename} (v${seedFile.fileVersion})...`,
    );

    const { validTools, errors } = await this.validateTools(
      seedFile.data.tools,
    );

    // Log validation errors for debugging
    if (errors.length > 0) {
      this.logger.error(`Validation errors in ${seedFile.filename}:`);
      errors.forEach((error, index) => {
        this.logger.error(`  ${index + 1}. ${error}`);
      });
      throw new Error(
        `Validation failed for ${seedFile.filename}: ${errors.join(' | ')}`,
      );
    }

    const createdBy = this.getSeedOwnerObjectId();
    const docs = validTools.map((tool) =>
      this.mapSeedToToolDoc(tool, createdBy),
    );

    if (docs.length === 0) {
      this.logger.warn(`No tools found in ${seedFile.filename}`);
      return;
    }

    try {
      const insertedCount = await this.toolModel.insertMany(docs, {
        ordered: false,
      });
      this.logger.log(
        `Inserted ${insertedCount.length} tool(s) from ${seedFile.filename}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to insert tools from ${seedFile.filename}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  private async getCurrentSeedVersion(): Promise<number> {
    const versionDoc = await this.seedVersionModel
      .findOne({ component: 'tools' })
      .lean();
    return versionDoc?.version || 0;
  }

  private async updateSeedVersion(version: number): Promise<void> {
    const toolCount = await this.toolModel.countDocuments();
    await this.seedVersionModel.findOneAndUpdate(
      { component: 'tools' },
      {
        component: 'tools',
        version,
        toolsCount: toolCount,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true },
    );
  }

  private getSeedOwnerObjectId(): Types.ObjectId {
    const fromEnv = process.env.SEED_CREATED_BY;
    if (fromEnv && /^[a-fA-F0-9]{24}$/.test(fromEnv)) {
      return new Types.ObjectId(fromEnv);
    }
    // Fallback to a zero ObjectId (no FK enforcement in Mongo, acceptable for seeding system-owned docs)
    return new Types.ObjectId('000000000000000000000000');
  }
}
