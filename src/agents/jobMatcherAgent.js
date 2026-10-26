/**
 * JobMatcherAgent
 * Specialist agent — single responsibility: score how well a candidate fits a job.
 * Takes ResumeAnalyst output + job details. Returns match report.
 */

const genAI = require('../config/gemini');
const { withRetry } = require('../helpers/agentHelper');

const AGENT_NAME = 'JobMatcher';

async function _matchJob(candidateProfile, jobDetails) {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const prompt = `You are a job matching specialist. Your only job is to evaluate how well a candidate fits a job.

CANDIDATE PROFILE:
${JSON.stringify(candidateProfile, null, 2)}

JOB DETAILS:
Title: ${jobDetails.title}
Company: ${jobDetails.company}
Description: ${jobDetails.description}
Required Skills: ${jobDetails.skillset ? jobDetails.skillset.join(', ') : 'Not specified'}

Evaluate the match and return a JSON object with exactly these fields:
{
  "matchScore": number between 0-100,
  "matchLevel": "Strong Match" | "Good Match" | "Partial Match" | "Weak Match",
  "matchedSkills": ["skills candidate has that job needs"],
  "missingSkills": ["skills job needs that candidate lacks"],
  "experienceGap": "assessment of experience level fit",
  "recommendation": "Shortlist" | "Consider" | "Reject",
  "reasonSummary": "2-3 sentences explaining the match verdict"
}

Return ONLY the JSON object. No markdown, no explanation.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(text);
    const usage = result.response.usageMetadata;

    return {
        success: true,
        agent: AGENT_NAME,
        data: data,
        tokensUsed: usage ? (usage.totalTokenCount || 0) : 0
    };
}

const matchJob = withRetry(_matchJob, 3, AGENT_NAME);

async function runJobMatcherAgent(candidateProfile, jobDetails) {
    if (!candidateProfile) {
        return { success: false, agent: AGENT_NAME, message: 'Candidate profile is required' };
    }
    if (!jobDetails) {
        return { success: false, agent: AGENT_NAME, message: 'Job details are required' };
    }

    try {
        console.log(`[${AGENT_NAME}] Scoring match for ${candidateProfile.candidateName}...`);
        const result = await matchJob(candidateProfile, jobDetails);
        console.log(`[${AGENT_NAME}] Done. Score: ${result.data.matchScore}. Tokens: ${result.tokensUsed}`);
        return result;
    } catch (err) {
        console.error(`[${AGENT_NAME}] Failed:`, err.message);
        return { success: false, agent: AGENT_NAME, message: err.message };
    }
}

module.exports = { runJobMatcherAgent };
