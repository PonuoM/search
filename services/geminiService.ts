
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { AnalysisResult, CustomerHistoryRecord, IdentifiedSalesperson } from '../types';
import { 
  GEMINI_MODEL_NAME, 
  GEMINI_TEXT_ANALYSIS_PROMPT_TEMPLATE, 
  GEMINI_AUDIO_ANALYSIS_PROMPT_TEXT_part 
} from '../constants';

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      if (!base64String) {
        reject(new Error("Failed to extract base64 data from file."));
        return;
      }
      resolve(base64String);
    };
    reader.onerror = (error) => reject(error);
  });
};

const parseGeminiResponse = (responseText: string): AnalysisResult | null => {
  let jsonStr = responseText.trim();
  
  const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
  const match = jsonStr.match(fenceRegex);
  if (match && match[2]) {
    jsonStr = match[2].trim();
  }

  try {
    const parsed = JSON.parse(jsonStr) as AnalysisResult;

    // Sanitize fields that should be arrays to prevent runtime errors
    const { salespersonEvaluation, customerEvaluation, situationalEvaluation, strategicRecommendations } = parsed;

    if (salespersonEvaluation) {
      if (!Array.isArray(salespersonEvaluation.strengths)) salespersonEvaluation.strengths = [];
      if (!Array.isArray(salespersonEvaluation.areasForImprovement)) salespersonEvaluation.areasForImprovement = [];
    }

    if (customerEvaluation) {
        if (!Array.isArray(customerEvaluation.painPointsIdentified)) customerEvaluation.painPointsIdentified = [];
        if (!Array.isArray(customerEvaluation.decisionMakingFactors)) customerEvaluation.decisionMakingFactors = [];
    }

    if (situationalEvaluation) {
        if (!Array.isArray(situationalEvaluation.keyTopicsDiscussed)) situationalEvaluation.keyTopicsDiscussed = [];
        if (!Array.isArray(situationalEvaluation.unresolvedQuestions)) situationalEvaluation.unresolvedQuestions = [];
        if (!Array.isArray(situationalEvaluation.positiveSignals)) situationalEvaluation.positiveSignals = [];
        if (!Array.isArray(situationalEvaluation.negativeSignals)) situationalEvaluation.negativeSignals = [];
    }
    
    if (strategicRecommendations) {
        if (!Array.isArray(strategicRecommendations.talkingPoints)) strategicRecommendations.talkingPoints = [];
        if (!Array.isArray(strategicRecommendations.potentialUpsellOpportunities)) strategicRecommendations.potentialUpsellOpportunities = [];
        if (!Array.isArray(strategicRecommendations.detailedStrategy)) strategicRecommendations.detailedStrategy = [];
    }
    
    if (parsed.transcribedText && !Array.isArray(parsed.transcribedText)) {
      parsed.transcribedText = [];
    }

    return parsed;
  } catch (e) {
    console.error("Failed to parse JSON response:", e);
    console.error("Raw response text:", responseText);
    throw new Error(`Failed to parse AI response. Expected JSON but received: ${jsonStr.substring(0,1000)}...`);
  }
};


const getGenAI = (): GoogleGenAI => {
    // Vite replaces `process.env.API_KEY` with the actual value at build time.
    // This is configured in `vite.config.ts` using the `define` property.
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set. This is a build-time configuration. Make sure it's in your .env file.");
    }
    return new GoogleGenAI({ apiKey });
}

export const analyzeTextTranscript = async (transcript: string, productContext?: string | null, customerHistory?: CustomerHistoryRecord[] | null, salesperson?: IdentifiedSalesperson | null): Promise<AnalysisResult | null> => {
  const ai = getGenAI();
  const prompt = GEMINI_TEXT_ANALYSIS_PROMPT_TEMPLATE(transcript, productContext, customerHistory, salesperson);

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.5, 
      }
    });
    
    if (!response.text) {
        console.error("Gemini API returned an empty text response for text transcript analysis.");
        throw new Error("Received an empty response from the AI.");
    }
    return parseGeminiResponse(response.text);

  } catch (error) {
    console.error("Error calling Gemini API for text analysis:", error);
    if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while contacting the Gemini API.");
  }
};

export const analyzeAudioFile = async (audioFile: File, productContext?: string | null, customerHistory?: CustomerHistoryRecord[] | null, salesperson?: IdentifiedSalesperson | null): Promise<AnalysisResult | null> => {
  const ai = getGenAI();
  
  try {
    const audioBase64 = await fileToBase64(audioFile);
    const audioPart = {
      inlineData: {
        mimeType: audioFile.type || 'audio/mpeg', 
        data: audioBase64,
      },
    };
    
    const textPart = {
      text: GEMINI_AUDIO_ANALYSIS_PROMPT_TEXT_part(productContext, customerHistory, salesperson),
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME, 
      contents: [{ parts: [audioPart, textPart] }],
      config: {
        temperature: 0.5,
      }
    });

    if (!response.text) {
        console.error("Gemini API returned an empty text response for audio file analysis.");
        throw new Error("Received an empty response from the AI.");
    }
    return parseGeminiResponse(response.text);

  } catch (error) {
    console.error("Error calling Gemini API for audio analysis:", error);
     if (error instanceof Error) {
        throw new Error(`Gemini API error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while contacting the Gemini API.");
  }
};
