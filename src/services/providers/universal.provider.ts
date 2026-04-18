/**
 * (c) 2024-2026 Smmplan. All rights reserved.
 * Ported UniversalProvider using native fetch.
 */
import { Provider } from '@prisma/client';
import { IProvider } from './base-provider';
import { ProviderServiceData, ProviderOrderResult, ProviderStatusResult } from '@/types/providers';

export class UniversalProvider implements IProvider {
  private config: Provider;
  private metadata: any;

  constructor(config: Provider) {
    this.config = config;
    try {
       this.metadata = typeof config.metadata === 'string' ? JSON.parse(config.metadata) : (config.metadata || {});
    } catch {
       this.metadata = {};
    }
  }

  private async makeRequest(action: string, params: any = {}): Promise<any> {
    const method = (this.metadata.httpMethod || 'POST').toUpperCase();
    const requestType = (this.metadata.requestType || 'form').toLowerCase();

    const keyField = this.metadata.keyField || 'key';
    const actionField = this.metadata.actionField || 'action';

    const actionMap: any = this.metadata.actionMap || {};
    const finalAction = actionMap[action] || action;

    const fullParams = {
      [keyField]: this.config.apiKey,
      [actionField]: finalAction,
      ...params
    };

    const headers: Record<string, string> = { ...this.metadata.headers };
    let fetchUrl = this.config.apiUrl;
    let fetchBody: any = null;

    if (method === 'GET') {
      const searchParams = new URLSearchParams();
      Object.entries(fullParams).forEach(([k, v]) => searchParams.append(k, String(v)));
      fetchUrl += (fetchUrl.includes('?') ? '&' : '?') + searchParams.toString();
    } else {
      if (requestType === 'json') {
        fetchBody = JSON.stringify(fullParams);
        headers['Content-Type'] = 'application/json';
      } else {
        const formData = new URLSearchParams();
        Object.entries(fullParams).forEach(([k, v]) => formData.append(k, String(v)));
        fetchBody = formData.toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    console.log(`[UniversalProvider:${this.config.name}] Fetching ${fetchUrl} (Action: ${finalAction})`);

    try {
      const response = await fetch(fetchUrl, {
        method,
        body: fetchBody,
        headers,
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }

      const rawText = await response.text();
      try {
        return JSON.parse(rawText);
      } catch {
        return rawText; // Fallback for plain text responses
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
         throw new Error(`PROVIDER_NETWORK_ERROR: Timeout (60s) for ${this.config.name}`);
      }
      throw new Error(`Provider API Error: ${error.message}`);
    }
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    const data = await this.makeRequest('balance');
    let balanceVal = 0;
    
    if (typeof data === 'object' && ('balance' in data || 'amount' in data)) {
      const bstr = String(data.balance || data.amount);
      balanceVal = parseFloat(bstr);
    } else if (typeof data === 'number' || typeof data === 'string') {
      balanceVal = parseFloat(String(data));
    }

    if (isNaN(balanceVal)) {
      throw new Error(`Invalid balance format returned: ${JSON.stringify(data)}`);
    }

    const curr = (this.config as any).balanceCurrency || 'USD';
    let cents = Math.round(balanceVal * 100);
    // If provider uses RUB, they might send Kopecks or RUB based on API. Assuming float format for most panels (100.50)
    return { balance: cents, currency: curr };
  }

  async getServices(): Promise<ProviderServiceData[]> {
    const data = await this.makeRequest('services');
    let rawServices: any[] = [];
    if (Array.isArray(data)) {
        rawServices = data;
    } else if (data && data.value && Array.isArray(data.value)) {
        rawServices = data.value;
    } else if (typeof data === 'object') {
        const potentialArr = Object.values(data).find(Array.isArray);
        if (potentialArr) rawServices = potentialArr as any[];
    }

    if (!Array.isArray(rawServices)) {
         throw new Error(`Cannot parse services from provider response: ${JSON.stringify(data).substring(0, 100)}...`);
    }

    return rawServices.map(s => ({
      service: String(s.service || s.id),
      name: String(s.name || s.title || `Service ${s.service || s.id}`),
      type: String(s.type || 'default'),
      category: String(s.category || 'Other'),
      rate: String(s.rate || s.price || '0'),
      min: String(s.min || '10'),
      max: String(s.max || '100000'),
      refill: Boolean(s.refill),
      cancel: Boolean(s.cancel)
    }));
  }

  async createOrder(serviceId: number | string, link: string, quantity: number, runs?: number, interval?: number): Promise<ProviderOrderResult> {
    try {
      const extra: any = {};
      if (runs && interval) {
          extra.runs = runs;
          extra.interval = interval;
      }

      const data = await this.makeRequest('add', {
        service: serviceId,
        link: link,
        quantity: quantity,
        ...extra
      });

      if (data && data.order) {
        return { success: true, externalId: String(data.order), providerName: this.config.name, rawData: data };
      }
      return { success: false, error: data?.error || 'No order ID returned', rawData: data };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async getStatus(externalId: string): Promise<ProviderStatusResult> {
    const data = await this.makeRequest('status', { order: externalId });
    if (data && data.error) {
       return { status: 'Error', remains: 0, error: String(data.error) };
    }
    return {
      status: String(data?.status || 'Unknown'),
      remains: parseInt(String(data?.remains || '0'), 10),
      cost: data?.charge ? Math.round(parseFloat(String(data.charge)) * 100) : undefined,
      error: undefined
    };
  }

  async getStatuses(externalIds: string[]): Promise<Record<string, ProviderStatusResult>> {
    try {
      const data = await this.makeRequest('status', { orders: externalIds.join(',') });
      const results: Record<string, ProviderStatusResult> = {};

      for (const [id, orderData] of Object.entries(data || {})) {
        if (typeof orderData === 'string') {
          results[id] = { status: 'CANCELED', remains: 0, error: orderData };
        } else {
          const d = orderData as any;
          results[id] = {
            status: String(d.status || 'Unknown'),
            remains: parseInt(String(d.remains || '0'), 10),
            cost: d.charge ? Math.round(parseFloat(String(d.charge)) * 100) : undefined,
            error: d.error
          };
        }
      }
      return results;
    } catch (e: any) {
      console.error(`[UniversalProvider] Bulk status error:`, e.message);
      return {};
    }
  }

  async cancelOrder(externalId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await this.makeRequest('cancel', { orders: externalId });
      
      if (typeof data === 'string' && data.toLowerCase().includes('incorrect')) {
         return { success: false, error: 'Provider returned Incorrect Request' };
      }

      const orderResult = Array.isArray(data) ? data.find((d: any) => d.order == externalId) : (data?.[externalId] || data);
      
      if (orderResult && (orderResult.cancel === 'Pending' || typeof orderResult === 'string')) {
         return { success: true };
      }

      if (data?.error || orderResult?.error) {
         return { success: false, error: String(data?.error || orderResult?.error) };
      }

      return { success: true }; // Optimistic
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  async refillOrder(externalId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await this.makeRequest('refill', { order: externalId });
      
      if (typeof data === 'string' && data.toLowerCase().includes('incorrect')) {
         return { success: false, error: 'Provider returned Incorrect Request' };
      }

      const orderResult = Array.isArray(data) ? data.find((d: any) => d.order == externalId) : data;
      if (orderResult && orderResult.refill) {
         return { success: true };
      }

      if (data?.error) {
         return { success: false, error: String(data.error) };
      }

      return { success: true }; // Optimistic fallback if no explicit error
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }
}
