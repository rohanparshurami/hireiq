const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobId: { type: String, unique: true },
  jobCode: { type: String, unique: true },
  title: { type: String },
  description: { type: String },
  company: { type: String },
  location: { type: String },
  salary: { type: String },
  skillset: { type: [String] },
  status: { type: String, default: 'open' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

jobSchema.pre('save', async function() {
  if (!this.isNew) return;
  this.jobId = 'JOBID-' + Date.now();
  this.jobCode = 'JOB-' + Math.random().toString(36).substring(2, 10).toUpperCase();
});

const Job = mongoose.model('Job', jobSchema, 'jobs');
module.exports = Job;