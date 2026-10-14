import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db.js';
import apiRoutes from './routes/api.routes.js';
import { Region, Runbook } from './models/index.js';
import { notFound, errorHandler, asyncHandler } from './middleware/error.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', asyncHandler(async (_req, res) => {
  const regions = await Region.find().sort({ role: 1 }).lean();
  res.render('dashboard', { title: 'PaySecure DR Command Center', regions });
}));
app.get('/runbooks', asyncHandler(async (_req, res) => {
  res.render('react', { title: 'Runbook Explorer', count: await Runbook.countDocuments() });
}));
app.get('/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));
app.use('/api', apiRoutes);
app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 4000;
connectDB(process.env.MONGO_URI)
  .then(() => app.listen(port, () => console.log(`[server] http://localhost:${port}`)))
  .catch((e) => { console.error('DB connection failed:', e.message); process.exit(1); });
