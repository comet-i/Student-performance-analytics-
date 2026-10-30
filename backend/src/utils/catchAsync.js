export const catchAsync = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// catchAsync + JSON envelope: the handler just returns the data.
export const respond = (fn, status = 200) =>
  catchAsync(async (req, res) => res.status(status).json({ data: await fn(req) }));
