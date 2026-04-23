'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { upsertTemplate, deleteTemplate } from '@/actions/support/template';

export type Template = {
  id: string;
  label: string;
  text: string;
  sort: number;
};

export default function TemplateManagerModal({ 
  open, 
  onClose, 
  templates 
}: { 
  open: boolean; 
  onClose: () => void; 
  templates: Template[] 
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [text, setText] = useState('');
  const [isPending, startTransition] = useTransition();

  if (!open) return null;

  const handleEdit = (tmpl: Template) => {
    setEditingId(tmpl.id);
    setLabel(tmpl.label);
    setText(tmpl.text);
  };

  const handleCreateNew = () => {
    setEditingId('new');
    setLabel('');
    setText('');
  };

  const handleSave = () => {
    if (!label.trim() || !text.trim()) return;

    startTransition(async () => {
      const fd = new FormData();
      if (editingId && editingId !== 'new') fd.set('id', editingId);
      fd.set('label', label);
      fd.set('text', text);
      fd.set('sort', '0'); // For simplicity, new goes to top or 0
      
      await upsertTemplate(fd);
      setEditingId(null);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Точно удалить шаблон?')) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      await deleteTemplate(fd);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm shadow-2xl">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>📑</span> Управление шаблонами
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose} className="rounded-full w-8 h-8 p-0 text-slate-400 hover:text-slate-600">✕</Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          <div className="mb-6 flex justify-between items-center">
            <p className="text-sm text-slate-500">Добавьте быстрые ответы для часто задаваемых вопросов.</p>
            {editingId !== 'new' && (
              <Button size="sm" onClick={handleCreateNew} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-sm">
                + Добавить шаблон
              </Button>
            )}
          </div>

          <div className="space-y-4">
            {editingId === 'new' && (
              <div className="p-4 bg-white border border-indigo-200 rounded-xl shadow-sm relative">
                <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3">Новый шаблон</div>
                <input 
                  type="text" 
                  placeholder="Метка кнопки (напр. '👋 Приветствие')" 
                  value={label} 
                  onChange={e => setLabel(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3 bg-slate-50"
                  autoFocus
                />
                <textarea 
                  placeholder="Текст ответа..." 
                  value={text} 
                  onChange={e => setText(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] resize-y bg-slate-50 leading-relaxed"
                />
                <div className="flex gap-2 justify-end mt-4">
                  <Button variant="outline" size="sm" onClick={() => setEditingId(null)} className="rounded-xl border-slate-200">Отмена</Button>
                  <Button size="sm" onClick={handleSave} disabled={isPending || !label.trim() || !text.trim()} className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
                    {isPending ? 'Сохранение...' : 'Сохранить шаблон'}
                  </Button>
                </div>
              </div>
            )}

            {templates.length === 0 && editingId !== 'new' && (
              <div className="p-8 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                Шаблонов пока нет. Добавьте первый!
              </div>
            )}

            {templates.map(tmpl => (
              <div key={tmpl.id}>
                {editingId === tmpl.id ? (
                  <div className="p-4 bg-white border border-indigo-200 rounded-xl shadow-sm relative animate-in fade-in">
                     <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-3">Редактирование</div>
                    <input 
                      type="text" 
                      placeholder="Метка кнопки" 
                      value={label} 
                      onChange={e => setLabel(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-3 bg-slate-50"
                    />
                    <textarea 
                      placeholder="Текст ответа" 
                      value={text} 
                      onChange={e => setText(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] resize-y bg-slate-50 leading-relaxed"
                    />
                    <div className="flex justify-between items-center mt-4">
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(tmpl.id)} className="text-rose-500 hover:text-rose-600 hover:bg-rose-50">
                        Удалить
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(null)} className="rounded-xl border-slate-200">Отмена</Button>
                        <Button size="sm" onClick={handleSave} disabled={isPending || !label.trim() || !text.trim()} className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
                          {isPending ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="group bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition-colors flex flex-col justify-between items-start gap-4 cursor-pointer" onClick={() => handleEdit(tmpl)}>
                     <div className="w-full">
                       <h3 className="font-bold text-sm text-slate-800 mb-1.5 flex items-center gap-2">
                         <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] uppercase font-bold">{tmpl.label}</span>
                       </h3>
                       <p className="text-sm text-slate-600 truncate opacity-80">{tmpl.text}</p>
                     </div>
                     <div className="text-[10px] text-indigo-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                       Кликните для редактирования
                     </div>
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
