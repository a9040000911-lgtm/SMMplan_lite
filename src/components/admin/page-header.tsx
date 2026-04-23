import * as React from 'react';

interface AdminPageHeaderProps {
  icon?: React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
}

export function AdminPageHeader({ icon: Icon, title, description, action }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100/50 mb-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Icon className="w-6 h-6" />
            </div>
          )}
          {title}
        </h1>
        {description && (
          <div className="text-slate-500 mt-2 font-medium text-sm">
            {description}
          </div>
        )}
      </div>
      {action && (
        <div className="flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  );
}
