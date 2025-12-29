import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
    userId: { type: String, required: false }, // Optional, in case we want anonymous feedback later, or handle non-logged in state (though auth is required generally)
    userEmail: { type: String, required: false },
    type: {
        type: String,
        enum: ['bug', 'suggestion', 'other'],
        default: 'other'
    },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['new', 'read', 'archived'],
        default: 'new'
    }
});

export default mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);
