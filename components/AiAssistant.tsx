
import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../context/Store';
import { generateAIResponse } from '../services/geminiService';
import { Send, Bot, User, Sparkles, Zap } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const AiAssistant: React.FC = () => {
  const { items, transactions } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am Jupiter, your warehouse co-pilot. I can analyze stock levels, predict shortages, and audit history. How can I assist you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const aiMsg: Message = { role: 'assistant', content: aiResponseText, timestamp: new Date() };
    setMessages(prev => [...prev, aiMsg]);
    setIsLoading(false);
  };

  return (
    <div className="h-[calc(100vh-10rem)] flex flex-col space-y-6">
      <div className="flex flex-col">
        <h1 className="text-2xl font-bold text-navy dark:text-white flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-primary to-secondary rounded-xl text-white shadow-glow-primary">
            <Zap className="w-5 h-5" />
          </div>
          Intelligence Desk
        </h1>
        <p className="text-sm text-muted-gray font-medium mt-1">Smart inventory insights powered by Gemini AI.</p>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[32px] border border-card-border dark:border-slate-800 shadow-soft flex flex-col overflow-hidden relative transition-all">
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-surface/30 dark:bg-slate-950/30 custom-scrollbar">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex items-start gap-4 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-soft transition-all ${
                msg.role === 'user' ? 'bg-primary text-white' : 'bg-white dark:bg-slate-800 text-primary border border-card-border dark:border-slate-700'
              }`}>
                {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
              </div>
              <div className={`p-5 rounded-3xl text-sm leading-relaxed relative ${
                msg.role === 'user' 
                  ? 'bg-navy text-white rounded-tr-sm shadow-soft-lg' 
                  : 'bg-white dark:bg-slate-800 text-navy dark:text-slate-200 border border-card-border dark:border-slate-700 rounded-tl-sm shadow-soft'
              }`}>
                {msg.content}
                <div className={`text-[9px] mt-2 font-black uppercase tracking-widest opacity-40 ${msg.role === 'user' ? 'text-white/60' : 'text-navy/40'}`}>
                  {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-4 animate-pulse">
               <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center border border-card-border">
                 <Bot size={20} className="text-primary animate-bounce" />
               </div>
               <div className="bg-white dark:bg-slate-800 px-6 py-4 rounded-3xl rounded-tl-sm border border-card-border shadow-soft">
                 <div className="flex gap-1.5">
                   <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                   <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                   <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
                 </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 bg-white dark:bg-slate-900 border-t border-card-border dark:border-slate-800">
          <div className="relative flex items-center">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
              placeholder="Ask me anything about your stock status..."
              className="w-full pl-6 pr-16 py-4 bg-surface dark:bg-slate-950 border border-transparent rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white transition-all text-sm font-medium shadow-inner"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 p-3 bg-primary text-white rounded-2xl hover:bg-blue-600 disabled:opacity-30 transition-all shadow-glow-primary active:scale-95"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-[10px] text-center mt-3 font-bold text-muted-gray uppercase tracking-widest">Powered by Jupiter AI Infrastructure</p>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
