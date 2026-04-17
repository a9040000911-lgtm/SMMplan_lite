'use client';

import { useState } from 'react';
import { generateApiKey, revokeApiKey } from '@/actions/auth/api-key';

export default function ApiKeyManager({ currentKey }: { currentKey: string | null }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (currentKey && !confirm('Сгенерировать новый ключ? Старый перестанет работать!')) {
      return;
    }
    setLoading(true);
    setError('');
    
    const res = await generateApiKey();
    if (!res.success) {
      setError(res.error || 'Ошибка');
    }
    setLoading(false);
  };

  const handleRevoke = async () => {
    if (!confirm('Вы уверены? Ваш API ключ будет удален и доступ по API закроется.')) {
      return;
    }
    setLoading(true);
    setError('');
    
    const res = await revokeApiKey();
    if (!res.success) {
      setError(res.error || 'Ошибка');
    }
    setLoading(false);
  };

  const copyToClipboard = () => {
    if (!currentKey) return;
    navigator.clipboard.writeText(currentKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
      
      {currentKey ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ваш текущий API-ключ:
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 block px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-mono text-sm break-all">
                {currentKey}
              </code>
              <button
                onClick={copyToClipboard}
                className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm transition-colors"
              >
                {copied ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
            <p className="mt-2 text-xs text-red-500">
              Никому не передавайте этот ключ. Он дает доступ к балансу вашего аккаунта.
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="text-sm px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium text-slate-700 disabled:opacity-50 transition-colors"
            >
              Сменить ключ
            </button>
            <button
              onClick={handleRevoke}
              disabled={loading}
              className="text-sm px-4 py-2 border border-red-200 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium disabled:opacity-50 transition-colors"
            >
              Удалить ключ
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-slate-500 mb-4 text-sm">У вас пока нет активного API-ключа.</p>
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 transition-colors shadow-sm"
          >
            Сгенерировать ключ
          </button>
        </div>
      )}
    </div>
  );
}
