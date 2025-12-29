import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'missing_api_key', // Fallback to prevent build/runtime crash
});

export default openai;