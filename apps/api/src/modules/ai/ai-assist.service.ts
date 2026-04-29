import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '@workspace/env';

export class AiAssistService {
  private genAI: GoogleGenerativeAI | null = null;

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    }
  }

  async autocomplete(text: string) {
    if (!this.genAI) throw new Error('AI service not configured');
    
    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are a medical EMR and CRM AI assistant providing inline text autocomplete. 
The user is currently typing the following text. 
Please provide ONLY the continuation text that logically follows exactly after the very last word the user typed. 
Do not finish the current word if the user is in the middle of it, assume there is a space coming unless it's obvious, but preferably just provide the next few logical words.
DO NOT include any of the original text.
DO NOT include quotes or explanations. 
If the text seems perfectly complete, return an empty string.
Keep the continuation short, no more than 10-15 words.

User Text:
${text}`;

    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();

    // Minor cleanups
    const lastWord = text.trim().split(' ').pop();
    if (lastWord && responseText.toLowerCase().startsWith(lastWord.toLowerCase())) {
      responseText = responseText.substring(lastWord.length).trim();
    }

    return responseText;
  }

  async rewrite(text: string, instruction: string) {
    if (!this.genAI) throw new Error('AI service not configured');

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are an AI writing assistant in a medical EMR portal. 
Rewrite the following text according to this instruction: "${instruction}". 
Return ONLY the rewritten text. 
Maintain a highly professional, clinical, or business tone appropriate for a medical CRM/EMR system. 
Do not include any conversational filler, quotes, or introductory text.

Text to rewrite:
${text}`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  }
}
