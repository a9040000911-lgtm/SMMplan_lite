'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { MoreVertical, CheckCircle, Clock, FileText, RefreshCw } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { changeTicketStatus } from '@/actions/support/ticket';
import TemplateManagerModal, { Template } from './TemplateManagerModal';
import ManualRefillModal from './ManualRefillModal';

export default function TicketActionsDropdown({ 
  ticketId, 
  currentStatus,
  templates,
  supportLimitCents
}: { 
  ticketId: string; 
  currentStatus: string;
  templates: Template[];
  supportLimitCents?: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isRefillModalOpen, setIsRefillModalOpen] = useState(false);

  const handleStatusChange = (status: 'OPEN' | 'PENDING' | 'CLOSED') => {
    if (status === currentStatus) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set('ticketId', ticketId);
      fd.set('status', status);
      await changeTicketStatus(fd);
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger 
          disabled={isPending}
          className="h-9 px-3 inline-flex items-center justify-center gap-2 shadow-sm rounded-xl border border-slate-200 bg-white hover:border-indigo-200 hover:bg-indigo-50 text-sm font-medium transition-colors outline-none disabled:opacity-50 disabled:pointer-events-none"
        >
          <span className="hidden lg:inline font-medium text-slate-600">Действия</span>
          <MoreVertical className="w-4 h-4 text-slate-400" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl border-slate-100 shadow-xl p-1">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="text-[10px] uppercase text-slate-400 font-bold px-2 py-1.5 flex items-center gap-2">
              Сменить статус
              {isPending && <RefreshCw className="w-3 h-3 animate-spin"/>}
            </DropdownMenuLabel>
            
            <DropdownMenuItem 
              className={`cursor-pointer rounded-lg mb-1 flex items-center gap-2 ${currentStatus === 'OPEN' ? 'bg-slate-50 font-bold' : ''}`}
              onClick={() => handleStatusChange('OPEN')}
            >
              <RefreshCw className="w-4 h-4 text-rose-500" />
              В работу (Открыт)
            </DropdownMenuItem>

            <DropdownMenuItem 
              className={`cursor-pointer rounded-lg mb-1 flex items-center gap-2 ${currentStatus === 'PENDING' ? 'bg-slate-50 font-bold' : ''}`}
              onClick={() => handleStatusChange('PENDING')}
            >
              <Clock className="w-4 h-4 text-amber-500" />
              В ожидании (Ответ дан)
            </DropdownMenuItem>

            <DropdownMenuItem 
              className={`cursor-pointer rounded-lg mb-1 flex items-center gap-2 ${currentStatus === 'CLOSED' ? 'bg-slate-50 font-bold' : ''}`}
              onClick={() => handleStatusChange('CLOSED')}
            >
              <CheckCircle className="w-4 h-4 text-slate-500" />
              Закрыть тикет
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator className="my-1 bg-slate-100" />
          
          <DropdownMenuItem 
            className="cursor-pointer rounded-lg flex items-center gap-2 hover:bg-rose-50 hover:text-rose-700 font-medium mb-1"
            onClick={() => setIsRefillModalOpen(true)}
          >
            <RefreshCw className="w-4 h-4 text-rose-500" />
            Оформить рученой докрут
          </DropdownMenuItem>

          <DropdownMenuItem 
            className="cursor-pointer rounded-lg flex items-center gap-2 hover:bg-indigo-50 hover:text-indigo-700"
            onClick={() => setIsTemplateModalOpen(true)}
          >
            <FileText className="w-4 h-4" />
            Управление шаблонами
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TemplateManagerModal 
        open={isTemplateModalOpen} 
        onClose={() => setIsTemplateModalOpen(false)} 
        templates={templates}
      />
      
      <ManualRefillModal
        open={isRefillModalOpen}
        onClose={() => setIsRefillModalOpen(false)}
        ticketId={ticketId}
        supportLimitCents={supportLimitCents}
      />
    </>
  );
}
