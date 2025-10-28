'use server';

import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';

if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
  console.error('GEMINI_API_KEY not set in .env.local – get one from https://aistudio.google.com/app/apikey');
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

const GenerateResponseSchema = z.object({
  prompt: z.string(),
  context: z.string().optional(),
});

export async function generateNextResponse({ prompt, context }: z.infer<typeof GenerateResponseSchema>) {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('Missing GEMINI_API_KEY – using fallback response');
    return 'Thanks for your response. Let\'s move to the next question.';
  }

  try {
    console.log('Prompt:', prompt.substring(0, 100) + '...', 'Context:', context || 'none');
    const content = context ? [prompt, context] : [prompt];
    const result = await genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' }).generateContent(content);
    const response = await result.response;
    const text = response.text();
    return text?.trim() || 'Thanks for your response. Let\'s move to the next question.';
  } catch (error) {
    console.error('Gemini error details:', error);
    return null; // Triggers fallback in Agent
  }
}