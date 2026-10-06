const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobId: { type: String, unique: true },
  jobCode: { type: String },
  title: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  company: { type: String, required: true, trim: true },
  location: { type: String, trim: true },
  salary: { type: Number },
  skillset: { type: [String], default: [] },
  status: { type: String, enum: ['open', 'closed', 'draft'], default: 'open' },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

jobSchema.pre('save', async function() {
  if (!this.isNew) return;
  this.jobId = 'JOB-' + Date.now();
});

const Job = mongoose.model('Job', jobSchema);
module.exports = Job;