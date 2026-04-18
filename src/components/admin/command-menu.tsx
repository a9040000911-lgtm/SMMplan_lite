'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Home,
  Users,
  ShoppingCart,
  Settings,
  CreditCard,
  Ticket,
  Link as LinkIcon,
  Search,
  Gift,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    []
  );

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-[0.5rem] bg-slate-900 text-sm text-slate-400 sm:pr-12 md:w-full hover:bg-slate-800 hover:text-white border-slate-700 mx-4 hidden md:flex mb-4"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="inline-flex">Поиск...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex text-slate-400">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Поиск (Cmd+K)..." />
        <CommandList>
          <CommandEmpty>Нет результатов.</CommandEmpty>
          
          <CommandGroup heading="Навигация">
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/dashboard'))}>
              <Home className="mr-2 h-4 w-4" />
              <span>Дашборд</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/clients'))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Клиенты</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/orders'))}>
              <ShoppingCart className="mr-2 h-4 w-4" />
              <span>Заказы</span>
            </CommandItem>
          </CommandGroup>
          
          <CommandSeparator />
          
          <CommandGroup heading="Модули">
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/finance'))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Финансы</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/tickets'))}>
              <Ticket className="mr-2 h-4 w-4" />
              <span>Тикеты</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/marketing'))}>
              <Gift className="mr-2 h-4 w-4" />
              <span>Маркетинг</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/providers'))}>
              <LinkIcon className="mr-2 h-4 w-4" />
              <span>Провайдеры</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Система">
            <CommandItem onSelect={() => runCommand(() => router.push('/admin/settings'))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Настройки</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
