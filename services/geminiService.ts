
import { GoogleGenAI, Type } from "@google/genai";

// Fixed: Always use direct process.env.API_KEY without fallback as per guidelines
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMathQuestions = async (count: number = 9): Promise<{ expression: string; answer: number }[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate ${count} fun mental math questions for elementary school kids (ages 8-12). 
      Include addition, subtraction, and simple multiplication.
      Format: JSON array of objects with "expression" (e.g. "12 + 5") and "answer" (number).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              expression: { type: Type.STRING },
              answer: { type: Type.NUMBER }
            },
            required: ["expression", "answer"]
          }
        }
      }
    });
    // response.text property returns the generated string
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Failed to generate questions, using fallback", error);
    return Array.from({ length: count }, (_, i) => {
      const a = Math.floor(Math.random() * 20) + 1;
      const b = Math.floor(Math.random() * 20) + 1;
      return { expression: `${a} + ${b}`, answer: a + b };
    });
  }
};

export const getCheerMessage = async (score: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `The student got a score of ${score} out of 9 in a mental math battle. 
      Give a super short, high-energy, encouraging message in Korean for an elementary student. Max 20 characters.`,
    });
    // response.text property returns the generated string
    return response.text || "대단해요! 멋진 수학 영웅이에요!";
  } catch {
    return "정말 멋진 실력이에요!";
  }
};
