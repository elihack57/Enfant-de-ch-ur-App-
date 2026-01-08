import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { askFinancialAdvisor } from '../services/geminiService';
import { Transaction, Member, Category, Activity } from '../types';

interface AIAssistantProps {
  transactions: Transaction[];
  members: Member[];
  categories: Category[];
  activities: Activity[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ transactions, members, categories, activities }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Bonjour ! Je suis votre assistant trésorier intelligent. Je connais tout sur vos finances : état des inscriptions (qui doit combien), bilan des activités, solde en temps réel, etc. Posez-moi une question !" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMessage = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Pass complete context to the service
    const response = await askFinancialAdvisor(userMessage, transactions, members, categories, activities);
    
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-white dark:border-slate-700 overflow-hidden h-[650px] flex flex-col relative">
      
      {/* Chat Header */}
      <div className="p-6 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-50 dark:border-slate-700 absolute top-0 w-full z-10 flex items-center gap-4">
        <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-none">
           <Sparkles size={20} className="text-white" />
        </div>
        <div>
           <h3 className="font-bold text-slate-800 dark:text-white">Assistant Trésorier</h3>
           <div className="flex items-center gap-1.5">
             <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
             <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Connecté aux données</span>
           </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto pt-28 pb-24 px-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/30">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shrink-0 shadow-sm text-blue-600 dark:text-blue-400">
                    <Bot size={16} />
                  </div>
              )}
              <div className={`p-5 text-[15px] leading-relaxed shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-[20px] rounded-tr-sm' 
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-[20px] rounded-tl-sm border border-slate-100 dark:border-slate-700'
              }`}>
                <div className="whitespace-pre-line">{msg.content}</div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-fade-in">
            <div className="flex gap-3">
               <div className="w-8 h-8 rounded-full bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 flex items-center justify-center shrink-0 shadow-sm text-blue-600 dark:text-blue-400">
                <Bot size={16} />
              </div>
              <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-[20px] rounded-tl-sm border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
                <Loader2 size={18} className="animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-sm text-slate-400 font-medium">Analyse des données...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 w-full p-4 bg-white/80 dark:bg-slate-800/90 backdrop-blur-md border-t border-slate-50 dark:border-slate-700">
        <div className="relative flex items-center gap-2 max-w-3xl mx-auto">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Posez une question (ex: Qui n'a pas payé son inscription ?)"
            className="w-full bg-slate-100 dark:bg-slate-900 border-none rounded-full pl-6 pr-14 py-4 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400 font-medium"
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !query.trim()}
            className="absolute right-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-700 text-white p-2.5 rounded-full transition-all shadow-md disabled:shadow-none transform active:scale-95"
          >
            <Send size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};