const embeddingHelper = require('../helpers/embeddingHelper');
const Resume = require('../models/Resume');
const Job = require('../models/Jobs');

// Find matching jobs for a resume (candidate view)
async function findJobsForResume(resumeId, topK = 5) {
    if (!resumeId) return { success: false, message: 'Resume ID is required' };

    // Get resume from MongoDB
    const resume = await Resume.findOne({ resumeId: resumeId });
    if (!resume) return { success: false, message: 'Resume not found' };

    if (!resume.parsedData) {
        return { success: false, message: 'Resume has not been parsed yet. Please re-upload.' };
    }

    // Search Pinecone for similar job vectors
    // filter: type = 'job' and status = 'open' — only search open jobs
    const matches = await embeddingHelper.searchSimilar(
        JSON.stringify(resume.parsedData),
        topK,
        { type: 'job', status: 'open' }
    );

    if (!matches || matches.length === 0) {
        return { success: true, data: [] };
    }

    // Extract job IDs from Pinecone results
    // Pinecone returns id like "job_123" — strip "job_" prefix to get jobId
    const jobIds = matches.map(function(match) {
        return match.metadata.jobId;
    });

    // Fetch full job details from MongoDB using those IDs
    const jobs = await Job.find({ jobId: { $in: jobIds } });

    // Merge similarity score from Pinecone with job data from MongoDB
    const results = matches.map(function(match) {
        const job = jobs.find(function(j) {
            return j.jobId.toString() === match.metadata.jobId;
        });
        if (!job) return null;
        return {
            jobId: job.jobId,
            title: job.title,
            company: job.company,
            location: job.location,
            salary: job.salary,
            skillset: job.skillset,
            status: job.status,
            similarityScore: Math.round(match.score * 100) // convert 0.94 → 94%
        };
    }).filter(Boolean); // remove nulls

    return {
        success: true,
        data: {
            resumeId: resumeId,
            candidateName: resume.parsedData.name,
            matchedJobs: results
        }
    };
}

// Find matching candidates for a job (recruiter view)
async function findCandidatesForJob(jobId, topK = 10) {
    if (!jobId) return { success: false, message: 'Job ID is required' };

    // Get job from MongoDB
    const job = await Job.findOne({ jobId: jobId });
    if (!job) return { success: false, message: 'Job not found' };

    // Build job text for search
    const jobText = 'Job Title: ' + job.title + '\nDescription: ' + job.description +
        (job.skillset ? '\nRequired Skills: ' + job.skillset.join(', ') : '');

    // Search Pinecone for similar resume vectors
    const matches = await embeddingHelper.searchSimilar(
        jobText,
        topK,
        { type: 'resume' }
    );

    if (!matches || matches.length === 0) {
        return { success: true, data: [] };
    }

    // Extract resume IDs from Pinecone results
    const resumeIds = matches.map(function(match) {
        return match.metadata.resumeId;
    });

    // Fetch full resume details from MongoDB
    const resumes = await Resume.find({ resumeId: { $in: resumeIds } });

    // Merge similarity score with resume data
    const results = matches.map(function(match) {
        const resume = resumes.find(function(r) {
            return r.resumeId.toString() === match.metadata.resumeId;
        });
        if (!resume) return null;
        return {
            resumeId: resume.resumeId,
            candidateName: resume.parsedData ? resume.parsedData.name : 'Unknown',
            skills: resume.parsedData ? resume.parsedData.skills : [],
            experience: resume.parsedData ? resume.parsedData.experience : [],
            similarityScore: Math.round(match.score * 100) // convert 0.87 → 87%
        };
    }).filter(Boolean);

    return {
        success: true,
        data: {
            jobId: jobId,
            jobTitle: job.title,
            matchedCandidates: results
        }
    };
}

module.exports = {
    findJobsForResume: findJobsForResume,
    findCandidatesForJob: findCandidatesForJob
};