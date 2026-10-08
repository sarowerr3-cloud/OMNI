// Shared TypeScript interfaces for OMNI Sourcing System

export interface SourcedProductResult {
  product: {
    platform: string;
    title_original: string;
    title_en?: string;
    price: number;
    currency: string;
    price_bdt?: number;
    moq: number;
    url?: string;
    images?: string[];
    videos?: string[];
    specs?: Record<string, string>;
    seller_name?: string;
    seller_rating?: number;
    weight_kg?: number;
    dimensions?: string;
  };
  cost_breakdown: {
    item_price_bdt: number;
    domestic_china_shipping_bdt: number;
    agent_fee_bdt: number;
    international_freight_bdt: number;
    duty_vat_bdt: number;
    payment_fee_bdt: number;
    total_landed_cost: number;
    per_unit_landed_cost: number;
  };
  market_analysis: {
    per_unit_landed_cost: number;
    local_bd_market_avg_price: number;
    local_bd_market_min_price: number;
    local_bd_market_max_price: number;
    estimated_net_profit: number;
    gross_margin_percent: number;
    roi_percent: number;
    break_even_quantity: number;
  };
  claude_insight?: {
    claude_model?: string;
    market_positioning?: string;
    commercial_viability?: string;
    risk_factors?: string[];
    recommended_pricing_strategy?: string;
    recommended_channels?: string[];
    sourcing_tip?: string;
  };
}

export interface LocalMarketBenchmark {
  platform: string;
  seller_or_store: string;
  price_bdt: number;
  listing_url?: string;
  source_type: string;
  notes?: string;
}

export interface SearchResults {
  query: string;
  rate_rmb_bdt: number;
  image_analysis?: any;
  sourcing_results: SourcedProductResult[];
  bd_market_benchmarks: LocalMarketBenchmark[];
}

export interface CardOverride {
  rmbRate: string;
  qty: number;
  weight: string;
  shipping: 'air' | 'sea';
  selectedImgIdx: number;
  showVideo: boolean;
  showSpecs: boolean;
}

export interface SearchHistoryItem {
  query: string;
  mode: 'text' | 'image';
  timestamp: number;
  resultCount: number;
}
