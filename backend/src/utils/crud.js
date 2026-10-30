import { Router } from 'express';
import { validate } from '../middleware/validate.middleware.js';
import { idParam } from '../validators/schemas.js';
import { ApiError } from './ApiError.js';
import { respond } from './catchAsync.js';

const found = (row) => {
  if (!row) throw new ApiError(404, 'Record not found');
  return row;
};

// Owner-scoped CRUD for any table with id + user_id. RLS decides visibility;
// user_id always comes from the verified JWT, never from the request body.
export const crud = (table, { filters = [], order = ['created_at', false], select = '*' } = {}) => ({
  list: respond(async ({ db, query }) => {
    let q = db.from(table).select(select).order(order[0], { ascending: order[1] }).limit(200);
    for (const f of filters) if (query[f] !== undefined) q = q.eq(f, query[f]);
    return (await q.throwOnError()).data;
  }),
  create: respond(
    async ({ db, user, body }) =>
      (await db.from(table).insert({ ...body, user_id: user.id }).select(select).single().throwOnError()).data,
    201,
  ),
  update: respond(async ({ db, params, body }) =>
    found((await db.from(table).update(body).eq('id', params.id).select(select).maybeSingle().throwOnError()).data),
  ),
  remove: respond(async ({ db, params }) =>
    found((await db.from(table).delete().eq('id', params.id).select('id').maybeSingle().throwOnError()).data),
  ),
});

export const crudRouter = (ctrl, { create, patch }) =>
  Router()
    .get('/', ctrl.list)
    .post('/', validate({ body: create }), ctrl.create)
    .patch('/:id', validate({ params: idParam, body: patch }), ctrl.update)
    .delete('/:id', validate({ params: idParam }), ctrl.remove);
