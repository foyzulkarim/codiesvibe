/**
 * Jest Environment Setup
 *
 * This file runs BEFORE the test framework loads (via setupFiles).
 * It configures dotenv to load .env.test instead of .env.
 *
 * By setting DOTENV_CONFIG_PATH, any module that imports 'dotenv/config'
 * will load .env.test instead of the default .env file.
 */

import { resolve } from 'path';

// Tell dotenv to load .env.test instead of .env
// This affects any `import 'dotenv/config'` statements in the codebase
process.env.DOTENV_CONFIG_PATH = resolve(__dirname, '../../.env.test');

// Now load dotenv with the configured path
import 'dotenv/config';

// Clear CORS vars so individual tests can control them
// Tests that need CORS validation should set these explicitly
delete process.env.ALLOWED_ORIGINS;
delete process.env.CORS_ORIGINS;

// MongoDB Memory Server settings
process.env.MONGOMS_DOWNLOAD_MIRROR = 'https://fastdl.mongodb.org';
process.env.MONGOMS_VERSION = '6.0.15';
