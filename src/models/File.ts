import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, default: '' },
  type: {
    type: String,
    enum: ['folder', 'file', 'text', 'character', 'location', 'item', 'trash', 'idea'],
    default: 'file'
  },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'File' },
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  status: { type: String, enum: ['draft', 'revised', 'final'], default: 'draft' },
  isSystem: { type: Boolean, default: false },
  notes: String,
  synopsis: String,
  metadata: { type: Map, of: String },
  customData: { type: Map, of: String }, // For character bio, location details, etc.
  attachments: [{
    name: String,
    url: String,
    type: String,
    addedAt: { type: Date, default: Date.now }
  }],
  links: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }], // For linking scenes to characters/locations
  order: { type: Number, default: 0 },
  snapshots: [{ content: String, date: Date }],
  wordCount: { type: Number, default: 0 },
  sceneData: { // Specific narrative fields for scenes
    goal: String,
    conflict: String,
    outcome: String,
    characters: [{ type: String }] // Store Character IDs or Names
  },
  timeData: {
    startDay: { type: Number, default: 0 },
    startHour: { type: Number, default: 0 },
    startMinute: { type: Number, default: 0 },
    durationDay: { type: Number, default: 0 },
    durationHour: { type: Number, default: 0 },
    durationMinute: { type: Number, default: 0 }
  },
  metrics: {
    focus: { type: Number, default: 5 },       // 0-10
    dissonance: { type: Number, default: 1 },  // 1-10
    polarity: { type: Number, default: 0 }     // -10 to +10
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.File || mongoose.model('File', FileSchema);