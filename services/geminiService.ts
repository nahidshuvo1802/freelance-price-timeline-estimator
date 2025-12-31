
import { GoogleGenAI, Type } from "@google/genai";
import { ProjectExample, EstimationResult, EstimationConfig } from "../types";

const safeJsonParse = (text: string | undefined, fallback: any) => {
  if (!text) return fallback;
  try {
    // Remove potential markdown code blocks if the AI includes them
    const cleanText = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Text:", text);
    return fallback;
  }
};

// Helper function to extract text from response parts
export const parseProjectDocument = async (fileData: string, mimeType: string): Promise<{
  title?: string,
  requirements: string,
  budget?: string,
  timeline?: string,
  projectScope?: string,
  phases?: string[]
}> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "AIzaSy..." }); // Using fallback if env not set for dev, though should use env

  const systemInstruction = `
    You are an expert document analyzer. Extract project information from the provided file.
    Return a JSON object with:
    - 'title': A short catchy title for the project.
    - 'requirements': A detailed summary of what needs to be built.
    - 'budget': Any mentioned price/budget (if found).
    - 'timeline': Any mentioned duration/deadline (if found).
    - 'projectScope': Choose the most relevant category from: ["App, Admin Dashboard, Website", "App, Admin Dashboard", "App Only", "UI/UX Design (Web)", "UI/UX Design (App, Web, Admin Dashboard)", "Website / Admin Dashboard", "Only Frontend (App, Web, Admin Dashboard)"].
    - 'phases': Identify applicable phases from ["UI/UX design", "frontend", "backend/api integration", "deployment"].
    
    If fields are not found, return empty strings for them. Focus on high accuracy.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-lite-preview-02-05',
      contents: {
        parts: [
          { inlineData: { data: fileData, mimeType } },
          { text: "Analyze this document and extract the project details, including scope and phases." }
        ]
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            requirements: { type: Type.STRING },
            budget: { type: Type.STRING },
            timeline: { type: Type.STRING },
            projectScope: { type: Type.STRING },
            phases: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["requirements", "projectScope", "phases"]
        }
      }
    });

    return safeJsonParse(response.text, { requirements: "Could not extract requirements automatically." });
  } catch (error) {
    console.error("AI Analysis Error:", error);
    return { requirements: "Analysis failed. Please enter manually." };
  }
};

// Generates an estimation based on current requirements and historical data.
export const generateEstimation = async (
  currentRequirements: string,
  examples: ProjectExample[],
  config: EstimationConfig
): Promise<EstimationResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const exampleParts: any[] = [];
  examples.forEach((ex, idx) => {
    exampleParts.push({
      text: `
PAST SUCCESSFUL PROJECT #${idx + 1}:
Title: ${ex.title}
Requirements: ${ex.requirements}
Budget: ${ex.budget}
Timeline: ${ex.timeline}
${ex.attachment ? `(Attachment included: ${ex.attachment.name})` : ''}
      `.trim()
    });

    if (ex.attachment) {
      exampleParts.push({
        inlineData: {
          mimeType: ex.attachment.mimeType,
          data: ex.attachment.data
        }
      });
    }
  });

  const phasesPart = config.phases.length > 0
    ? `\nPROJECT PHASES INVOLVED: ${config.phases.join(', ')}`
    : "";

  const systemInstruction = `
    You are an elite Sales Strategist for Freelancers. 
    CONTEXT:
    - Platform: ${config.platform}
    - Project Scope Category: ${config.projectScope}${phasesPart}
    
    TASK: Analyze the requirements and provide an estimation.
    ${config.platform === 'Fiverr' ? 'Note: On Fiverr, focus on tier-based value or competitive quick-delivery pricing.' : ''}
    ${config.platform === 'Upwork' ? 'Note: On Upwork, focus on high-quality delivery, expertise, and long-term value.' : ''}
    
    Phases involved: ${config.phases.join(', ')}. Ensure the breakdown and reasoning specifically account for these phases.
    
    Use the provided "PAST SUCCESSFUL PROJECTS" (including any visual/document attachments provided) to align with the freelancer's established pricing logic and proposal style.
    
    Output JSON with:
    1. 'budget': Range/estimate.
    2. 'timeline': Expected delivery.
    3. 'reasoning': Why this price for this platform/scope/phases?
    4. 'proposal': Ready-to-send text.
    5. 'breakdown': Array of steps.
    6. 'riskFactors': Array of potential issues.
  `;

  try {
    const response = await ai.models.generateContent({
      model: config.model,
      contents: {
        parts: [
          ...exampleParts,
          {
            text: `
NEW PROJECT REQUIREMENTS:
${currentRequirements}

Generate the estimation now based on the specified scope, phases, and historical wins.
            `.trim()
          }
        ]
      },
      config: {
        systemInstruction,
        temperature: config.temperature,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            budget: { type: Type.STRING },
            timeline: { type: Type.STRING },
            reasoning: { type: Type.STRING },
            proposal: { type: Type.STRING },
            breakdown: { type: Type.ARRAY, items: { type: Type.STRING } },
            riskFactors: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["budget", "timeline", "reasoning", "proposal", "breakdown", "riskFactors"]
        }
      }
    });

    return safeJsonParse(response.text, {
      budget: "Error",
      timeline: "Error",
      reasoning: "Failed to parse AI response.",
      proposal: "Sorry, I couldn't generate a proposal. Please try again.",
      breakdown: [],
      riskFactors: []
    });
  } catch (error) {
    console.error("AI Estimation Error:", error);
    throw error;
  }
};
