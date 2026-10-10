const jobService = require('../services/jobService');
const resumeService = require('../services/resumeService');
const searchService = require('../services/searchService');

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

const toolImplementations = {
    async getJob({ jobId }) {
        return await jobService.getJob(jobId);
    },

    async searchCandidates({ jobId, topK = 10 }) {
        const k = Math.min(topK, 20);
        return await searchService.findCandidatesForJob(jobId, k);
    },

    async getMatchScore({ resumeId, jobId }) {
        return await resumeService.matchResume(resumeId, jobId);
    }
};

module.exports = { toolDefinitions, toolImplementations };