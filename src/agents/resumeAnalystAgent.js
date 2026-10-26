/**
 * ResumeAnalystAgent
 * Specialist agent — single responsibility: extract structured data from resume text.
 * Knows nothing about jobs or interview questions.
 */

const genAI = require('../config/gemini');
const { withRetry } = require('../helpers/agentHelper');

const AGENT_NAME = 'ResumeAnalyst';

async function _analyzeResume(resumeText) {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const prompt = `You are a resume analysis specialist. Your only job is to extract structured information from a resume.

RESUME TEXT:
${resumeText}

Extract and return a JSON object with exactly these fields:
{
  "candidateName": "full name",
  "totalExperienceYears": number,
  "currentRole": "most recent job title",
  "currentCompany": "most recent company",
  "skills": ["skill1", "skill2"],
  "experienceSummary": "2-3 sentence summary of career",
  "education": [{ "degree": "", "institution": "", "year": "" }],
  "strengths": ["strength1", "strength2"],
  "redFlags": ["any concerns like gaps, frequent job changes, etc"]
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

const analyzeResume = withRetry(_analyzeResume, 3, AGENT_NAME);

async function runResumeAnalystAgent(resumeText) {
    if (!resumeText || resumeText.trim().length === 0) {
        return { success: false, agent: AGENT_NAME, message: 'Resume text is empty' };
    }

    try {
        console.log(`[${AGENT_NAME}] Analyzing resume...`);
        const result = await analyzeResume(resumeText);
        console.log(`[${AGENT_NAME}] Done. Tokens used: ${result.tokensUsed}`);
        return result;
    } catch (err) {
        console.error(`[${AGENT_NAME}] Failed:`, err.message);
        return { success: false, agent: AGENT_NAME, message: err.message };
    }
}

module.exports = { runResumeAnalystAgent };
