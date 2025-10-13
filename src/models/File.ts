import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  type: { type: String, enum: ['folder', 'file'], default: 'file' },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { type: String, enum: ['draft', 'revised', 'final'], default: 'draft' },
  notes: String,
  synopsis: String,
  metadata: { type: Map, of: String },
  snapshots: [{ content: String, date: Date }],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.File || mongoose.model('File', FileSchema);