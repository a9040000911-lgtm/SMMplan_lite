import { Provider } from '@prisma/client';
import { IProvider } from './base-provider';
import { ProviderServiceData, ProviderOrderResult, ProviderStatusResult } from '@/types/providers';

export class MockProvider implements IProvider {
  private simulateDelay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getServices(): Promise<ProviderServiceData[]> {
    await this.simulateDelay(800);
    return [
      {
        service: '1001',
        name: 'TEST: Instagram Likes [Instant, Fast]',
        type: 'Default',
        category: 'Instagram / Likes',
        rate: '0.05',
        min: '100',
        max: '10000',
        refill: true,
        cancel: false
      },
      {
        service: '1002',
        name: 'TEST: Telegram Views [Last 5 Posts]',
        type: 'Default',
        category: 'Telegram / Views',
        rate: '0.01',
        min: '100',
        max: '50000',
        refill: false,
        cancel: true
      }
    ];
  }

  async createOrder(
    serviceId: string | number,
    link: string,
    quantity: number,
    runs?: number,
    interval?: number
  ): Promise<ProviderOrderResult> {
    await this.simulateDelay(500);

    if (!link.includes("http")) {
       return { success: false, error: "Mock Provider: Invalid Link Format (missing http)" };
    }

    const mockExternalId = `MOCK_${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      success: true,
      externalId: mockExternalId,
      providerName: 'MockProvider'
    };
  }

  async getStatus(externalId: string): Promise<ProviderStatusResult> {
    await this.simulateDelay(300);

    if (!externalId.startsWith("MOCK_")) {
        return { status: "Canceled", remains: 0, error: "Invalid API Order ID for Mock Provider" };
    }

    // Since we don't have created_at mapped directly inside getStatus normally, we just simulate Random
    const randomSeed = parseInt(externalId.replace('MOCK_', ''));
    if (randomSeed % 3 === 0) {
       return { status: "Pending", remains: 100 };
    } else if (randomSeed % 3 === 1) {
       return { status: "In progress", remains: 50 };
    } else {
       return { status: "Completed", remains: 0 };
    }
  }

  async getStatuses(externalIds: string[]): Promise<Record<string, ProviderStatusResult>> {
     const results: Record<string, ProviderStatusResult> = {};
     for (const id of externalIds) {
         results[id] = await this.getStatus(id);
     }
     return results;
  }

  async getBalance(): Promise<{ balance: number; currency: string }> {
     await this.simulateDelay(200);
     return { balance: 9999.99, currency: 'USD' };
  }

  async cancelOrder(externalId: string): Promise<{ success: boolean; error?: string }> {
     await this.simulateDelay(200);
     return { success: true };
  }

  async refillOrder(externalId: string): Promise<{ success: boolean; error?: string }> {
     await this.simulateDelay(200);
     return { success: true };
  }
}
