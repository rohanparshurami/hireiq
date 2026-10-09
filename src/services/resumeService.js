const Resume = require('../models/Resume');
const s3Helper = require('../helpers/s3Helper');
const geminiHelper = require('../helpers/geminiHelper');
const embeddingHelper = require('../helpers/embeddingHelper'); // ADD THIS
const Job = require('../models/Jobs');

async function uploadResume(userId, jobId, file) {
    if (!jobId) return { success: false, message: 'Job ID is required' };
    if (!file) return { success: false, message: 'No file uploaded' };

    const allowedTypes = ['application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
        return { success: false, message: 'Only PDF files are allowed' };
    }

    const fileData = await s3Helper.uploadFile(file, 'resumes/' + userId);

    const resume = new Resume();
    resume.userId = userId;
    resume.jobId = jobId;
    resume.files = [fileData];
    resume.status = 'uploaded';
    await resume.save();

    let parsedData = null;
    try {
        parsedData = await geminiHelper.parseResume(file.buffer, file.mimetype);
        resume.parsedData = parsedData;
        await resume.save();

        // GENERATE AND STORE EMBEDDING AFTER PARSING
        try {
            const resumeText = buildResumeText(parsedData);
            await embeddingHelper.storeEmbedding(
                'resume_' + resume.resumeId,
                resumeText,
                {
                    type: 'resume',
                    resumeId: resume.resumeId.toString(),
                    userId: userId.toString(),
                    jobId: jobId.toString(),
                }
            );
            console.log('Resume embedding stored in Pinecone:', resume.resumeId);
        } catch (embeddingError) {
            console.error('Embedding storage failed:', embeddingError);
            // embedding failure does not fail the upload
        }

    } catch (parseError) {
        console.error('Resume parsing failed:', parseError);
        // parsing failure does not fail the upload
    }

    return {
        success: true,
        message: 'Resume uploaded successfully',
        data: {
            resumeId: resume.resumeId,
            jobId: resume.jobId,
            status: resume.status,
            originalName: fileData.originalName,
            parsedData: parsedData,
            createdAt: resume.createdAt
        }
    };
}

// Convert parsed resume object to plain text for embedding
function buildResumeText(parsedData) {
    const parts = [];

    if (parsedData.name) parts.push('Name: ' + parsedData.name);
    if (parsedData.summary) parts.push('Summary: ' + parsedData.summary);
    if (parsedData.skills && parsedData.skills.length) {
        parts.push('Skills: ' + parsedData.skills.join(', '));
    }
    if (parsedData.experience && parsedData.experience.length) {
        parsedData.experience.forEach(function(exp) {
            parts.push('Experience: ' + exp.title + ' at ' + exp.company + '. ' + (exp.description || ''));
        });
    }
    if (parsedData.education && parsedData.education.length) {
        parsedData.education.forEach(function(edu) {
            parts.push('Education: ' + edu.degree + ' from ' + edu.institution);
        });
    }

    return parts.join('\n');
}

async function getResumeUrl(resumeId) {
    if (!resumeId) return { success: false, message: 'Resume ID is required' };
    const resume = await Resume.findOne({ resumeId: resumeId });
    if (!resume) return { success: false, message: 'Resume not found' };
    const files = await s3Helper.getFileUrls(resume.files);
    return {
        success: true,
        data: {
            resumeId: resume.resumeId,
            jobId: resume.jobId,
            status: resume.status,
            parsedData: resume.parsedData,
            files: files
        }
    };
}

async function getMyResumes(userId) {
    const resumes = await Resume.find({ userId: userId });
    return {
        success: true,
        data: resumes.map(function(resume) {
            return {
                resumeId: resume.resumeId,
                jobId: resume.jobId,
                status: resume.status,
                originalName: resume.files[0] ? resume.files[0].originalName : null,
                parsedData: resume.parsedData,
                createdAt: resume.createdAt
            };
        })
    };
}

async function matchResume(resumeId, jobId) {
    if (!resumeId) return { success: false, message: 'Resume ID is required' };
    if (!jobId) return { success: false, message: 'Job ID is required' };

    const resume = await Resume.findOne({ resumeId: resumeId });
    if (!resume) return { success: false, message: 'Resume not found' };

    if (!resume.parsedData || !resume.parsedData.name) {
        return { success: false, message: 'Resume has not been parsed yet. Please re-upload the resume.' };
    }

    const job = await Job.findOne({ jobId: jobId });
    if (!job) return { success: false, message: 'Job not found' };

    const matchResult = await geminiHelper.matchJob(resume.parsedData, job.description, job.title);

    resume.matchScore = matchResult.matchScore;
    resume.matchResult = matchResult;
    await resume.save();

    return {
        success: true,
        data: {
            resumeId: resume.resumeId,
            jobId: jobId,
            candidateName: resume.parsedData.name,
            jobTitle: job.title,
            matchScore: matchResult.matchScore,
            summary: matchResult.summary,
            matchedSkills: matchResult.matchedSkills,
            missingSkills: matchResult.missingSkills,
            recommendation: matchResult.recommendation
        }
    };
}

async function getResumeFeedback(resumeId) {
    if (!resumeId) return { success: false, message: 'Resume ID is required' };

    const resume = await Resume.findOne({ resumeId: resumeId });
    if (!resume) return { success: false, message: 'Resume not found' };

    if (!resume.parsedData || !resume.parsedData.name) {
        return { success: false, message: 'Resume has not been parsed yet.' };
    }

    try {
        const feedback = await geminiHelper.getResumeFeedback(resume.parsedData);
        resume.feedback = feedback;
        await resume.save();
        return {
            success: true,
            data: { resumeId: resume.resumeId, candidateName: resume.parsedData.name, feedback }
        };
    } catch (geminiError) {
        console.error('Gemini feedback failed:', geminiError.message);
        return { success: false, message: 'AI service is temporarily unavailable. Please try again later.' };
    }
}

module.exports = {
    uploadResume: uploadResume,
    getResumeUrl: getResumeUrl,
    getMyResumes: getMyResumes,
    matchResume: matchResume,
    getResumeFeedback: getResumeFeedback
};