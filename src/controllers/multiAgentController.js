const { runCandidatePipeline, runBulkScreening } = require('../services/multiAgentService');

/**
 * POST /agent/pipeline
 * Deep analysis of a single candidate against a job.
 * Body: { jobId, resumeId }
 */
async function runPipeline(req, res) {
    try {
        const { jobId, resumeId } = req.body;

        if (!jobId) return res.status(400).json({ success: false, message: 'jobId is required' });
        if (!resumeId) return res.status(400).json({ success: false, message: 'resumeId is required' });

        const result = await runCandidatePipeline(jobId, resumeId);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (err) {
        console.error('[multiAgentController] runPipeline error:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

/**
 * POST /agent/screen-all
 * Auto-discover top candidates via semantic search, then run the full
 * multi-agent pipeline on all of them in parallel. Returns a ranked shortlist.
 * Body: { jobId, topK? }
 */
async function screenAll(req, res) {
    try {
        const { jobId, topK } = req.body;

        if (!jobId) return res.status(400).json({ success: false, message: 'jobId is required' });

        const k = topK ? Math.min(parseInt(topK), 10) : 5;
        const result = await runBulkScreening(jobId, k);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (err) {
        console.error('[multiAgentController] screenAll error:', err.message);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
}

module.exports = { runPipeline, screenAll };
