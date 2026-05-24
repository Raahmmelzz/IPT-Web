import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

interface Message {
    role: 'user' | 'assistant';
    text: string;
}

const CHAT_URL = 'http://localhost:8000/api/chat/';

const Chatbot: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', text: 'Hi! I\'m your G-Stop AI assistant. Ask me anything about gaming gear, orders, or our store!' },
    ]);
    const [loading, setLoading] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 150);
    }, [isOpen]);

    const sendMessage = async () => {
        if (!message.trim() || loading) return;

        const userMsg = message.trim();
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setMessage('');
        setLoading(true);

        try {
            const res = await axios.post(CHAT_URL, { message: userMsg });
            setMessages(prev => [...prev, { role: 'assistant', text: res.data.assistant.message }]);
        } catch {
            setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, the AI service is unavailable right now.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(o => !o)}
                className="fixed bottom-6 right-6 z-[80] w-14 h-14 rounded-2xl bg-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.5)] flex items-center justify-center text-2xl border border-indigo-400/30"
                title="AI Assistant"
            >
                {isOpen ? '✕' : '💬'}
            </motion.button>

            {/* Chat Window */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed bottom-24 right-6 z-[80] w-[350px] h-[500px] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-white/10"
                        style={{ background: 'rgba(15,17,40,0.97)', backdropFilter: 'blur(20px)' }}
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3 bg-indigo-900/80 border-b border-white/10">
                            <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-sm font-black text-white shadow-[0_0_12px_rgba(99,102,241,0.5)]">
                                G
                            </div>
                            <div>
                                <p className="text-white font-black text-sm tracking-wide">AI Assistant</p>
                                <p className="text-indigo-300 text-xs font-semibold">Powered by Qwen 2.5</p>
                            </div>
                            <div className="ml-auto flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                <span className="text-emerald-400 text-xs font-bold">Online</span>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 custom-scrollbar">
                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm font-medium leading-relaxed ${
                                        msg.role === 'user'
                                            ? 'bg-indigo-500 text-white rounded-br-sm'
                                            : 'bg-slate-800/80 text-slate-200 border border-white/5 rounded-bl-sm'
                                    }`}>
                                        {msg.text}
                                    </div>
                                </motion.div>
                            ))}

                            {loading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-800/80 border border-white/5 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
                                        {[0, 1, 2].map(i => (
                                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                                                style={{ animationDelay: `${i * 0.15}s` }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="px-3 py-3 border-t border-white/10 bg-slate-900/50 flex items-center gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                placeholder="Ask about gaming gear..."
                                disabled={loading}
                                className="flex-1 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 disabled:opacity-50 transition-all"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={loading || !message.trim()}
                                className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-95 flex-shrink-0"
                            >
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Chatbot;
