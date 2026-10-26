require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const routes = require('./routes/routes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const app = express();

// ─── SECURITY & LOGGING ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// ─── RATE LIMITING ────────────────────────────────────────────────────────────

// General API limit: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please try again in 15 minutes.' }
});

// AI endpoints limit: 20 requests per 15 minutes per IP (Gemini API cost protection)
const aiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'AI rate limit exceeded. Maximum 20 AI requests per 15 minutes.' }
});

app.use(generalLimiter);
app.use('/agent', aiLimiter);
app.use('/resume/match', aiLimiter);
app.use('/resume/feedback', aiLimiter);
app.use('/jobs/interviewQuestions', aiLimiter);

// ─── SWAGGER DOCS ─────────────────────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'HireIQ API',
    customCss: '.swagger-ui .topbar { background-color: #1a1a2e; } .swagger-ui .topbar-wrapper img { content: none; } .swagger-ui .topbar-wrapper::before { content: "🤖 HireIQ API"; color: white; font-size: 20px; font-weight: bold; padding: 10px; }'
}));

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
    status: 'ok',
    service: 'HireIQ API',
    version: '2.0.0',
    features: ['multi-agent-pipeline', 'semantic-search', 'rag', 'embeddings'],
    timestamp: new Date().toISOString()
}));

routes.registerRoutes(app);

module.exports = app;
