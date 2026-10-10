const agentService = require('../services/agentService');

async function screenCandidates(req, res) {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message is required' });
        }

        const result = await agentService.runScreeningAgent(message);
        return res.status(200).json(result);
    } catch (err) {
        console.error('Agent error:', err.message);
        return res.status(500).json({ success: false, message: 'Agent failed: ' + err.message });
    }
}

module.exports = { screenCandidates };