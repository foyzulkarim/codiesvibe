/**
 * Compression Configuration
 *
 * Response compression settings for optimal performance
 * Typically reduces response size by 70-90%
 */

import compression from 'compression';
import { Request, Response } from 'express';

export const compressionOptions: compression.CompressionOptions = {
  // Only compress responses above 1KB
  threshold: 1024,

  // Compression level (0-9, where 6 is default and balances speed/compression)
  level: 6,

  // Filter function to determine if response should be compressed
  filter: (req: Request, res: Response) => {
    // Don't compress if client doesn't support it
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter to decide based on content-type
    return compression.filter(req, res);
  }
};
