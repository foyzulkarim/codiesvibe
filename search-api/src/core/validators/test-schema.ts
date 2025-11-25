/**
 * Quick validation test for toolsSchema
 * Run with: npx ts-node src/core/validators/test-schema.ts
 */

import { toolsSchema } from '../../domains/tools/tools.schema';
import { validateSchema } from './schema.validator';

// Test schema validation
const result = validateSchema(toolsSchema);

if (result.valid) {
  process.stdout.write('✅ Schema validation PASSED\n');
  if (result.warnings && result.warnings.length > 0) {
    process.stdout.write('\n⚠️  Warnings:\n');
    result.warnings.forEach((warning) => {
      process.stdout.write(`  - ${warning}\n`);
    });
  }
} else {
  process.stdout.write('❌ Schema validation FAILED\n\n');
  process.stdout.write('Errors:\n');
  result.errors.forEach((error) => {
    process.stdout.write(`  - ${error}\n`);
  });
  process.exit(1);
}

// Print schema summary
process.stdout.write('\n📊 Schema Summary:\n');
process.stdout.write(`  Name: ${toolsSchema.name}\n`);
process.stdout.write(`  Version: ${toolsSchema.version}\n`);
process.stdout.write(`  Categories: ${toolsSchema.vocabularies.categories.length}\n`);
process.stdout.write(`  Functionality: ${toolsSchema.vocabularies.functionality.length}\n`);
process.stdout.write(`  User Types: ${toolsSchema.vocabularies.userTypes.length}\n`);
process.stdout.write(`  Intent Fields: ${toolsSchema.intentFields.length}\n`);
process.stdout.write(`  Vector Collections: ${toolsSchema.vectorCollections.length}\n`);
process.stdout.write(`  Enabled Collections: ${toolsSchema.vectorCollections.filter(c => c.enabled !== false).length}\n`);

process.exit(0);
