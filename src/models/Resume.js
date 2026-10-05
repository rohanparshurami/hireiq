const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
    resumeId: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    jobId: { type: String },
    files: [
      {
        originalName: { type: String },
        s3Key: { type: String },
        s3Bucket: { type: String },
        mimeType: { type: String },
        size: { type: Number },
        uploadedAt: { type: Date, default: Date.now }
      }
    ],
    status: { type: String, default: 'uploaded' }
  }, { timestamps: true });

resumeSchema.pre('save', async function() {
  if (!this.isNew) return;
  this.resumeId = 'RESUME-' + Date.now();
});

const Resume = mongoose.model('Resume', resumeSchema);

module.exports = Resume;