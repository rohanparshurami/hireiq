const resumeService = require('../services/resumeService');

async function uploadResume(req, res) {
  try {
    if (!req.file) {
      return res.json({ success: false, message: 'No file uploaded' });
    }
    const resume = await resumeService.uploadResume(req.userId, req.body.jobId, req.file);
    return res.json({ success: true, message: 'Resume uploaded successfully', data: resume });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getResumeUrl(req, res) {
  try {
    const data = await resumeService.getResumeUrl(req.body.resumeId);
    return res.json({ success: true, data: data });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getMyResumes(req, res) {
  try {
    const resumes = await resumeService.getMyResumes(req.userId);
    return res.json({ success: true, data: resumes });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { uploadResume: uploadResume, getResumeUrl: getResumeUrl, getMyResumes: getMyResumes };