const resumeService = require('../services/resumeService');

async function uploadResume(req, res) {
  try {
    const result = await resumeService.uploadResume(req.userId, req.body.jobId, req.file);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function getResumeUrl(req, res) {
  try {
    const result = await resumeService.getResumeUrl(req.body.resumeId);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function getMyResumes(req, res) {
  try {
    const result = await resumeService.getMyResumes(req.userId);
    return res.json(result);
  } catch (error) {
    console.error(error);
    return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function matchResume(req, res) {
  try {
      const result = await resumeService.matchResume(req.body.resumeId, req.body.jobId);
      return res.json(result);
  } catch (error) {
      console.error(error);
      return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

async function getResumeFeedback(req, res) {
  try {
      const result = await resumeService.getResumeFeedback(req.body.resumeId);
      return res.json(result);
  } catch (error) {
      console.error(error);
      return res.json({ success: false, message: 'Something went wrong, please try again' });
  }
}

module.exports = { uploadResume: uploadResume, getResumeUrl: getResumeUrl, getMyResumes: getMyResumes, matchResume: matchResume, getResumeFeedback: getResumeFeedback };