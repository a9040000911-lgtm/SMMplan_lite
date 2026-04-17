'use client';

import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  sender: string;
  text: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  createdAt: string;
}

interface ChatWindowProps {
  ticketId: string;
  initialMessages: Message[];
  isStaff?: boolean;
  onSendMessage: (formData: FormData) => Promise<void>;
}

export default function ChatWindow({ ticketId, initialMessages, isStaff = false, onSendMessage }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCheckedRef = useRef<string>(
    initialMessages.length > 0 ? initialMessages[initialMessages.length - 1].createdAt : new Date(0).toISOString()
  );

  // Polling for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/support/messages?ticketId=${ticketId}&after=${encodeURIComponent(lastCheckedRef.current)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.messages && data.messages.length > 0) {
          setMessages(prev => {
            const existingIds = new Set(prev.map(m => m.id));
            const newMsgs = data.messages.filter((m: Message) => !existingIds.has(m.id));
            if (newMsgs.length === 0) return prev;
            return [...prev, ...newMsgs];
          });
          lastCheckedRef.current = data.messages[data.messages.length - 1].createdAt;
        }
      } catch { /* silent */ }
    }, 5000);
    return () => clearInterval(interval);
  }, [ticketId]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);

    const formData = new FormData();
    formData.set('ticketId', ticketId);
    formData.set('message', text.trim());
    if (isStaff && isInternal) {
      formData.set('isInternal', 'true');
    }

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: isStaff ? (isInternal ? 'INTERNAL' : 'STAFF') : 'USER',
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setText('');

    try {
      await onSendMessage(formData);
    } catch { /* handled by server */ }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm ${
              msg.sender === 'USER'
                ? 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
                : msg.sender === 'INTERNAL'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-br-sm'
                  : 'bg-indigo-600 text-white rounded-br-sm'
            }`}>
              <div className="text-[10px] font-semibold mb-1 opacity-60">
                {msg.sender === 'INTERNAL' ? '🔒 INTERNAL NOTE' : msg.sender}
                {' • '}
                {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
              
              {/* Media preview */}
              {msg.mediaUrl && msg.mediaType === 'image' && (
                <img src={`/api/media/${encodeURIComponent(msg.mediaUrl)}`} alt="attachment" className="rounded-lg max-h-60 mb-2 cursor-pointer" />
              )}
              {msg.mediaUrl && msg.mediaType === 'video' && (
                <video src={`/api/media/${encodeURIComponent(msg.mediaUrl)}`} controls className="rounded-lg max-h-60 mb-2" />
              )}

              <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-slate-400 py-16">
            <div className="text-4xl mb-2">💬</div>
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </div>
        {isStaff && (
          <label className="flex items-center gap-2 mt-2 text-xs text-amber-600 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500" 
            />
            🔒 Internal Note (hidden from client)
          </label>
        )}
      </form>
    </div>
  );
}
