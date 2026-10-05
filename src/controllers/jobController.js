const jobService = require('../services/jobService');

async function createJob(req, res) {
  try {
    const job = await jobService.createJob(req.userId, req.body);
    return res.json({ success: true, message: 'Job created successfully', data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getJobs(req, res) {
  try {
    const jobs = await jobService.getJobs();
    return res.json({ success: true, data: jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getJob(req, res) {
  try {
    const job = await jobService.getJob(req.body.id);
    return res.json({ success: true, data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateJob(req, res) {
  try {
    const job = await jobService.updateJob(req.body.id, req.body);
    return res.json({ success: true, message: 'Job updated successfully', data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteJob(req, res) {
  try {
    await jobService.deleteJob(req.body.id);
    return res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { createJob: createJob, getJobs: getJobs, getJob: getJob, updateJob: updateJob, deleteJob: deleteJob };