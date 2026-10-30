import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

// Postgres / PostgREST error codes -> HTTP status
const DB_STATUS = {
  '23505': 409, // unique violation
  '23503': 409, // foreign key violation (e.g. another student's enrollment)
  '23502': 400, // not null
  '23514': 400, // check constraint
  '22P02': 400, // invalid input syntax (e.g. bad uuid)
  '22007': 400, // invalid date
  '42501': 403, // RLS / privilege denied
  'PGRST116': 404, // no rows for .single()
};

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.path}`));

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  const isZod = err instanceof ZodError;
  const status = isZod ? 400 : (err.statusCode ?? DB_STATUS[err.code] ?? 500);
  const expose = status < 500 || env.NODE_ENV !== 'production';

  if (status >= 500) console.error(err);
  res.status(status).json({
    error: {
      message: isZod ? 'Validation failed' : expose ? err.message : 'Internal server error',
      details: isZod ? err.flatten().fieldErrors : err.details,
    },
  });
};
