const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const fileUploadMiddleware = require('../middlewares/fileUploadMiddleware');
const jobController = require('../controllers/jobController');
const resumeController = require('../controllers/resumeController');
const searchController = require('../controllers/searchController');
const agentController = require('../controllers/agentController');
const multiAgentController = require('../controllers/multiAgentController');

function registerRoutes(app) {
    // Auth routes (public — no token required)
    app.post('/auth/register', authController.register);
    app.post('/auth/login', authController.login);

    // All routes below require JWT auth
    app.use(authMiddleware.protect);
    app.use(fileUploadMiddleware.globalFileMiddleware);

    app.get('/auth/profile', authController.getProfile);

    // Job routes
    app.post('/jobs/create', jobController.createJob);
    app.post('/jobs/getAllJobs', jobController.getJobs);
    app.post('/jobs/getJob', jobController.getJob);
    app.post('/jobs/updateJob', jobController.updateJob);
    app.post('/jobs/deleteJob', jobController.deleteJob);
    app.post('/jobs/interviewQuestions', jobController.generateInterviewQuestions);

    // Resume routes
    app.post('/resume/upload', resumeController.uploadResume);
    app.post('/resume/getUrl', resumeController.getResumeUrl);
    app.post('/resume/myResumes', resumeController.getMyResumes);
    app.post('/resume/match', resumeController.matchResume);
    app.post('/resume/feedback', resumeController.getResumeFeedback);

    // Semantic search routes
    app.post('/search/jobs', searchController.findJobsForResume);
    app.post('/search/candidates', searchController.findCandidatesForJob);

    // Legacy single-agent screener
    app.post('/agent/screen', agentController.screenCandidates);

    // Multi-agent pipeline routes
    app.post('/agent/analyse-candidate', multiAgentController.runPipeline);   // single candidate deep analysis
    app.post('/agent/screen-all', multiAgentController.screenAll);            // bulk auto-screening
}

module.exports = { registerRoutes };
