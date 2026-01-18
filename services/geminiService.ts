
import { GoogleGenAI } from "@google/genai";
import { Item, Transaction } from "../types";

export const generateAIResponse = async (
  prompt: string, 
  contextData: { items: Item[], transactions: Transaction[] }
): Promise<string> => {
  // Pengecekan aman untuk variabel lingkungan
  const apiKey = window.process?.env?.API_KEY || "";

  if (!apiKey || apiKey === "undefined" || apiKey.length < 10) {
    return "Error: API Key Gemini belum dikonfigurasi. Silakan tambahkan di Environment Variables Vercel.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });

    const lowStockItems = contextData.items.filter(i => i.currentStock <= i.minLevel);
    const contextSummary = `
      Current System State:
      - Total Items: ${contextData.items.length}
      - Low Stock Items: ${lowStockItems.map(i => `${i.name} (${i.currentStock})`).join(', ')}
      - Recent Transactions: ${contextData.transactions.slice(0, 5).map(t => `${t.type} ID ${t.transactionId}`).join(', ')}
    `;

    const systemInstruction = `
      You are Jupiter, an intelligent warehouse assistant. 
      You help users manage inventory and analyze warehouse data.
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
    return "Maaf, terjadi kesalahan API. Periksa console untuk detail.";
  }
};
