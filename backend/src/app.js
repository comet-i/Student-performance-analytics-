import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import routes from './routes/index.js';

const app = express();

app.set('trust proxy', 1); // Render terminates TLS: needed for correct client IPs in rate limiting

// Separate the middleware for proper sequential execution
app.use(helmet());
app.use(cors({
    origin: [env.FRONTEND_URL, 'http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
}));
   // origin: env.FRONTEND_URL || 'http://localhost:3000',
   // origin: "*",
   // methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   // credentials: true,
   // allowedHeaders: ['Content-Type', 'Authorization']

app.use(express.json({ limit: '100kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' })); // Render health check

// Routes and error handling (Crucial for the server to actually work)
app.use('/api', apiLimiter);
app.use(routes); 
app.use(notFound, errorHandler);

export default app;
