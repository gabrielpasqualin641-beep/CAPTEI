"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
require("./lib/queue"); // Inicializa CampanhaWorker
require("./lib/nationalQueue"); // Inicializa Worker de varredura nacional
require("./workers/workflow.worker"); // Inicializa WorkflowWorker
dotenv_1.default.config();
const auth_1 = require("./routes/auth");
const places_1 = require("./routes/places");
const leads_1 = require("./routes/leads");
const templates_1 = require("./routes/templates");
const instances_1 = require("./routes/instances");
const campaigns_1 = require("./routes/campaigns");
const webhook_1 = require("./routes/webhook");
const enrichment_1 = __importDefault(require("./routes/enrichment"));
const workflow_routes_1 = require("./routes/workflow.routes");
const app = (0, express_1.default)();
// Helmet para blindagem de cabeçalhos HTTP (mitiga XSS, Clickjacking, MIME type sniffing, etc.)
app.use((0, helmet_1.default)());
// Limitação de taxa para mitigar brute force e ataques DoS (100 requisições por 15 minutos por IP)
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muitas requisições vindas deste IP. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.authRoutes);
app.use('/api/places', places_1.placesRoutes);
app.use('/api/leads', leads_1.leadsRoutes);
const leadsScrapePlatform_1 = require("./routes/leadsScrapePlatform");
app.use('/api/leads', leadsScrapePlatform_1.scrapePlatformRoutes);
app.use('/api/templates', templates_1.templatesRoutes);
app.use('/api/instances', instances_1.instancesRoutes);
app.use('/api/campaigns', campaigns_1.campaignsRoutes);
app.use('/api/webhook', webhook_1.webhookRoutes);
app.use('/api/enrichment', enrichment_1.default);
app.use('/api/workflows', workflow_routes_1.workflowRoutes);
const pagamentos_1 = require("./routes/pagamentos");
app.use('/api/pagamentos', pagamentos_1.pagamentosRoutes);
const PORT = Number(process.env.PORT) || 3000;
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Validação de segurança: JWT_SECRET é obrigatório
if (!process.env.JWT_SECRET) {
    console.error('⛔ FATAL: JWT_SECRET não definido no arquivo .env! O servidor não pode iniciar sem ele.');
    process.exit(1);
}
const cron_1 = require("./config/cron");
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    (0, cron_1.initCronJobs)();
});
//# sourceMappingURL=index.js.map