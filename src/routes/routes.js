const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const fileUploadMiddleware = require('../middlewares/fileUploadMiddleware');
const jobController = require('../controllers/jobController');
const resumeController = require('../controllers/resumeController');
const searchController = require('../controllers/searchController');
const agentController = require('../controllers/agentController');

function registerRoutes(app) {
  // Auth routes (public)
  app.post('/auth/register', authController.register);
  app.post('/auth/login', authController.login);

  // Middleware
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

  // Search routes (semantic search)
  app.post('/search/jobs', searchController.findJobsForResume);
  app.post('/search/candidates', searchController.findCandidatesForJob);

  // Agent routes
  app.post('/agent/screen', agentController.screenCandidates);
}

module.exports = { registerRoutes: registerRoutes };