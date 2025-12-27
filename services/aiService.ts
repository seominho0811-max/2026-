
import { GoogleGenAI, Type } from "@google/genai";
import { SusiData } from "../types";

export const getAIInsights = async (data: SusiData[]) => {
  // Always use the named parameter for apiKey and initialize inside the function
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Fix: Property 'ratio' does not exist on type 'SusiData'. 
  // We use available fields 'grade' and 'result' to provide context to the AI.
  const dataSummary = data.slice(0, 50).map(d => ({
    univ: d.university,
    type: d.admissionType,
    major: d.major,
    grade: d.grade,
    result: d.result
  }));

  const prompt = `
    Based on the following 2026 Academic Year Susi (Early Admission) data summary, 
    provide a professional analysis in Korean. 
    Focus on trends in admission results, popular majors, and strategic advice for applicants.
    
    Data snippet: ${JSON.stringify(dataSummary)}
  `;

  try {
    // Generate content using the recommended model and structured schema
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyFindings: { type: Type.ARRAY, items: { type: Type.STRING } },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["summary", "keyFindings", "recommendations"]
        }
      }
    });

    // Access the .text property directly (it's a getter, not a method)
    const text = response.text;
    if (!text) {
      throw new Error("Empty response from AI");
    }

    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Gemini AI error:", error);
    return null;
  }
};
