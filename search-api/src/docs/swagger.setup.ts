/**
 * Swagger/OpenAPI Setup
 *
 * Async loading and configuration of API documentation
 */

import { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchLogger } from '#config/logger.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Swagger UI configuration options
 */
const swaggerOptions = {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Search API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
};

/**
 * Setup API documentation endpoints
 * @param app - Express application instance
 */
export async function setupSwaggerDocs(app: Express): Promise<void> {
  try {
    const openapiPath = path.join(__dirname, '../../openapi.yaml');
    const swaggerDocument = YAML.load(openapiPath);

    searchLogger.info('✅ OpenAPI specification loaded', {
      service: 'search-api',
      specPath: openapiPath,
    });

    // Serve Swagger UI at /api-docs
    app.use('/api-docs', swaggerUi.serve);
    app.get('/api-docs', swaggerUi.setup(swaggerDocument, swaggerOptions));

    // Serve raw OpenAPI spec at /api-docs/openapi.json
    app.get('/api-docs/openapi.json', (req, res) => {
      res.json(swaggerDocument);
    });

    // Serve raw OpenAPI spec at /api-docs/openapi.yaml
    app.get('/api-docs/openapi.yaml', (req, res) => {
      res.type('text/yaml');
      res.send(YAML.stringify(swaggerDocument, 10, 2));
    });

    searchLogger.info('✅ API documentation endpoints configured', {
      service: 'search-api',
      swaggerUI: '/api-docs',
      openAPIJson: '/api-docs/openapi.json',
      openAPIYaml: '/api-docs/openapi.yaml',
    });
  } catch (error) {
    searchLogger.error('⚠️  Failed to load OpenAPI specification', error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
    });
  }
}
