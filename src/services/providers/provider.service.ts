import { Provider } from '@prisma/client';
import { IProvider } from './base-provider';
import { VexboostProvider } from './vexboost.provider';
import { db } from '@/lib/db';

import { MockProvider } from './mock.provider';
import { SettingsManager } from '@/lib/settings';

export class ProviderService {
  /**
   * Retrieves all active providers from DB
   */
  async getActiveProviders(): Promise<Provider[]> {
    return db.provider.findMany({ where: { isActive: true } });
  }

  /**
   * Main Factory Method
   * Returns instance of IProvider based on provider config
   */
  async getProviderInstance(config: Provider): Promise<IProvider> {
    const isTest = await SettingsManager.isTestMode();
    if (isTest) {
      return new MockProvider();
    }

    // In smmplan it uses the URL or Name to decide. We will use Name for simplicity.
    if (config.name.toLowerCase().includes('vexboost')) {
      return new VexboostProvider(config);
    }
    
    // Future integrations (e.g. JustAnotherPanelProvider) will go here
    throw new Error(`Unsupported provider: ${config.name}`);
  }

  /**
   * Auto-resolves the default provider (for Smmplan Lite, we usually have one)
   */
  async getDefaultProvider(): Promise<IProvider> {
    const provider = await db.provider.findFirst({
      where: { isActive: true }
    });
    
    if (!provider) {
      throw new Error('No active providers found in the database. Please add one (e.g., Vexboost).');
    }

    return await this.getProviderInstance(provider);
  }
}

// Singleton export
export const providerService = new ProviderService();
