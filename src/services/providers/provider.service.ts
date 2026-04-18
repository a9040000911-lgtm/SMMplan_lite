import { Provider } from '@prisma/client';
import { IProvider } from './base-provider';
import { VexboostProvider } from './vexboost.provider';
import { db } from '@/lib/db';

import { MockProvider } from './mock.provider';
import { SettingsManager } from '@/lib/settings';
import { UniversalProvider } from './universal.provider';
import { CryptoService } from '@/lib/crypto';

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

    // Decrypt the API Key before passing it to the provider
    const decryptedConfig = { ...config, apiKey: CryptoService.decrypt(config.apiKey) };

    // In smmplan it uses the URL or Name to decide. We will use Name for simplicity.
    if (decryptedConfig.name.toLowerCase().includes('vexboost')) {
      return new VexboostProvider(decryptedConfig);
    }
    
    // Fallback to Universal Provider for all generic panels (PerfectPanel, JAP, etc.)
    return new UniversalProvider(decryptedConfig);
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
