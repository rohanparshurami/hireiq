/**
 * InterviewPlannerAgent
 * Specialist agent — single responsibility: generate targeted interview questions.
 * Uses ResumeAnalyst output + JobMatcher output to focus questions on skill gaps.
 */

const genAI = require('../config/gemini');
const { withRetry } = require('../helpers/agentHelper');

const AGENT_NAME = 'InterviewPlanner';

async function _planInterview(candidateProfile, matchResult, jobDetails) {
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

    const prompt = `You are an interview planning specialist. Generate targeted interview questions based on the candidate's profile and their match result for this job.

CANDIDATE: ${candidateProfile.candidateName}
EXPERIENCE: ${candidateProfile.totalExperienceYears} years
STRENGTHS: ${(candidateProfile.strengths || []).join(', ')}

JOB: ${jobDetails.title} at ${jobDetails.company}

MATCH RESULT:
- Score: ${matchResult.matchScore}/100
- Matched Skills: ${(matchResult.matchedSkills || []).join(', ')}
- Missing Skills: ${(matchResult.missingSkills || []).join(', ')}
- Experience Gap: ${matchResult.experienceGap}

Generate interview questions that specifically probe the missing skills and verify the matched skills.

Return a JSON object with exactly these fields:
{
  "technicalQuestions": [
    { "question": "...", "purpose": "what this question tests", "targetSkill": "which skill gap it addresses" }
  ],
  "behavioralQuestions": [
    { "question": "...", "purpose": "..." }
  ],
  "gapProbeQuestions": [
    { "question": "...", "purpose": "...", "skillGap": "which missing skill this probes" }
  ],
  "interviewFocus": "1-2 sentences on what the interviewer should focus on for this candidate"
}

Include 3 technical, 2 behavioral, and 2 gap probe questions.
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

const planInterview = withRetry(_planInterview, 3, AGENT_NAME);

async function runInterviewPlannerAgent(candidateProfile, matchResult, jobDetails) {
    if (!candidateProfile || !matchResult || !jobDetails) {
        return { success: false, agent: AGENT_NAME, message: 'candidateProfile, matchResult and jobDetails are all required' };
    }

    try {
        console.log(`[${AGENT_NAME}] Planning interview for ${candidateProfile.candidateName}...`);
        const result = await planInterview(candidateProfile, matchResult, jobDetails);
        console.log(`[${AGENT_NAME}] Done. Tokens: ${result.tokensUsed}`);
        return result;
    } catch (err) {
        console.error(`[${AGENT_NAME}] Failed:`, err.message);
        return { success: false, agent: AGENT_NAME, message: err.message };
    }
}

module.exports = { runInterviewPlannerAgent };
