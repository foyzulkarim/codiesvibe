/**
 * Search Controller
 *
 * Handles search endpoint logic with AI-powered semantic search
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SearchRequest } from '#middleware/correlation.middleware.js';
import { searchLogger } from '#config/logger.js';
import { metricsService } from '#services/infrastructure/metrics.service.js';
import { searchWithAgenticPipeline } from '#graphs/agentic-search.graph.js';
import { sanitizeQuery } from '#validation/search.validation.js';
import { searchErrorResponse } from '#utils/error-responses.js';
import { debugLog } from '#utils/debug.js';

/**
 * POST /api/search
 * Enhanced search endpoint with comprehensive security and AI-powered search
 */
export async function searchHandler(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const searchReq = req as SearchRequest;
  const clientId = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('User-Agent') || 'unknown';
  const correlationId = searchReq.correlationId || uuidv4();

  try {
    // Body has already been validated by Joi middleware
    const { query, limit = 10, debug = false } = req.body;

    // Sanitize the query
    const sanitizedQuery = sanitizeQuery(query);

    // Log search request using enhanced logger
    searchLogger.logSearchRequest(correlationId, {
      service: 'search-api',
      ip: clientId,
      userAgent,
      query: sanitizedQuery,
      queryLength: sanitizedQuery.length,
      limit,
      debug,
      timestamp: new Date().toISOString()
    });

    searchLogger.info('Starting search request', {
      service: 'search-api',
      correlationId,
      clientId,
      query: sanitizedQuery,
      limit,
      debug
    });

    // Execute agentic search orchestration with 3-node LLM-first pipeline
    const searchResult = await searchWithAgenticPipeline(sanitizedQuery, {
      enableCheckpoints: false,
      metadata: { debug, client: clientId }
    });

    debugLog('Search result from agentic pipeline', searchResult);

    const executionTime = Date.now() - startTime;

    const response = {
      query: sanitizedQuery, // Use sanitized query in response
      originalQuery: query, // Include original for debugging if needed
      executionTime: `${executionTime}ms`,
      phase: "3-Node LLM-First Pipeline",
      ...searchResult
    };

    // Track search query metrics
    metricsService.trackSearchQuery(executionTime / 1000, 'success');

    searchLogger.info('Search completed successfully', {
      service: 'search-api',
      correlationId,
      clientId,
      executionTimeMs: executionTime,
      resultsCount: response.candidates?.length || 0,
      totalResults: response.candidates?.length || 0
    });

    // Log successful request using enhanced logger
    searchLogger.logSearchSuccess(correlationId, {
      service: 'search-api',
      ip: clientId,
      userAgent,
      query: sanitizedQuery,
      queryLength: sanitizedQuery.length,
      resultCount: response.candidates?.length || 0,
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    res.json(response);
  } catch (error) {
    const executionTime = Date.now() - startTime;

    // Track search query error metrics
    metricsService.trackSearchQuery(executionTime / 1000, 'error');
    metricsService.trackError('search_error', 'high');

    // Enhanced error logging using search logger
    searchLogger.logSearchError(correlationId, error instanceof Error ? error : new Error('Unknown error'), {
      service: 'search-api',
      ip: clientId,
      userAgent,
      query: req.body?.query || 'unknown',
      executionTimeMs: executionTime,
      timestamp: new Date().toISOString()
    });

    searchLogger.error(
      `Search error for client ${clientId}`,
      error instanceof Error ? error : new Error('Unknown error'),
      {
        service: 'search-api',
        clientId,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString()
      }
    );

    res.status(500).json(searchErrorResponse(
      error instanceof Error ? error : new Error('Unknown error'),
      executionTime
    ));
  }
}
