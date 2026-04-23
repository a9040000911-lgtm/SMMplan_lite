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
  initialTemplates?: { id: string, label: string, text: string }[];
  onSendMessage: (formData: FormData) => Promise<void>;
  editTicketMessage?: (formData: FormData) => Promise<void>;
}

const ImageZoomModal = ({ url, onClose }: { url: string; onClose: () => void }) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [position, setPosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isZoomed) return;
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setPosition({ x, y });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 cursor-zoom-out backdrop-blur-sm" onClick={onClose}>
      <div 
        className="relative w-full h-full max-w-7xl max-h-[90vh] flex items-center justify-center overflow-hidden rounded-xl"
        onClick={(e) => {
          e.stopPropagation();
          setIsZoomed(!isZoomed);
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setIsZoomed(false)}
        style={{ cursor: isZoomed ? 'zoom-out' : 'zoom-in' }}
      >
        <img 
          src={`/api/media/${encodeURIComponent(url)}`} 
          alt="zoomed" 
          className="max-w-full max-h-full object-contain transition-transform duration-200"
          style={
            isZoomed 
              ? { transform: 'scale(2.5)', transformOrigin: `${position.x}% ${position.y}%` }
              : { transform: 'scale(1)', transformOrigin: 'center center' }
          }
        />
      </div>
      <button className="absolute top-6 right-6 text-white/50 text-4xl p-4 hover:text-white transition-colors">✕</button>
      {!isZoomed && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 text-white/80 rounded-full text-sm font-medium backdrop-blur-md">
          Кликните для увеличения
        </div>
      )}
    </div>
  );
};

