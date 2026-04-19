'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { DataTable } from '@/components/ui/data-table';
import { columns, OrderColumn } from './columns';
import { Button, Chip, Drawer, Input } from '@heroui/react';
import { RefreshCw, XCircle, X } from 'lucide-react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

interface OrderClientProps {
  data: OrderColumn[];
}

export function OrderClient({ data }: OrderClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const editOrderId = searchParams.get('edit_order_id');

  const selectedOrder = React.useMemo(
    () => data.find((o) => o.id === editOrderId) || null,
    [data, editOrderId]
  );

  const closeDrawer = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('edit_order_id');
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleBulkAction = (action: 'cancel' | 'restart', selectedRows: any[]) => {
    toast.info(`В реальной системе здесь будет запущен батч ${action} для ${selectedRows.length} заказов.`);
    // Here we'd call a Server Action: bulkActionOrders(action, rowIds)
  };

  return (
    <div className="relative">
      <DataTable 
        columns={columns} 
        data={data} 
        searchKey="user_email" 
        searchPlaceholder="Фильтр по email на этой странице..." 
        renderToolbar={(table) => {
          const selectedRows = table.getFilteredSelectedRowModel().rows;
          if (selectedRows.length === 0) return null;

          return (
            <div className="fixed bottom-6 inset-x-0 mx-auto w-max max-w-[90vw] z-50 animate-in slide-in-from-bottom-10 fade-in flex items-center gap-4 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl border border-slate-700">
              <div className="flex items-center gap-2 border-r border-slate-700 pr-4">
                <Chip size="sm" className="bg-slate-800 text-white hover:bg-slate-800 font-bold px-2">
                  {selectedRows.length}
                </Chip>
                <span className="text-sm font-medium">выбрано</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="bg-transparent hover:bg-slate-800 text-slate-300 ml-2"
                  onPress={() => handleBulkAction('cancel', selectedRows)}
                >
                  <XCircle className="w-4 h-4 mr-2 text-red-400" />
                  Отменить
                </Button>
                
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="bg-transparent hover:bg-slate-800 text-slate-400 ml-2"
                  onPress={() => table.toggleAllPageRowsSelected(false)}
                >
                  Сбросить
                </Button>
              </div>
            </div>
          );
        }}
      />

      {/* Modern HeroUI Drawer */}
      <Drawer>
        <Drawer.Backdrop isOpen={!!selectedOrder} onOpenChange={(open) => !open && closeDrawer()}>
          <Drawer.Content placement="right" className="sm:max-w-2xl bg-slate-50 p-0 overflow-y-auto w-full">
            <Drawer.Dialog className="m-0 p-0 h-full w-full rounded-none">
              <Drawer.CloseTrigger className="absolute right-4 top-4 z-50 rounded-full bg-slate-100 p-2 hover:bg-slate-200 cursor-pointer text-slate-500 transition-colors">
                <X className="w-5 h-5" />
              </Drawer.CloseTrigger>

              {selectedOrder && (
                <div className="flex flex-col h-full relative">
                  {/* Header */}
                  <Drawer.Header className="px-6 py-5 border-b border-slate-200 bg-white">
                    <Drawer.Heading className="text-2xl font-bold flex items-center gap-2">
                      Заказ <span className="text-slate-400 font-medium">#{selectedOrder.numericId}</span>
                    </Drawer.Heading>
                  </Drawer.Header>

                  {/* Body */}
                  <Drawer.Body className="p-6 space-y-8 flex-1 overflow-visible">
                    {/* Info Block */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                      
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-slate-700">ID Заказа</label>
                          <Input 
                            readOnly 
                            defaultValue={selectedOrder.numericId.toString()} 
                          />
                        </div>
                        <div className="flex flex-col gap-1.5 mt-1">
                          <span className="text-sm font-medium text-slate-700">Пользователь</span>
                          <a href={`mailto:${selectedOrder.user.email}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium underline transition-colors">
                            {selectedOrder.user.email}
                          </a>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 text-sm">
                        <div className="flex justify-between items-center"><span className="text-slate-500">Соцсеть: </span><span className="font-semibold text-slate-800">{selectedOrder.service.category.network?.name || 'Без сети'}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500">Категория: </span><span className="font-semibold text-slate-800">{selectedOrder.service.category.name}</span></div>
                        <div className="flex justify-between items-center"><span className="text-slate-500">Тариф: </span><span className="font-semibold text-indigo-600">{selectedOrder.service.name}</span></div>
                        <div className="flex flex-col gap-1 mt-2">
                          <span className="text-slate-500">Ссылка: </span>
                          <a href={selectedOrder.link} className="text-indigo-600 hover:underline break-all block bg-slate-50 p-2 rounded-md font-mono text-xs">{selectedOrder.link}</a>
                        </div>
                        <div className="flex justify-between items-center mt-2"><span className="text-slate-500">Заказано кол-во: </span><span className="font-bold text-slate-900">{selectedOrder.quantity.toLocaleString('ru-RU')}</span></div>
                      </div>
                    </div>

                    {/* Edit Form */}
                    <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800">Параметры выполнения</h3>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Текущий статус</label>
                        <select 
                          className="flex h-10 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                          defaultValue={selectedOrder.status}
                        >
                          <option value="AWAITING_PAYMENT">Не оплачен</option>
                          <option value="PENDING">В очереди</option>
                          <option value="IN_PROGRESS">В работе</option>
                          <option value="COMPLETED">Выполнен</option>
                          <option value="CANCELED">Отменён</option>
                          <option value="ERROR">Ошибка</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-slate-700">Целевая ссылка</label>
                        <Input defaultValue={selectedOrder.link} />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-slate-700">Цена, ₽</label>
                          <Input type="number" defaultValue={(selectedOrder.charge / 100).toFixed(2)} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-slate-700">Осталось (Remains)</label>
                          <Input type="number" defaultValue={selectedOrder.remains.toString()} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-slate-700">Drip-feed интервал (мин)</label>
                          <Input type="number" defaultValue={selectedOrder.interval?.toString() || ''} placeholder="Отключено" />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-medium text-slate-700">Drip-feed запуски</label>
                          <Input type="number" defaultValue={selectedOrder.runs?.toString() || ''} placeholder="Отключено" />
                        </div>
                      </div>

                      <Button fullWidth variant="primary" className="mt-2 font-medium" onPress={() => toast.success('Параметры заказа сохранены (Demo)')}>
                        Сохранить изменения
                      </Button>
                    </div>

                    {/* Transactions Skeletal Section */}
                    <div className="bg-slate-50 -mx-6 p-6 border-t border-slate-200">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">История транзакций</h3>
                      <div className="text-sm text-slate-400 bg-white p-6 rounded-xl border border-slate-200 text-center flex flex-col items-center gap-2">
                        <span className="text-2xl">📭</span>
                        Транзакции не найдены
                      </div>
                    </div>
                  </Drawer.Body>
                </div>
              )}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>
    </div>
  );
}
