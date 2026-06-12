import React from 'react';
import { Sparkles, ShoppingBag, BarChart3, TrendingUp, Compass } from 'lucide-react';

interface Suggestion {
  id: string;
  category: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
}

const CUSTOM_SUGGESTIONS: Suggestion[] = [
  {
    id: 'saas',
    category: 'SaaS Platform',
    label: 'SaaS Business Metrics',
    description: 'Track MRR growth, user churn rate, and Customer Acquisition Cost (CAC) over several months.',
    icon: Compass,
    prompt: 'SaaS Enterprise Executive Dashboard showing monthly recurring revenue (MRR), subscriber acquisition trends, average revenue per user (ARPU), cost of acquisition (CAC) and customer churn rate. Categorize clients into SMB, Mid-market, and Enterprise sectors. Include a date filter.'
  },
  {
    id: 'ecommerce',
    category: 'E-Commerce',
    label: 'E-commerce Conversion Insights',
    description: 'Analyze online storefront transactions, average cart values, conversion funnel drop-offs, and product categories.',
    icon: ShoppingBag,
    prompt: 'E-Commerce Storefront Analytics displaying Daily Sales volume, conversion funnel stages (View, Add-to-Cart, Checkout, Completed Purchase), average order value (AOV) by Category (Electronics, Fashion, Home, Beauty), and top revenue sources. Include a category select filter.'
  },
  {
    id: 'marketing',
    category: 'Paid Acquisition',
    label: 'Digital Ad Campaigns Performance',
    description: 'Visualize ROI, impressions click CTR, and CPA distribution curves relative to platforms (Google, Meta, TikTok).',
    icon: BarChart3,
    prompt: 'Acquisition Marketing Multi-Channel Performance Dashboard tracking click-through rate (CTR), cost per click (CPC), overall ad spend, conversions count, and cost per acquisition (CPA) segmented by Meta Ads, Google Ads, TikTok Ads, and YouTube. Provide regional and platform Select Filters.'
  },
  {
    id: 'crypto',
    category: 'Fintech',
    label: 'Crypto Portfolio Analytics',
    description: 'Track price volatility, coin holdings distributions, token volumes, and relative correlation grids.',
    icon: TrendingUp,
    prompt: 'Crypto Portfolio Tracking and Asset Volatility board displaying overall net portfolio worth, active token holds percentage allocations (BTC, ETH, SOL, LINK, AVAX), historic price volumes, daily changes, and transaction types. Include asset select options.'
  }
];

interface SuggestionChipsProps {
  onSelected: (prompt: string) => void;
}

export const SuggestionChips: React.FC<SuggestionChipsProps> = ({ onSelected }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {CUSTOM_SUGGESTIONS.map((s) => {
        const Icon = s.icon;
        return (
          <button
            key={s.id}
            onClick={() => onSelected(s.prompt)}
            className="flex flex-col items-start text-left p-4 rounded-2xl border border-zinc-200/60 bg-white hover:border-indigo-500/60 hover:shadow-[0_4px_20px_rgba(99,102,241,0.08)] dark:bg-zinc-950 dark:border-zinc-800/80 dark:hover:border-indigo-400/60 transition-all group duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full blur-2xl group-hover:scale-125 transition-transform" />
            <div className="flex items-center gap-3.5 mb-2 relative z-10">
              <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400 group-hover:bg-indigo-100/50 dark:group-hover:bg-indigo-900/30 transition-all duration-300">
                <Icon className="h-4 sm:h-5 w-4 sm:w-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-500 tracking-wider uppercase font-mono">
                  {s.category}
                </span>
                <h4 className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {s.label}
                </h4>
              </div>
            </div>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed relative z-10 shrink-0">
              {s.description}
            </p>
          </button>
        );
      })}
    </div>
  );
};
