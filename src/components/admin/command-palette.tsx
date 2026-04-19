'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { globalOmniSearch, SearchHit } from '@/actions/admin/search';
import { useEffect, useState, useTransition } from 'react';
import { Search, Loader2 } from 'lucide-react';

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [isPending, startTransition] = useTransition();

  // Handle hotkeys (CMD+K / CTRL+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Debounced search
  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      return;
    }
    
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const results = await globalOmniSearch(query);
          setHits(results);
        } catch (e) {
          console.error('OmniSearch error', e);
        }
      });
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const onSelectHit = (href: string) => {
    setOpen(false);
    setQuery('');
    router.push(href);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={() => setOpen(false)} />
      
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        <Command label="Global Search" onKeyDown={(e) => {
           if (e.key === 'Escape') setOpen(false);
        }}>
          <div className="flex items-center px-4 py-3 border-b border-slate-100">
             <Search className="w-5 h-5 text-slate-400 mr-3" />
             <Command.Input 
               autoFocus
               placeholder="Поиск по клиентам, заказам, или услугам (⌘K)..." 
               value={query}
               onValueChange={setQuery}
               className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400 font-medium"
             />
             {isPending && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin ml-2" />}
          </div>

          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="p-4 text-center text-sm text-slate-500">
              {query.length < 2 ? 'Введите минимум 2 символа для поиска...' : 'Ничего не найдено.'}
            </Command.Empty>

            {hits.length > 0 && (
              <Command.Group heading="Результаты" className="text-xs font-semibold text-slate-500 px-2 py-1 mb-2">
                {hits.map((hit) => (
                  <Command.Item 
                    key={hit.id} 
                    value={hit.title + hit.subtitle} // for internal filtering
                    onSelect={() => onSelectHit(hit.href)}
                    className="flex flex-col gap-1 px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 aria-selected:bg-indigo-50 aria-selected:text-indigo-900"
                  >
                    <span className="font-medium text-slate-900 aria-selected:text-indigo-900">{hit.title}</span>
                    <span className="text-xs text-slate-500">{hit.subtitle}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick Actions Example */}
            {!query && (
               <Command.Group heading="Быстрые действия" className="text-xs font-semibold text-slate-500 px-2 py-1">
                 <Command.Item onSelect={() => onSelectHit('/admin/orders')} className="px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100">
                   Перейти к Заказам
                 </Command.Item>
                 <Command.Item onSelect={() => onSelectHit('/admin/providers')} className="px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100">
                   Управление Провайдерами
                 </Command.Item>
                 <Command.Item onSelect={() => onSelectHit('/admin/settings?tab=team')} className="px-3 py-2 rounded-lg cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100">
                   Добавить сотрудника
                 </Command.Item>
               </Command.Group>
            )}
          </Command.List>
        </Command>
        
        <div className="bg-slate-50 border-t border-slate-100 p-2 px-4 flex justify-between text-[10px] text-slate-400">
           <span>Используйте стрелки для навигации ↓ ↑</span>
           <span><code>Enter</code> чтобы открыть, <code>Esc</code> чтобы закрыть</span>
        </div>
      </div>
    </div>
  );
}
