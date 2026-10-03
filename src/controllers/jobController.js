const Job = require('../models/Jobs');

async function createJob(req, res) {
  try {
    const job = new Job();
    job.jobCode = 'JOB-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    job.title = req.body.title;
    job.description = req.body.description;
    job.company = req.body.company;
    job.location = req.body.location;
    job.salary = req.body.salary;
    job.skillset = req.body.skillset;
    job.status = 'open';
    job.postedBy = req.userId;
    await job.save();
    return res.json({ success: true, message: 'Job created successfully', data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getJobs(req, res) {
  try {
    const jobs = await Job.find().populate('postedBy', 'name email');
    return res.json({ success: true, data: jobs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getJob(req, res) {
  try {
    const job = await Job.find({jobId : req.body.id});
    if (!job) {
      return res.json({ success: false, message: 'Job not found' });
    }
    return res.json({ success: true, data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateJob(req, res) {
  try {
    const job = await Job.findOne({jobId : req.body.id});
    if (!job) {
      return res.json({ success: false, message: 'Job not found' });
    }
    job.title = req.body.title || job.title;
    job.description = req.body.description || job.description;
    job.company = req.body.company || job.company;
    job.location = req.body.location || job.location;
    job.salary = req.body.salary || job.salary;
    job.skillset = req.body.skillset || job.skillset;
    job.status = req.body.status || job.status;
    await job.save();
    return res.json({ success: true, message: 'Job updated successfully', data: job });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteJob(req, res) {
  try {
    const job = await Job.findOneAndDelete({jobId : req.body.id});
    if (!job) {
      return res.json({ success: false, message: 'Job not found' });
    }
    return res.json({ success: true, message: 'Job deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { createJob: createJob, getJobs: getJobs, getJob: getJob, updateJob: updateJob, deleteJob: deleteJob };