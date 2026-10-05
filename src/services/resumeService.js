const Resume = require('../models/Resume');
const s3Helper = require('../helpers/s3Helper');

async function uploadResume(userId, jobId, file) {
  const fileData = await s3Helper.uploadFile(file, 'resumes/' + userId);

  const resume = new Resume();
  resume.userId = userId;
  resume.jobId = jobId;
  resume.files = [fileData];
  resume.status = 'uploaded';
  await resume.save();

  return resume;
}

async function getResumeUrl(resumeId) {
  const resume = await Resume.findOne({ resumeId: resumeId });
  if (!resume) {
    throw new Error('Resume not found');
  }

  const files = await s3Helper.getFileUrls(resume.files);

  return { resume: resume, files: files };
}

async function getMyResumes(userId) {
  const resumes = await Resume.find({ userId: userId });
  return resumes;
}

module.exports = { uploadResume: uploadResume, getResumeUrl: getResumeUrl, getMyResumes: getMyResumes };