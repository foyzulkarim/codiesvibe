/**
 * Search Routes
 *
 * Routes for semantic search endpoints
 */

import { Router } from 'express';
import { searchHandler } from '../controllers/search.controller.js';
import { searchLimiter } from '../middleware/rate-limiters.js';
import { searchTimeout } from '../middleware/timeout.middleware.js';
import { validateJoi } from '../middleware/validate-joi.middleware.js';
import { searchQuerySchema } from '../validation/search.validation.js';

const router = Router();

/**
 * POST /api/search
 * Main search endpoint with rate limiting, timeout, and validation
 */
router.post(
  '/search',
  searchLimiter,
  searchTimeout,
  validateJoi(searchQuerySchema),
  searchHandler
);

export default router;
