export interface ProviderServiceData {
  service: string;
  name: string;
  type: string;
  category: string;
  rate: string;
  min: string;
  max: string;
  refill: boolean;
  cancel: boolean;
  dripfeed?: boolean;
}

export interface ProviderOrderResult {
  success: boolean;
  externalId?: string;
  error?: string;
  providerName?: string;
  rawData?: any;
}

export interface ProviderStatusResult {
  status: string; // "Pending", "In progress", "Completed", "Partial", "Canceled"
  remains: number; // For partial/canceled
  cost?: number; // Cost evaluated by provider
  error?: string;
}
