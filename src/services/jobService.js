const Job = require('../models/Jobs');
const geminiHelper = require('../helpers/geminiHelper');
const embeddingHelper = require('../helpers/embeddingHelper'); // ADD THIS

async function createJob(userId, data) {
    if (!data.title) return { success: false, message: 'Job title is required' };
    if (!data.description) return { success: false, message: 'Job description is required' };
    if (!data.company) return { success: false, message: 'Company name is required' };
    if (data.salary && isNaN(Number(data.salary))) return { success: false, message: 'Salary must be a valid number' };
    if (data.status && !['open', 'closed', 'draft'].includes(data.status)) return { success: false, message: 'Status must be open, closed or draft' };

    const job = new Job();
    job.title = data.title;
    job.description = data.description;
    job.company = data.company;
    job.location = data.location;
    job.salary = data.salary;
    job.skillset = data.skillset;
    job.status = 'open';
    job.postedBy = userId;
    await job.save();

    // STORE JOB EMBEDDING IN PINECONE
    try {
        const jobText = buildJobText(job);
        await embeddingHelper.storeEmbedding(
            'job_' + job.jobId,
            jobText,
            {
                type: 'job',
                jobId: job.jobId.toString(),
                title: job.title,
                company: job.company,
                status: job.status,
            }
        );
        console.log('Job embedding stored in Pinecone:', job.jobId);
    } catch (embeddingError) {
        console.error('Job embedding storage failed:', embeddingError);
        // embedding failure does not fail job creation
    }

    return {
        success: true,
        message: 'Job created successfully',
        data: {
            jobId: job.jobId,
            title: job.title,
            description: job.description,
            company: job.company,
            location: job.location,
            salary: job.salary,
            skillset: job.skillset,
            status: job.status
        }
    };
}

async function getJobs() {
    const jobs = await Job.find().populate('postedBy', 'name email');
    return {
        success: true,
        data: jobs.map(function(job) {
            return {
                jobId: job.jobId,
                title: job.title,
                company: job.company,
                location: job.location,
                salary: job.salary,
                status: job.status,
                postedBy: job.postedBy
            };
        })
    };
}

async function getJob(jobId) {
    if (!jobId) return { success: false, message: 'Job ID is required' };

    const job = await Job.findOne({ jobId: jobId });
    if (!job) return { success: false, message: 'Job not found' };

    return {
        success: true,
        data: {
            jobId: job.jobId,
            title: job.title,
            description: job.description,
            company: job.company,
            location: job.location,
            salary: job.salary,
            skillset: job.skillset,
            status: job.status
        }
    };
}

async function updateJob(jobId, data) {
    if (!jobId) return { success: false, message: 'Job ID is required' };
    if (data.salary && isNaN(Number(data.salary))) return { success: false, message: 'Salary must be a valid number' };
    if (data.status && !['open', 'closed', 'draft'].includes(data.status)) return { success: false, message: 'Status must be open, closed or draft' };

    const job = await Job.findOne({ jobId: jobId });
    if (!job) return { success: false, message: 'Job not found' };

    job.title = data.title || job.title;
    job.description = data.description || job.description;
    job.company = data.company || job.company;
    job.location = data.location || job.location;
    job.salary = data.salary || job.salary;
    job.skillset = data.skillset || job.skillset;
    job.status = data.status || job.status;
    await job.save();

    // UPDATE JOB EMBEDDING IN PINECONE (upsert replaces old vector)
    try {
        const jobText = buildJobText(job);
        await embeddingHelper.storeEmbedding(
            'job_' + job.jobId,
            jobText,
            {
                type: 'job',
                jobId: job.jobId.toString(),
                title: job.title,
                company: job.company,
                status: job.status,
            }
        );
        console.log('Job embedding updated in Pinecone:', job.jobId);
    } catch (embeddingError) {
        console.error('Job embedding update failed:', embeddingError);
        // embedding failure does not fail job update
    }

    return {
        success: true,
        message: 'Job updated successfully',
        data: {
            jobId: job.jobId,
            title: job.title,
            company: job.company,
            status: job.status
        }
    };
}

async function deleteJob(jobId) {
    if (!jobId) return { success: false, message: 'Job ID is required' };

    const job = await Job.findOneAndDelete({ jobId: jobId });
    if (!job) return { success: false, message: 'Job not found' };

    // DELETE JOB EMBEDDING FROM PINECONE
    try {
        await embeddingHelper.deleteEmbedding('job_' + jobId);
        console.log('Job embedding deleted from Pinecone:', jobId);
    } catch (embeddingError) {
        console.error('Job embedding deletion failed:', embeddingError);
        // embedding failure does not fail job deletion
    }

    return { success: true, message: 'Job deleted successfully' };
}

async function generateInterviewQuestions(jobId) {
    if (!jobId) return { success: false, message: 'Job ID is required' };

    const job = await Job.findOne({ jobId: jobId });
    if (!job) return { success: false, message: 'Job not found' };

    try {
        const questions = await geminiHelper.generateInterviewQuestions(job.title, job.description);
        job.interviewQuestions = questions;
        await job.save();
        return {
            success: true,
            data: {
                jobId: job.jobId,
                jobTitle: job.title,
                interviewQuestions: questions
            }
        };
    } catch (geminiError) {
        console.error('Gemini interview questions failed:', geminiError.message);
        return { success: false, message: 'AI service is temporarily unavailable. Please try again later.' };
    }
}

// Convert job object to plain text for embedding
function buildJobText(job) {
    const parts = [];

    if (job.title) parts.push('Job Title: ' + job.title);
    if (job.company) parts.push('Company: ' + job.company);
    if (job.location) parts.push('Location: ' + job.location);
    if (job.description) parts.push('Description: ' + job.description);
    if (job.skillset && job.skillset.length) {
        parts.push('Required Skills: ' + job.skillset.join(', '));
    }

    return parts.join('\n');
}

module.exports = {
    createJob: createJob,
    getJobs: getJobs,
    getJob: getJob,
    updateJob: updateJob,
    deleteJob: deleteJob,
    generateInterviewQuestions: generateInterviewQuestions
};