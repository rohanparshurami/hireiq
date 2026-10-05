const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const fileUploadMiddleware = require('../middlewares/fileUploadMiddleware');
const jobController = require('../controllers/jobController');
const resumeController = require('../controllers/resumeController');

function registerRoutes(app) {
  // HEALTH
  app.get('/health', function(req, res) {
    return res.json({ status: 'ok' });
  });

  // Auth routes (public)
  app.post('/auth/register', authController.register);
  app.post('/auth/login', authController.login);

  // Protected routes
  app.use(authMiddleware.protect);
  app.use(fileUploadMiddleware.globalFileMiddleware);

  app.get('/auth/profile', authController.getProfile);

  // Job routes
  app.post('/jobs/create', jobController.createJob);
  app.post('/jobs/getAllJobs', jobController.getJobs);
  app.post('/jobs/getJob', jobController.getJob);
  app.post('/jobs/updateJob', jobController.updateJob);
  app.post('/jobs/deleteJob', jobController.deleteJob);

  // Resume routes
  app.post('/resume/upload', resumeController.uploadResume);
  app.post('/resume/getUrl', resumeController.getResumeUrl);
  app.post('/resume/myResumes', resumeController.getMyResumes);
}

module.exports = { registerRoutes: registerRoutes };