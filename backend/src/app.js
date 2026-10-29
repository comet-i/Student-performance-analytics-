import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';

const app = express();

app.set('trust proxy', 1); // Render terminates TLS: needed for correct client IPs in rate limiting
app.use(helmet(), cors({ origin: env.FRONTEND_URL }), express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' })); // Render health check
app.use('/api', apiLimiter);
app.use(routes);
app.use(notFound, errorHandler);

export default app;
