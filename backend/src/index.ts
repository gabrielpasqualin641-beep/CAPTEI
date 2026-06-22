import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import './lib/queue';          // Inicializa CampanhaWorker
import './lib/nationalQueue';  // Inicializa Worker de varredura nacional
import './workers/workflow.worker'; // Inicializa WorkflowWorker


dotenv.config();

import { authRoutes } from './routes/auth';
import { placesRoutes } from './routes/places';
import { leadsRoutes } from './routes/leads';
import { templatesRoutes } from './routes/templates';
import { instancesRoutes } from './routes/instances';
import { campaignsRoutes } from './routes/campaigns';
import { webhookRoutes } from './routes/webhook';
import { scrapeRoutes } from './routes/scrape';
import enrichmentRoutes from './routes/enrichment';
import { workflowRoutes } from './routes/workflow.routes';

const app = express();

// Helmet para blindagem de cabeçalhos HTTP (mitiga XSS, Clickjacking, MIME type sniffing, etc.)
app.use(helmet());

// Limitação de taxa para mitigar brute force e ataques DoS (100 requisições por 15 minutos por IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições vindas deste IP. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/leads', leadsRoutes);
import { scrapePlatformRoutes } from './routes/leadsScrapePlatform';
app.use('/api/leads', scrapePlatformRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/instances', instancesRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/enrichment', enrichmentRoutes);
app.use('/api/workflows', workflowRoutes);
import { pagamentosRoutes } from './routes/pagamentos';
app.use('/api/pagamentos', pagamentosRoutes);

const PORT = Number(process.env.PORT) || 3000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Validação de segurança: JWT_SECRET é obrigatório
if (!process.env.JWT_SECRET) {
  console.error('⛔ FATAL: JWT_SECRET não definido no arquivo .env! O servidor não pode iniciar sem ele.');
  process.exit(1);
}

import { initCronJobs } from './config/cron';

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
  initCronJobs();
});