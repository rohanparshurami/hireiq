const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    resumeId: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    jobId: { type: String, required: true },
    files: [{
        originalName: { type: String },
        s3Key: { type: String },
        s3Bucket: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date, default: Date.now }
    }],
    status: { type: String, enum: ['uploaded', 'reviewed', 'shortlisted', 'rejected'], default: 'uploaded' },
    parsedData: {
        name: { type: String },
        email: { type: String },
        phone: { type: String },
        totalExperience: { type: String },
        skills: { type: [String], default: [] },
        companies: { type: [String], default: [] },
        education: { type: [String], default: [] }
    },
    matchScore: { type: Number },
    matchResult: {
        matchScore: { type: Number },
        summary: { type: String },
        matchedSkills: { type: [String], default: [] },
        missingSkills: { type: [String], default: [] },
        recommendation: { type: String }
    }
}, { timestamps: true });

resumeSchema.pre('save', async function() {
    if (!this.isNew) return;
    this.resumeId = 'RESUME-' + Date.now();
});

const Resume = mongoose.model('Resume', resumeSchema);
module.exports = Resume;