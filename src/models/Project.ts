import mongoose from 'mongoose';

const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: String,
  coverImage: String, // URL or Gradient Class
  files: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],
  variables: [{
    key: String,
    value: String
  }],
  graphData: {
    edges: [], // Allow any structure (Mixed) to store ReactFlow styles/handles
    positions: { type: mongoose.Schema.Types.Mixed } // Use Mixed for flexible object
  },
  settings: {
    genre: {
      type: String,
      enum: ['sci_fi', 'thriller', 'eastern_slice', 'custom'],
      default: 'custom'
    },
    structure: {
      type: String,
      enum: ['western', 'eastern'],
      default: 'western'
    },
    sensitivity: {
      type: String,
      enum: ['relaxed', 'strict'],
      default: 'relaxed'
    },
    dailyGoal: { type: Number, default: 500 }
  },
  stats: {
    dailyProgress: { type: Map, of: Number, default: {} }
  },
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Project || mongoose.model('Project', ProjectSchema);