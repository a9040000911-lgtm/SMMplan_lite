import { Provider } from '@prisma/client';
import { ProviderServiceData, ProviderOrderResult, ProviderStatusResult } from '@/types/providers';

/**
 * Base Interface for all SMM Providers
 */
export interface IProvider {
  /**
   * Returns list of available services
   */
  getServices(): Promise<ProviderServiceData[]>;

  /**
   * Returns account balance on provider side
   */
  getBalance(): Promise<{ balance: number; currency: string }>;

  /**
   * Creates a new order
   * @param serviceId Provider's internal service ID
   * @param link Target link
   * @param quantity Amount of metrics to deliver
   * @param runs Number of runs (for drip-feed)
   * @param interval Interval in minutes (for drip-feed)
   */
  createOrder(serviceId: number | string, link: string, quantity: number, runs?: number, interval?: number): Promise<ProviderOrderResult>;

  /**
   * Retrieves current status for a single order
   * @param externalId External order ID
   */
  getStatus(externalId: string): Promise<ProviderStatusResult>;

  /**
   * Retrieves statuses for multiple orders in bulk
   * @param externalIds Array of external order IDs
   */
  getStatuses(externalIds: string[]): Promise<Record<string, ProviderStatusResult>>;

  /**
   * Cancels an order if provider supports it
   * @param externalId External order ID
   */
  cancelOrder(externalId: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Requests refill (warranty drop recovery) if provider supports it
   * @param externalId External order ID
   */
  refillOrder(externalId: string): Promise<{ success: boolean; error?: string }>;
}
