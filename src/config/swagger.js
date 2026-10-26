const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'HireIQ API',
            version: '2.0.0',
            description: `
## HireIQ — AI-Powered Recruitment Platform

Built with **Google Gemini API**, **MongoDB Atlas Vector Search**, **Pinecone**, and a **Multi-Agent Architecture**.

### Key Features
- 🤖 **Multi-Agent Pipeline** — Orchestrator coordinates ResumeAnalyst, JobMatcher, and InterviewPlanner agents
- 🔍 **Semantic Search** — Vector embeddings for intelligent candidate-job matching
- 📄 **AI Resume Parsing** — Structured extraction from PDF resumes using LLMs
- 🎯 **Smart Screening** — Auto-discovers top candidates via vector search, deep-analyses them in parallel
- 💬 **Targeted Interview Questions** — Generated based on specific skill gaps, not generic templates

### Authentication
All endpoints except \`/auth/register\` and \`/auth/login\` require a Bearer token.
            `,
            contact: {
                name: 'HireIQ',
            }
        },
        servers: [
            { url: process.env.API_BASE_URL || 'http://localhost:3000', description: 'API Server' }
        ],
        components: {
            securitySchemes: {
                BearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            }
        },
        security: [{ BearerAuth: [] }],
        tags: [
            { name: 'Auth', description: 'Register and login' },
            { name: 'Jobs', description: 'Job posting and management' },
            { name: 'Resume', description: 'Resume upload and analysis' },
            { name: 'Search', description: 'Semantic search — find jobs or candidates' },
            { name: 'Multi-Agent', description: 'AI agent pipeline — deep candidate screening' },
            { name: 'Agent (Legacy)', description: 'Original single-agent screener' }
        ],
        paths: {
            '/auth/register': {
                post: {
                    tags: ['Auth'], summary: 'Register a new user',
                    security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['name', 'email', 'password'], properties: { name: { type: 'string', example: 'Rohan Parshurami' }, email: { type: 'string', example: 'rohan@example.com' }, password: { type: 'string', example: 'password123' } } } } } },
                    responses: { 200: { description: 'User registered successfully' } }
                }
            },
            '/auth/login': {
                post: {
                    tags: ['Auth'], summary: 'Login and get JWT token',
                    security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', example: 'rohan@example.com' }, password: { type: 'string', example: 'password123' } } } } } },
                    responses: { 200: { description: 'Returns JWT token' } }
                }
            },
            '/jobs/create': {
                post: {
                    tags: ['Jobs'], summary: 'Create a job posting',
                    description: 'Creates job in MongoDB and automatically stores its vector embedding in Pinecone for semantic search.',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['title', 'description', 'company'], properties: { title: { type: 'string', example: 'Senior Node.js Engineer' }, description: { type: 'string', example: 'Looking for a backend engineer with 5+ years experience...' }, company: { type: 'string', example: 'Razorpay' }, location: { type: 'string', example: 'Bangalore' }, salary: { type: 'number', example: 2500000 }, skillset: { type: 'array', items: { type: 'string' }, example: ['Node.js', 'MongoDB', 'AWS', 'Redis'] } } } } } },
                    responses: { 200: { description: 'Job created + embedding stored in Pinecone' } }
                }
            },
            '/jobs/getAllJobs': {
                post: { tags: ['Jobs'], summary: 'Get all job postings', responses: { 200: { description: 'List of jobs' } } }
            },
            '/jobs/getJob': {
                post: {
                    tags: ['Jobs'], summary: 'Get a single job by ID',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { jobId: { type: 'string', example: 'JOB-1791383498057' } } } } } },
                    responses: { 200: { description: 'Job details' } }
                }
            },
            '/resume/upload': {
                post: {
                    tags: ['Resume'], summary: 'Upload a resume PDF',
                    description: 'Uploads PDF to S3, parses it with Gemini AI, stores parsed data in MongoDB, and stores vector embedding in Pinecone.',
                    requestBody: { required: true, content: { 'multipart/form-data': { schema: { type: 'object', required: ['resume', 'jobId'], properties: { resume: { type: 'string', format: 'binary' }, jobId: { type: 'string' } } } } } },
                    responses: { 200: { description: 'Resume parsed and embedding stored' } }
                }
            },
            '/resume/match': {
                post: {
                    tags: ['Resume'], summary: 'Match a resume against a job (simple)',
                    description: 'Single LLM call to get match score. Use /agent/analyse-candidate for deep multi-agent analysis.',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resumeId: { type: 'string' }, jobId: { type: 'string' } } } } } },
                    responses: { 200: { description: 'Match score and skill analysis' } }
                }
            },
            '/resume/feedback': {
                post: {
                    tags: ['Resume'], summary: 'Get AI feedback on a resume',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { resumeId: { type: 'string' } } } } } },
                    responses: { 200: { description: 'Detailed resume improvement suggestions' } }
                }
            },
            '/search/candidates': {
                post: {
                    tags: ['Search'], summary: 'Find top candidates for a job (semantic search)',
                    description: 'Converts job description to vector, searches Pinecone for similar resume vectors. Returns candidates ranked by semantic similarity.',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['jobId'], properties: { jobId: { type: 'string', example: 'JOB-1791383498057' }, topK: { type: 'number', example: 10 } } } } } },
                    responses: { 200: { description: 'Ranked list of matching candidates with similarity scores' } }
                }
            },
            '/search/jobs': {
                post: {
                    tags: ['Search'], summary: 'Find matching jobs for a candidate (semantic search)',
                    description: 'Converts resume to vector, searches Pinecone for similar job vectors. Returns jobs ranked by semantic similarity.',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['resumeId'], properties: { resumeId: { type: 'string' } } } } } },
                    responses: { 200: { description: 'Ranked list of matching jobs' } }
                }
            },
            '/agent/analyse-candidate': {
                post: {
                    tags: ['Multi-Agent'], summary: '🤖 Deep analysis — single candidate vs job',
                    description: `**Multi-Agent Pipeline**

Runs 3 specialist AI agents sequentially, coordinated by MultiAgentService:

1. **ResumeAnalystAgent** — Extracts structured profile from resume text
2. **JobMatcherAgent** — Scores fit, identifies matched/missing skills
3. **InterviewPlannerAgent** — Generates targeted questions based on skill gaps

Returns full analysis including \`agentTrace\` with per-agent token usage.

> **Tip:** Get the \`resumeId\` from the response of \`/agent/screen-all\` or \`/resume/myResumes\`.`,
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['jobId', 'resumeId'], properties: { jobId: { type: 'string', example: 'JOB-1791383498057' }, resumeId: { type: 'string', example: 'RES-123456789' } } } } } },
                    responses: { 200: { description: 'Full candidate analysis with match report, interview plan and agent trace' } }
                }
            },
            '/agent/screen-all': {
                post: {
                    tags: ['Multi-Agent'], summary: '🚀 Bulk screening — auto-discover and analyse all top candidates',
                    description: `**Bulk Multi-Agent Screening**

The most powerful endpoint. Fully automated end-to-end:

1. **Semantic Search** — Finds top N matching candidates from the resume pool
2. **Parallel Pipeline** — Runs the full 3-agent pipeline on ALL candidates simultaneously (Promise.all)
3. **Ranked Shortlist** — Returns candidates sorted by match score, each with full analysis and targeted interview questions

Recruiter provides only \`jobId\`. Everything else is automated.`,
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['jobId'], properties: { jobId: { type: 'string', example: 'JOB-1791383498057' }, topK: { type: 'number', example: 5, description: 'Number of candidates to screen (max 10)' } } } } } },
                    responses: { 200: { description: 'Ranked shortlist of candidates with full analysis, interview plans and token usage' } }
                }
            },
            '/agent/screen': {
                post: {
                    tags: ['Agent (Legacy)'], summary: 'Original single-agent screener (legacy)',
                    description: 'Original agentic screener with tool calling loop. Superseded by /agent/screen-all.',
                    requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', properties: { jobId: { type: 'string' } } } } } },
                    responses: { 200: { description: 'Screening results' } }
                }
            }
        }
    },
    apis: []
};

module.exports = swaggerJsdoc(options);