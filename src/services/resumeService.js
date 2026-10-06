const Resume = require('../models/Resume');
const s3Helper = require('../helpers/s3Helper');

async function uploadResume(userId, jobId, file) {
  if (!jobId) {
    return { success: false, message: 'Job ID is required' };
  }
  if (!file) {
    return { success: false, message: 'No file uploaded' };
  }

  const fileData = await s3Helper.uploadFile(file, 'resumes/' + userId);

  const resume = new Resume();
  resume.userId = userId;
  resume.jobId = jobId;
  resume.files = [fileData];
  resume.status = 'uploaded';
  await resume.save();

  return {
    success: true,
    message: 'Resume uploaded successfully',
    data: {
      resumeId: resume.resumeId,
      jobId: resume.jobId,
      status: resume.status,
      originalName: fileData.originalName,
      createdAt: resume.createdAt
    }
  };
}

async function getResumeUrl(resumeId) {
  if (!resumeId) {
    return { success: false, message: 'Resume ID is required' };
  }

  const resume = await Resume.findOne({ resumeId: resumeId });
  if (!resume) {
    return { success: false, message: 'Resume not found' };
  }

  const files = await s3Helper.getFileUrls(resume.files);

  return {
    success: true,
    data: {
      resumeId: resume.resumeId,
      jobId: resume.jobId,
      status: resume.status,
      files: files
    }
  };
}

async function getMyResumes(userId) {
  const resumes = await Resume.find({ userId: userId });
  return {
    success: true,
    data: resumes.map(function(resume) {
      return {
        resumeId: resume.resumeId,
        jobId: resume.jobId,
        status: resume.status,
        originalName: resume.files[0] ? resume.files[0].originalName : null,
        createdAt: resume.createdAt
      };
    })
  };
}

module.exports = { uploadResume: uploadResume, getResumeUrl: getResumeUrl, getMyResumes: getMyResumes };