export default function ChatWindow({ ticketId, initialMessages, isStaff = false, initialTemplates = [], onSendMessage, editTicketMessage }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    if ((!text.trim() && !file) || sending) return;
    setSending(true);

    let mediaUrl = undefined;
    let mediaType = undefined;

    // Upload file first
    if (file) {
      const uploadForm = new FormData();
      uploadForm.set('file', file);
      uploadForm.set('ticketId', ticketId);

      try {
        const res = await fetch('/api/support/upload', {
          method: 'POST',
          body: uploadForm
        });
        if (res.ok) {
          const data = await res.json();
          mediaUrl = data.mediaUrl;
          mediaType = data.mediaType;
        } else {
          alert('Ошибка загрузки файла');
          setSending(false);
          return;
        }
      } catch (e) {
        alert('Ошибка загрузки файла');
        setSending(false);
        return;
      }
    }

    const formData = new FormData();
    formData.set('ticketId', ticketId);
    formData.set('message', text.trim());
    if (mediaUrl) formData.set('mediaUrl', mediaUrl);
    if (mediaType) formData.set('mediaType', mediaType);

    if (isStaff && isInternal) {
      formData.set('isInternal', 'true');
    }

    // Optimistic update
    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: isStaff ? (isInternal ? 'INTERNAL' : 'STAFF') : 'USER',
      text: text.trim(),
      mediaUrl,
      mediaType,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);
    setText('');
    setFile(null);

    try {
      await onSendMessage(formData);
    } catch { /* handled by server */ }
    setSending(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set false if we are leaving the main container
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleEditSubmit = async (msgId: string) => {
    if (!editingText.trim() || !editTicketMessage) {
      return setEditingMessageId(null);
    }
    
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editingText.trim() } : m));
    setEditingMessageId(null);

    const fd = new FormData();
    fd.set('messageId', msgId);
    fd.set('newText', editingText);
    
    try {
      await editTicketMessage(fd);
    } catch { /* error silently failing in MVP */ }
  };

  return (
    <div 
      className="flex flex-col h-full relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-[100] bg-indigo-500/10 backdrop-blur-sm border-2 border-dashed border-indigo-400 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="bg-white/90 px-8 py-6 rounded-2xl shadow-xl flex flex-col items-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            </div>
            <p className="text-xl font-bold text-slate-800">Перетащите файл сюда</p>
            <p className="text-sm text-slate-500 mt-1">Изображение или PDF (до 5 МБ)</p>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'USER' ? 'justify-start' : 'justify-end'}`}>
            <div className={`group relative max-w-[75%] rounded-2xl p-4 shadow-sm ${
              msg.sender === 'USER'
                ? 'bg-white border border-slate-200 text-slate-900 rounded-bl-sm'
                : msg.sender === 'INTERNAL'
                  ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-br-sm'
                  : 'bg-indigo-600 text-white rounded-br-sm'
            }`}>
              
              {/* Edit button hover action */}
              {msg.sender !== 'USER' && editingMessageId !== msg.id && editTicketMessage && (
                <button 
                  onClick={() => { setEditingMessageId(msg.id); setEditingText(msg.text); }}
                  className="absolute -left-10 top-2 opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-indigo-600 transition-opacity rounded-full bg-white shadow-sm border border-slate-100"
                  title="Редактировать сообщение (Логируется)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
              )}

              <div className="text-[10px] font-semibold mb-1 opacity-60">
                {msg.sender === 'INTERNAL' ? '🔒 INTERNAL NOTE' : msg.sender}
                {' • '}
                {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
              </div>
              
              {/* Media preview */}
              {msg.mediaUrl && msg.mediaType === 'image' && (
                <img 
                  src={`/api/media/${encodeURIComponent(msg.mediaUrl)}`} 
                  alt="attachment" 
                  onClick={() => setZoomedImage(msg.mediaUrl as string)}
                  className="rounded-lg max-h-60 mb-2 cursor-zoom-in border border-slate-200 hover:opacity-90 transition-opacity" 
                />
              )}
              {msg.mediaUrl && msg.mediaType === 'video' && (
                <video src={`/api/media/${encodeURIComponent(msg.mediaUrl)}`} controls className="rounded-lg max-h-60 mb-2 border border-slate-200" />
              )}
              {msg.mediaUrl && msg.mediaType === 'document' && (
                <div className="flex items-center gap-2 bg-black/5 p-2 rounded-lg border border-black/10 mb-2">
                   <div className="text-xl">📄</div>
                   <div className="text-sm font-semibold truncate flex-1 leading-tight">Приложенный<br/>документ (чек)</div>
                   <a href={`/api/media/${encodeURIComponent(msg.mediaUrl)}`} target="_blank" className="text-indigo-600 text-[10px] font-bold px-2 py-1 bg-white shadow-sm border border-slate-200 rounded hover:bg-slate-50">Открыть</a>
                </div>
              )}

              {editingMessageId === msg.id ? (
                <div className="mt-2 animate-in fade-in zoom-in-95 duration-200">
                  <textarea 
                     value={editingText}
                     onChange={e => setEditingText(e.target.value)}
                     className="w-full text-sm text-slate-900 bg-white border border-slate-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                     autoFocus
                  />
                  <div className="flex gap-2 justify-end mt-2">
                     <button onClick={() => setEditingMessageId(null)} className="text-[11px] font-bold uppercase bg-white/50 text-slate-700 px-3 py-1.5 rounded border border-slate-300 hover:bg-white">Отмена</button>
                     <button onClick={() => handleEditSubmit(msg.id)} className="text-[11px] font-bold uppercase bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 shadow-sm border border-indigo-700">Сохранить</button>
                  </div>
                </div>
              ) : (
                <div className="whitespace-pre-wrap text-sm">{msg.text}</div>
              )}
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
        
        {isStaff && initialTemplates.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1 flex items-center">Шаблоны быстрых ответов:</span>
            {initialTemplates.map(t => (
              <button 
                key={t.id} 
                type="button" 
                onClick={() => setText(t.text)}
                className="px-2 py-1 border border-slate-200 text-[10px] font-bold bg-white text-slate-600 rounded-md hover:bg-indigo-50 border hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                title={t.text}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
             type="file"
             className="hidden"
             ref={fileInputRef}
             accept="image/jpeg,image/png,image/webp,application/pdf"
             onChange={(e) => {
               if (e.target.files && e.target.files[0]) {
                 setFile(e.target.files[0]);
               }
             }}
          />
          <button 
             type="button"
             onClick={() => fileInputRef.current?.click()}
             className="px-3 bg-slate-100 border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-200 hover:text-slate-700 transition-colors flex items-center justify-center shrink-0"
             title="Прикрепить файл (скриншот или PDF чек)"
          >
             📎
          </button>
          
          <div className="flex-1 relative flex items-center border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent bg-white">
            {file && (
              <div className="absolute left-2 pl-1.5 pr-2 py-1 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-md border border-indigo-200 flex items-center gap-1 z-10 max-w-[150px]">
                 <span className="truncate">{file.name}</span>
                 <button type="button" onClick={() => setFile(null)} className="opacity-60 hover:opacity-100 font-bold ml-1">✕</button>
              </div>
            )}
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={file ? "" : "Введите ваше сообщение..."}
              className={`w-full bg-transparent border-none px-4 py-2.5 text-sm focus:outline-none ${file ? 'pl-[170px]' : ''}`}
            />
          </div>

          <button
            type="submit"
            disabled={(!text.trim() && !file) || sending}
            className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors shrink-0"
          >
            Отправить
          </button>
        </div>
        {isStaff && (
          <label className="flex items-center gap-2 mt-3 text-xs text-amber-600 font-medium cursor-pointer w-max bg-amber-50 px-3 py-1.5 rounded-md border border-amber-200">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="rounded border-amber-300 text-amber-600 focus:ring-amber-500" 
            />
            🔒 Скрытая заметка (невидна клиенту)
          </label>
        )}
      </form>

      {/* Zoom Modal */}
      {zoomedImage && (
        <ImageZoomModal 
          url={zoomedImage} 
          onClose={() => setZoomedImage(null)} 
        />
      )}
    </div>
  );
}
