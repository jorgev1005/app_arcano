import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String, // First Name
  lastName: String, // Last Name
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Project' }],
});

export default mongoose.models.User || mongoose.model('User', UserSchema);