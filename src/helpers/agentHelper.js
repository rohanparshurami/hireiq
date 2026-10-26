/**
 * agentHelper.js
 * Shared utilities for the multi-agent system.
 * - withRetry: exponential backoff for Gemini API calls
 * - toolDefinitions: tool schemas exposed to Gemini function-calling
 * - toolImplementations: actual implementations of each tool
 */

const jobService = require('../services/jobService');
const resumeService = require('../services/resumeService');
const searchService = require('../services/searchService');

// ---------------------------------------------------------------------------
// withRetry — exponential backoff for transient Gemini errors
// ---------------------------------------------------------------------------
//
// Usage (wrap a function once, call the wrapped version):
//   const safeCall = withRetry(myAsyncFn, 3, 'AgentName');
//   const result  = await safeCall(arg1, arg2);
//
// Usage (one-shot inline):
//   const result = await withRetry(myAsyncFn, 3, 'AgentName')(arg1, arg2);
//
// Retries only on: 503 / overloaded / UNAVAILABLE errors
// Delays: 2s → 4s → 8s  (2^attempt × 1000 ms)

function withRetry(fn, maxRetries = 3, context = 'Agent') {
    return async function (...args) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn(...args);
            } catch (err) {
                lastError = err;
                const isRetryable = err.message && (
                    err.message.includes('503') ||
                    err.message.includes('overloaded') ||
                    err.message.includes('UNAVAILABLE')
                );
                if (!isRetryable || attempt === maxRetries) throw err;
                const delay = Math.pow(2, attempt) * 1000;
                console.log(`[${context}] Retry attempt ${attempt}/${maxRetries} after ${delay}ms — ${err.message}`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        throw lastError;
    };
}

// ---------------------------------------------------------------------------
// Tool definitions — schemas Gemini uses for function-calling (agentService)
// ---------------------------------------------------------------------------

const toolDefinitions = [
    {
        name: 'getJob',
        description: 'Fetch complete job details including title, description, required skills, location and status. Call this first to understand job requirements.',
        parameters: {
            type: 'object',
            properties: {
                jobId: {
                    type: 'string',
                    description: 'The unique job ID e.g. JOB-1791383498057'
                }
            },
            required: ['jobId']
        }
    },
    {
        name: 'searchCandidates',
        description: 'Search vector database to find candidates whose resumes are semantically similar to a job. Returns candidates ranked by similarity score.',
        parameters: {
            type: 'object',
            properties: {
                jobId: {
                    type: 'string',
                    description: 'The job ID to find candidates for'
                },
                topK: {
                    type: 'number',
                    description: 'Maximum number of candidates to return. Default 10, max 20.'
                }
            },
            required: ['jobId']
        }
    },
    {
        name: 'getMatchScore',
        description: 'Calculate detailed AI match score between a candidate resume and a job. Returns match percentage, matched skills, missing skills and hiring recommendation.',
        parameters: {
            type: 'object',
            properties: {
                resumeId: {
                    type: 'string',
                    description: 'The resume ID of the candidate'
                },
                jobId: {
                    type: 'string',
                    description: 'The job ID to match against'
                }
            },
            required: ['resumeId', 'jobId']
        }
    }
];

// ---------------------------------------------------------------------------
// Tool implementations — called by agentService and orchestratorAgent
// ---------------------------------------------------------------------------

const toolImplementations = {
    async getJob({ jobId }) {
        return await jobService.getJob(jobId);
    },

    async searchCandidates({ jobId, topK = 10 }) {
        const k = Math.min(topK, 20);
        const result = await searchService.findCandidatesForJob(jobId, k);
        // Normalise: orchestrator expects a flat array of { resumeId, candidateName, score }
        if (result.success && result.data && result.data.matchedCandidates) {
            return {
                success: true,
                data: result.data.matchedCandidates.map(c => ({
                    resumeId: c.resumeId,
                    candidateName: c.candidateName,
                    score: c.similarityScore
                }))
            };
        }
        return result;
    },

    async getMatchScore({ resumeId, jobId }) {
        return await resumeService.matchResume(resumeId, jobId);
    },

    async getResumeText({ resumeId }) {
        return await resumeService.getResumeText(resumeId);
    }
};

module.exports = { withRetry, toolDefinitions, toolImplementations };
