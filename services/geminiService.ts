import { GoogleGenAI, Type } from "@google/genai";
import { User, RecognitionResult } from '../types';

// Helper to clean base64 string
const cleanBase64 = (data: string) => {
  return data.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');
};

export const recognizeFace = async (
  targetImage: string,
  users: User[]
): Promise<RecognitionResult> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing. Please set it in the environment.");
  }

  if (users.length === 0) {
    return { matches: [], reasoning: "No registered users to match against." };
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct parts for the model
  const parts: any[] = [];

  parts.push({
    text: `You are a strict Biometric Face Verification System. 
    
    TASK:
    1. Analyze the faces in the provided TARGET IMAGE.
    2. Compare them against the REFERENCE IMAGES provided below.
    3. Return a JSON list of matches only if the identity is CERTAIN.
    
    STRICT MATCHING RULES:
    - Compare facial structure, eye shape, nose bridge, and jawline precisely.
    - DIFFERENTIATE between siblings or look-alikes. If the face is different, DO NOT MATCH.
    - Confidence score (0.0 to 1.0):
      - 1.0: Exact same photo.
      - 0.9+: Same person, slightly different angle/lighting. High certainty.
      - < 0.85: Do NOT report as a match.
    - If the target image contains multiple people (Group Photo), list EVERYONE identified.
    - If no one matches registered users with >85% confidence, return an empty list.
    
    REFERENCE IMAGES (Database):`
  });

  // Add registered users
  users.forEach((user) => {
    parts.push({ text: `ID: ${user.id}, Name: ${user.name}` });
    parts.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: cleanBase64(user.image)
      }
    });
  });

  parts.push({ text: "TARGET IMAGE (Analyze this):" });
  parts.push({
    inlineData: {
      mimeType: 'image/jpeg',
      data: cleanBase64(targetImage)
    }
  });

  // Define schema for structured JSON output to handle multiple matches
  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      matches: {
        type: Type.ARRAY,
        description: "List of users identified with high confidence.",
        items: {
          type: Type.OBJECT,
          properties: {
             userId: { type: Type.STRING, description: "The ID of the matched user." },
             confidence: { type: Type.NUMBER, description: "Confidence score (0.0 to 1.0)." }
          },
          required: ["userId", "confidence"]
        }
      },
      reasoning: { type: Type.STRING, description: "Brief analysis of why the match was made or rejected." }
    },
    required: ["matches"]
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.0, // Zero temperature for maximum determinism and strictness
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from Gemini");

    const result = JSON.parse(resultText) as RecognitionResult;
    return result;

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};