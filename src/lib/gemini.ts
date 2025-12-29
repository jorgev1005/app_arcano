import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'missing_google_key');

export default genAI;
