import { Provider } from '@prisma/client';
import { IProvider } from './base-provider';
import { ProviderServiceData, ProviderOrderResult, ProviderStatusResult } from '@/types/providers';

export class VexboostProvider implements IProvider {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(config: Provider) {
    if (!config.apiUrl.startsWith('http')) {
      throw new Error(`Invalid API URL for VexboostProvider: ${config.apiUrl}`);
    }
    this.apiKey = config.apiKey;
    this.apiUrl = config.apiUrl;
  }

  private buildUrl(params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    searchParams.append('key', this.apiKey);
    for (const [key, value] of Object.entries(params)) {
      searchParams.append(key, value);
    }
    return `${this.apiUrl}?${searchParams.toString()}`;
  }

  private async safeFetch(url: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    options.signal = controller.signal;
    options.cache = 'no-store';

    try {
      const response = await fetch(url, options);
      clearTimeout(timeoutId);
      return await response.json();
    } catch (e: any) {
      clearTimeout(timeoutId);
      if (e.name === 'AbortError') {
        throw new Error('Provider connection timeout (10s)');
      }
      throw new Error(`Provider Request Failed: ${e.message}`);
    }
  }

  async getServices(): Promise<ProviderServiceData[]> {
    const url = this.buildUrl({ action: 'services' });
    const data = await this.safeFetch(url);

    let services = data;
    if (data && data.value && Array.isArray(data.value)) {
      services = data.value;
    }

    if (!Array.isArray(services)) {
      throw new Error('Invalid services data received from VexBoost');
    }

    return services;
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
    const url = this.buildUrl({ action: 'balance' });
    const data = await this.safeFetch(url);
    return {
      balance: Math.round(parseFloat(data.balance) * 100), // Converted to Cents/Kopecks
      currency: data.currency
    };
  }

  async createOrder(serviceId: number | string, link: string, quantity: number, runs?: number, interval?: number): Promise<ProviderOrderResult> {
    try {
      const searchParams = new URLSearchParams();
      searchParams.append('key', this.apiKey);
      searchParams.append('action', 'add');
      searchParams.append('service', serviceId.toString());
      searchParams.append('link', link);
      searchParams.append('quantity', quantity.toString());

      if (runs && interval) {
        searchParams.append('runs', runs.toString());
        searchParams.append('interval', interval.toString());
      }

      const data = await this.safeFetch(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: searchParams.toString(),
      });

      if (data && data.order) {
        return {
          success: true,
          externalId: data.order.toString(),
          providerName: 'VexBoost',
          rawData: data
        };
      } else {
        return {
          success: false,
          error: data?.error || 'Unknown error from VexBoost API',
          rawData: data
        };
      }
    } catch (error: any) {
      console.error('Error creating VexBoost order:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getStatus(externalId: string): Promise<ProviderStatusResult> {
    const url = this.buildUrl({ action: 'status', order: externalId });
    const data = await this.safeFetch(url);
    
    return {
      status: data.status,
      remains: parseInt(data.remains || '0', 10),
      cost: Math.round(parseFloat(data.charge || '0') * 100), // Converted to Cents/Kopecks
      error: data.error
    };
  }

  async getStatuses(externalIds: string[]): Promise<Record<string, ProviderStatusResult>> {
    const url = this.buildUrl({ action: 'status', orders: externalIds.join(',') });
    const data = await this.safeFetch(url);

    const results: Record<string, ProviderStatusResult> = {};

    for (const [id, orderData] of Object.entries(data)) {
      if (typeof orderData === 'string') {
        results[id] = { status: 'CANCELED', remains: 0, error: orderData };
      } else {
        const d = orderData as any;
        results[id] = {
          status: d.status,
          remains: parseInt(d.remains || '0', 10),
          cost: Math.round(parseFloat(d.charge || '0') * 100), // Converted to Cents/Kopecks
          error: d.error
        };
      }
    }

    return results;
  }

  async cancelOrder(externalId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = this.buildUrl({ action: 'cancel', order: externalId });
      const data = await this.safeFetch(url);

      if (data && !data.error) {
        return { success: true };
      } else {
        return { success: false, error: data?.error || 'Cancellation failed' };
      }
    } catch(e: any) {
      return { success: false, error: e.message };
    }
  }

  async refillOrder(externalId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const url = this.buildUrl({ action: 'refill', order: externalId });
      const data = await this.safeFetch(url);
      
      if (data && data.refill) {
        return { success: true };
      }
      return { success: false, error: data?.error || 'Refill failed or not supported' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

