const jobService = require('../services/jobService');

async function createJob(req, res) {
  try {
    const result = await jobService.createJob(req.userId, req.body);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function getJobs(req, res) {
  try {
    const result = await jobService.getJobs();
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function getJob(req, res) {
  try {
    const result = await jobService.getJob(req.body.id);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function updateJob(req, res) {
  try {
    const result = await jobService.updateJob(req.body.id, req.body);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function deleteJob(req, res) {
  try {
    const result = await jobService.deleteJob(req.body.id);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

module.exports = { createJob: createJob, getJobs: getJobs, getJob: getJob, updateJob: updateJob, deleteJob: deleteJob };