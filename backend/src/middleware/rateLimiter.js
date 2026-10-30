import rateLimit from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

const limiter = (options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, 'Too many requests, please slow down')),
    ...options,
  });

export const apiLimiter = limiter({ windowMs: 15 * 60_000, limit: 600 }); // per IP

// Analytics calls hit the ML engine: limit per user (runs after requireAuth).
export const predictionLimiter = limiter({ windowMs: 60_000, limit: 10, keyGenerator: (req) => req.user.id });
