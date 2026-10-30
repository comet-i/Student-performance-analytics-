import app from './src/app.js';
import { env } from './src/config/env.js';

const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`API listening on :${env.PORT}`);
  // Free tier: when this service wakes, wake the analytics engine too (fire-and-forget).
  fetch(`${env.ML_ENGINE_URL}/health`).catch(() => {});
});

// Render sends SIGTERM on deploy/restart: finish in-flight requests first.
process.on('SIGTERM', () => server.close(() => process.exit(0)));
