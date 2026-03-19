import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes/index.js';
import { prisma } from './lib/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const PORT = Number(process.env.PORT ?? 3001);
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'virtual-it-company-api',
    time: new Date().toISOString(),
  });
});

app.use('/api', apiRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
});

async function main() {
  await prisma.$connect();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`API listening on http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', e);
  process.exit(1);
});

