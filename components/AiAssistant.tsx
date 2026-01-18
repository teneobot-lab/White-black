
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { generateAIResponse } from '../services/geminiService';
import { Send, Bot, User, Sparkles, AlertTriangle } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AiAssistant: React.FC = () => {
  const { items, transactions } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am Jupiter, your warehouse assistant. How can I help you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hasApiKey = process.env.API_KEY && process.env.API_KEY !== "undefined";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const aiResponseText = await generateAIResponse(input, { items, transactions });

    const aiMsg: Message = { 
      role: 'assistant', 
      content: aiResponseText, 
      timestamp: new Date() 
    };

    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-yellow-500" />
          AI Assistant
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">Ask questions about your inventory, stock levels, or history.</p>
      </div>

      {!hasApiKey && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-200 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p><strong>Perhatian:</strong> API Key Gemini belum terpasang di Vercel. Fitur AI tidak akan berfungsi sebelum Anda menambahkannya di Dashboard Vercel.</p>
        </div>
      )}

      <div className="flex-1 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col overflow-hidden transition-colors">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50 dark:bg-black/20">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex items-start gap-3 max-w-[80%] ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === 'user' ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-yellow-600'
              }`}>
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-tr-sm' 
                  : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-tl-sm shadow-sm'
              }`}>
                {msg.content}
                <div className={`text-[10px] mt-2 opacity-50 ${msg.role === 'user' ? 'text-zinc-300 dark:text-zinc-600' : 'text-zinc-400'}`}>
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
             <div className="flex items-start gap-3 max-w-[80%]">
               <div className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-yellow-600 flex items-center justify-center">
                 <Bot className="w-4 h-4 animate-pulse" />
               </div>
               <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm">
                 <div className="flex gap-1">
                   <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="w-2 h-2 bg-zinc-300 dark:bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!hasApiKey || isLoading}
              placeholder={hasApiKey ? "Ask about your inventory..." : "AI dinonaktifkan (Cek konfigurasi API Key)"}
              className="w-full pl-4 pr-12 py-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-500 focus:bg-white dark:focus:bg-zinc-900 resize-none h-[60px] text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 transition-colors disabled:opacity-50"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !hasApiKey}
              className="absolute right-2 top-2 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
