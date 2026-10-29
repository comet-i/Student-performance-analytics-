import { createUserClient } from '../config/supabase.js';
import { ApiError } from '../utils/ApiError.js';
import { catchAsync } from '../utils/catchAsync.js';

// Verifies the Supabase JWT sent by the frontend and attaches:
//   req.user - the authenticated user, req.db - a Supabase client acting as that user (RLS enforced)
export const requireAuth = catchAsync(async (req, _res, next) => {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new ApiError(401, 'Missing bearer token');

  const db = createUserClient(token);
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, 'Invalid or expired token');

  Object.assign(req, { user: data.user, db });
  next();
});
