const searchService = require('../services/searchService');

async function findJobsForResume(req, res) {
    try {
        const topK = parseInt(req.query.limit) || 5;
        const result = await searchService.findJobsForResume(req.body.resumeId, topK);
        return res.json(result);
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'Something went wrong, please try again' });
    }
}

async function findCandidatesForJob(req, res) {
    try {
        const topK = parseInt(req.query.limit) || 10;
        const result = await searchService.findCandidatesForJob(req.body.jobId, topK);
        return res.json(result);
    } catch (error) {
        console.error(error);
        return res.json({ success: false, message: 'Something went wrong, please try again' });
    }
}

module.exports = {
    findJobsForResume: findJobsForResume,
    findCandidatesForJob: findCandidatesForJob
};