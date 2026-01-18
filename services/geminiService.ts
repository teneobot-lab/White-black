
import { GoogleGenAI } from "@google/genai";
import { Item, Transaction } from "../types";

export const generateAIResponse = async (
  prompt: string, 
  contextData: { items: Item[], transactions: Transaction[] }
): Promise<string> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    return "Error: API Key Gemini belum dikonfigurasi di Environment Variables Vercel.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    // Prepare context for the AI
    const lowStockItems = contextData.items.filter(i => i.currentStock <= i.minLevel);
    const contextSummary = `
      Current System State:
      - Total Items: ${contextData.items.length}
      - Low Stock Items: ${lowStockItems.map(i => `${i.name} (${i.currentStock})`).join(', ')}
      - Recent Transactions: ${contextData.transactions.slice(0, 5).map(t => `${t.type} ID ${t.transactionId}`).join(', ')}
    `;

    const systemInstruction = `
      You are Jupiter, an intelligent warehouse assistant. 
      You help users manage inventory, analyze trends, and answer questions about the WMS.
      Be concise, professional, and helpful. 
      Use the provided context data to answer questions about stock levels or history.
      If you don't know the answer, say so politely.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Context: ${contextSummary}\n\nUser Question: ${prompt}`,
      config: {
        systemInstruction: systemInstruction,
      }
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Maaf, terjadi kesalahan saat menghubungi AI. Pastikan API Key valid.";
  }
};
