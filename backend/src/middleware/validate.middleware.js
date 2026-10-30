// validate({ body, params, query }): parses each part with its Zod schema and replaces it with the
// cleaned result (unknown keys stripped, defaults applied). ZodError is turned into a 400 by error.middleware.
export const validate = (schemas) => (req, _res, next) => {
  for (const [part, schema] of Object.entries(schemas)) req[part] = schema.parse(req[part]);
  next();
};
