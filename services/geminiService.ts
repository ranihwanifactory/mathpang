
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Gemini API client using the environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Generates math questions using Gemini 3 Flash.
 * Returns an array of objects with expression and answer.
 */
export const generateMathQuestions = async (count: number = 9): Promise<{ expression: string; answer: number }[]> => {
  // Use Gemini to generate high-quality math questions for the specified count.
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate ${count} math questions for children. 
      - Include a mix of addition, subtraction, and multiplication.
      - Addition and subtraction results should be positive and under 100.
      - Multiplication should be between 2 and 9.
      - Use '×' as the multiplication operator in the expression string.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              expression: {
                type: Type.STRING,
                description: "The math expression (e.g. '15 + 7', '24 - 8', '6 × 4')",
              },
              answer: {
                type: Type.NUMBER,
                description: "The integer result of the expression",
              },
            },
            required: ["expression", "answer"],
            propertyOrdering: ["expression", "answer"],
          },
        },
      },
    });

    const questions = JSON.parse(response.text || "[]");
    return questions;
  } catch (error) {
    console.error("Failed to generate questions with Gemini:", error);
    // Fallback static generation if API fails to ensure game continuity.
    const questions: { expression: string; answer: number }[] = [];
    const operators = ['+', '-', '*'];
    for (let i = 0; i < count; i++) {
      const op = operators[Math.floor(Math.random() * operators.length)];
      let a, b, expression, answer;
      if (op === '+') {
        a = Math.floor(Math.random() * 50) + 1;
        b = Math.floor(Math.random() * 50) + 1;
        expression = `${a} + ${b}`;
        answer = a + b;
      } else if (op === '-') {
        a = Math.floor(Math.random() * 50) + 20;
        b = Math.floor(Math.random() * a) + 1;
        expression = `${a} - ${b}`;
        answer = a - b;
      } else {
        a = Math.floor(Math.random() * 9) + 2;
        b = Math.floor(Math.random() * 9) + 1;
        expression = `${a} × ${b}`;
        answer = a * b;
      }
      questions.push({ expression, answer });
    }
    return questions;
  }
};

/**
 * Gets a personalized cheer message from Gemini 3 Flash based on the player's performance.
 */
export const getCheerMessage = async (score: number): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `A child just finished a mental math challenge with a score of ${score}/9. 
      Write an enthusiastic and encouraging one-sentence cheer message in Korean. 
      Vary the tone: highly impressed for high scores, supportive for lower scores.`,
    });
    return response.text?.trim() || "정말 멋진 대결이었어요! 다음에도 화이팅!";
  } catch (error) {
    console.error("Failed to get cheer message from Gemini:", error);
    return "정말 대단해요! 최고의 수학 실력이에요!";
  }
};
