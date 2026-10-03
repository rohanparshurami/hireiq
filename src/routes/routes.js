const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');
const jobController = require('../controllers/jobController');

function registerRoutes(app) {
  // HEALTH
  app.get('/health', function(req, res) {
    return res.json({ status: 'ok' });
  });

  // auth routes
  app.post('/auth/register', authController.register);
  app.post('/auth/login', authController.login);

  app.use(authMiddleware.protect);
  app.get('/auth/profile', authController.getProfile);

  // Job routes
  app.post('/jobs/create', jobController.createJob);
  app.post('/jobs/getAllJobs', jobController.getJobs);
  app.post('/jobs/getJob', jobController.getJob);
  app.post('/jobs/updateJob', jobController.updateJob);
  app.post('/jobs/deleteJob', jobController.deleteJob);
}

module.exports = { registerRoutes: registerRoutes };