export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export function notFound(req, res) {
  res.status(404).json({ ok: false, error: `Route ${req.originalUrl} not found` });
}

export function errorHandler(err, req, res, _next) {
  const status = err.status || (err.code === 11000 ? 409 : err.name === 'ValidationError' ? 400 : 500);
  console.error('[error]', err.message);
  res.status(status).json({ ok: false, error: err.message });
}
