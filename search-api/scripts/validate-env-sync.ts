/**
 * Environment Sync Validator
 *
 * Ensures .env files and env-validator.ts stay in sync
 * Run this in CI and pre-commit hooks to prevent drift
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface EnvVar {
  name: string;
  required: boolean;
}

// Parse .env file and extract variable names
function parseEnvFile(filePath: string): Set<string> {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const vars = new Set<string>();

    content.split('\n').forEach(line => {
      line = line.trim();
      // Skip comments and empty lines
      if (line.startsWith('#') || line === '') return;

      // Extract variable name (before =)
      const match = line.match(/^([A-Z_][A-Z0-9_]*)=/);
      if (match) {
        vars.add(match[1]);
      }
    });

    return vars;
  } catch (error) {
    console.error(`❌ Failed to read ${filePath}:`, error);
    process.exit(1);
  }
}

// Import env-validator.ts and extract required vars
// NOTE: This assumes env-validator.ts exports REQUIRED_ENV_VARS
async function getValidatorVars(): Promise<{ required: Set<string>, all: Set<string> }> {
  try {
    // Dynamically import the validator to get the list
    const validatorModule = await import('../src/utils/env-validator.js');

    // Extract variable names from REQUIRED_ENV_VARS array
    const required = new Set<string>();
    const all = new Set<string>();

    if (validatorModule.REQUIRED_ENV_VARS) {
      validatorModule.REQUIRED_ENV_VARS.forEach((envVar: EnvVar) => {
        all.add(envVar.name);
        if (envVar.required) {
          required.add(envVar.name);
        }
      });
    }

    return { required, all };
  } catch (error) {
    console.error('❌ Failed to import env-validator.ts:', error);
    console.error('Make sure REQUIRED_ENV_VARS is exported from env-validator.ts');
    process.exit(1);
  }
}

async function main() {
  console.log('🔍 Validating environment variable synchronization...\n');

  // Parse .env files
  const exampleVars = parseEnvFile(join(process.cwd(), '.env.example'));
  const ciVars = parseEnvFile(join(process.cwd(), '.env.ci'));

  // Get validator vars
  const { required: requiredVars, all: validatorVars } = await getValidatorVars();

  console.log(`📄 .env.example: ${exampleVars.size} variables`);
  console.log(`📄 .env.ci: ${ciVars.size} variables`);
  console.log(`📄 env-validator.ts: ${validatorVars.size} variables (${requiredVars.size} required)\n`);

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check 1: All required vars from validator must exist in .env.example
  requiredVars.forEach(varName => {
    if (!exampleVars.has(varName)) {
      errors.push(`❌ Required var "${varName}" is in env-validator.ts but missing from .env.example`);
    }
  });

  // Check 2: All required vars from validator must exist in .env.ci
  requiredVars.forEach(varName => {
    if (!ciVars.has(varName)) {
      errors.push(`❌ Required var "${varName}" is in env-validator.ts but missing from .env.ci`);
    }
  });

  // Check 3: Warn about vars in .env.example that aren't in validator
  exampleVars.forEach(varName => {
    if (!validatorVars.has(varName)) {
      warnings.push(`⚠️  Variable "${varName}" exists in .env.example but not in env-validator.ts`);
    }
  });

  // Check 4: Warn about vars in .env.ci that aren't in .env.example
  ciVars.forEach(varName => {
    if (!exampleVars.has(varName)) {
      warnings.push(`⚠️  Variable "${varName}" exists in .env.ci but not in .env.example`);
    }
  });

  // Print results
  if (errors.length > 0) {
    console.error('🚨 SYNC ERRORS FOUND:\n');
    errors.forEach(err => console.error(err));
    console.error('\n💡 Fix: Update the missing files to include these variables\n');
  }

  if (warnings.length > 0) {
    console.warn('⚠️  WARNINGS:\n');
    warnings.forEach(warn => console.warn(warn));
    console.warn('\n💡 Consider adding these to env-validator.ts or removing from .env files\n');
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All environment files are in sync!\n');
    process.exit(0);
  }

  if (errors.length > 0) {
    process.exit(1);
  }

  // Exit 0 if only warnings
  process.exit(0);
}

main();
