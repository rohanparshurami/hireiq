const Job = require('../models/Jobs');

async function createJob(userId, data) {
  const job = new Job();
  job.jobCode = 'JOB-' + Math.random().toString(36).substring(2, 10).toUpperCase();
  job.title = data.title;
  job.description = data.description;
  job.company = data.company;
  job.location = data.location;
  job.salary = data.salary;
  job.skillset = data.skillset;
  job.status = 'open';
  job.postedBy = userId;
  await job.save();

  return job;
}

async function getJobs() {
  const jobs = await Job.find().populate('postedBy', 'name email');
  return jobs;
}

async function getJob(jobId) {
  const job = await Job.findOne({ jobId: jobId });
  if (!job) {
    throw new Error('Job not found');
  }
  return job;
}

async function updateJob(jobId, data) {
  const job = await Job.findOne({ jobId: jobId });
  if (!job) {
    throw new Error('Job not found');
  }

  job.title = data.title || job.title;
  job.description = data.description || job.description;
  job.company = data.company || job.company;
  job.location = data.location || job.location;
  job.salary = data.salary || job.salary;
  job.skillset = data.skillset || job.skillset;
  job.status = data.status || job.status;
  await job.save();

  return job;
}

async function deleteJob(jobId) {
  const job = await Job.findOneAndDelete({ jobId: jobId });
  if (!job) {
    throw new Error('Job not found');
  }
  return job;
}

module.exports = { createJob: createJob, getJobs: getJobs, getJob: getJob, updateJob: updateJob, deleteJob: deleteJob };