import { useState, useCallback } from 'react';

// API Gateway REST endpoint - NO API KEY NEEDED (Lambda protects Gemini key)
const API_ENDPOINT = (import.meta as any).env.VITE_API_ENDPOINT || "https://YOUR_API_ID.execute-api.eu-north-1.amazonaws.com/prod/generate";

export interface AIStep {
  spokenText: string;
  whiteboardText: string;
  highlightText?: string;
  permanentHighlight?: string;
  drawings?: string; // JSON string from Lambda
}

export interface AIResponse {
  chatAction: string;
  mode: string;
  language?: string;
  clearBoard: boolean;
  steps: AIStep[];
  audioUrl?: string;
  fallback?: boolean;
}

export const useAIClassroom = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateResponse = useCallback(async (prompt: string, image: string | null = null): Promise<AIResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt, image }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const aiData = await response.json();

      if (aiData.fallback) {
        console.warn("AI service busy - using fallback mode");
      }

      return aiData;
    } catch (err: any) {
      setError(err.message);
      console.error('AI request failed:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { generateResponse, loading, error };
};
