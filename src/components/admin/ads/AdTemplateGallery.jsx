import { Sparkles, Zap, Trophy, Megaphone, Activity, Play, Search, Tag, MessageCircle, ArrowRight } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';

import toast from '../../../utils/toast';
import { adsAPI } from '../../../api/ads';

const DEFAULT_TEMPLATES = [
  {
    name: '🔥 Flash Sale',
    description: 'Urgency-driven. Limited time offer with countdown feel.',
    platform: 'INSTAGRAM',
    objective: 'Sales & Conversions',
    tone: 'urgent',
    icon: Zap,
    gradient: 'from-red-500 to-orange-500',
    headlineSample: '⚡ FLASH SALE: 50% OFF!',
    copySample: 'Limited stock! Grab your favorites before they\'re gone. Free shipping on orders above ₹999.',
    ctaSample: 'SHOP NOW',
    bestFor: 'Clearing inventory, seasonal sales, discount events',
  },
  {
    name: '✨ New Arrivals',
    description: 'Showcase your newest products with style and enthusiasm.',
    platform: 'FACEBOOK',
    objective: 'Brand Awareness',
    tone: 'luxury',
    icon: Sparkles,
    gradient: 'from-purple-500 to-pink-500',
    headlineSample: '✨ Just Landed — Shop the New Collection',
    copySample: 'Fresh off the runway. Our latest drop is here with premium quality you\'ll love.',
    ctaSample: 'EXPLORE NEW',
    bestFor: 'Product launches, seasonal collections, brand refreshes',
  },
  {
    name: '🏆 Best Sellers',
    description: 'Social proof-driven. Highlight top-rated products.',
    platform: 'GOOGLE',
    objective: 'Traffic & Sales',
    tone: 'professional',
    icon: Crown,
    gradient: 'from-amber-500 to-yellow-500',
    headlineSample: 'Best Sellers | Top Rated Products',
    copySample: 'See what everyone is loving! Our most popular picks with verified 5-star reviews.',
    ctaSample: 'SHOP BESTSELLERS',
    bestFor: 'Top products, high-margin items, customer favorites',
  },
  {
    name: '🎯 Seasonal Promo',
    description: 'Festive/holiday themed campaign for special occasions.',
    platform: 'INSTAGRAM',
    objective: 'Engagement',
    tone: 'friendly',
    icon: Tag,
    gradient: 'from-green-500 to-teal-500',
    headlineSample: '🎉 Festive Special — Extra 20% Off!',
    copySample: 'Celebrate the season with us! Exclusive discounts on your favorite styles.',
    ctaSample: 'GRAB THE DEAL',
    bestFor: 'Festivals, holidays, special occasions, celebrations',
  },
  {
    name: '📣 Brand Awareness',
    description: 'Build brand recognition and tell your story.',
    platform: 'FACEBOOK',
    objective: 'Reach & Awareness',
    tone: 'professional',
    icon: Megaphone,
    gradient: 'from-blue-500 to-indigo-500',
    headlineSample: 'Discover Premium Quality | Brand Name',
    copySample: 'We craft products that stand the test of time. Join thousands of happy customers today.',
    ctaSample: 'LEARN MORE',
    bestFor: 'New brands, rebranding, market expansion',
  },
  {
    name: '💬 WhatsApp Broadcast',
    description: 'Direct promotional broadcast to your subscribers.',
    platform: 'WHATSAPP',
    objective: 'Direct Messaging',
    tone: 'friendly',
    icon: MessageCircle,
    gradient: 'from-green-500 to-emerald-500',
    headlineSample: 'Hey! Exclusive offer just for you 🎉',
    copySample: 'As a valued subscriber, enjoy an extra 15% off your next order. Use code: WELCOME15',
    ctaSample: 'SHOP NOW',
    bestFor: 'Subscriber engagement, repeat purchases, loyalty rewards',
  },
  {
    name: '🆕 Product Launch',
    description: 'Big reveal for a new product with maximum impact.',
    platform: 'INSTAGRAM',
    objective: 'Awareness & Sales',
    tone: 'luxury',
    icon: Sparkles,
    gradient: 'from-indigo-500 to-purple-600',
    headlineSample: 'Introducing: [Product Name] — Redefined.',
    copySample: 'After months of perfecting, we\'re thrilled to unveil our latest innovation. Limited first-batch available.',
    ctaSample: 'PRE-ORDER NOW',
    bestFor: 'New product launches, pre-orders, exclusive drops',
  },
  {
    name: '📢 Retargeting',
    description: 'Re-engage visitors who didn\'t complete purchase.',
    platform: 'FACEBOOK',
    objective: 'Conversions',
    tone: 'urgent',
    icon: Target,
    gradient: 'from-rose-500 to-red-600',
    headlineSample: 'Still Thinking? It\'s Waiting For You!',
    copySample: 'You left something behind! Complete your purchase now and get free shipping.',
    ctaSample: 'COMPLETE ORDER',
    bestFor: 'Cart abandoners, window shoppers, past visitors',
  },
];

export default function AdTemplateGallery({ onApplyTemplate }) {
  const [search, setSearch] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState('ALL');
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [apiTemplates, setApiTemplates] = useState(null);
  // Try to load from backend API, fall back to defaults
  useEffect(() => {
    let mounted = true;
    adsAPI.getAdTemplates()
      .then(r => { if (mounted) setApiTemplates(r.data?.data || r.data); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const templates = apiTemplates || DEFAULT_TEMPLATES;

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
      const matchPlatform = selectedPlatform === 'ALL' || t.platform === selectedPlatform;
      return matchSearch && matchPlatform;
    });
  }, [search, selectedPlatform]);

  const applyTemplate = (template) => {
    onApplyTemplate({
      name: template.headlineSample,
      platform: template.platform,
      objective: template.objective,
      tone: template.tone,
      notes: `Template: ${template.name}\nBest for: ${template.bestFor}\nDescription: ${template.description}`,
    });
    toast.success(`"${template.name}" template applied!`);
  };

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={15} />
          <input className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-brand-black"
            placeholder="Search templates..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1.5">
          {['ALL', 'INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'GOOGLE'].map(p => (
            <button key={p} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedPlatform === p ? 'bg-brand-black text-white' : 'bg-white border border-border text-text-muted hover:bg-surface'}`}
              onClick={() => setSelectedPlatform(p)}>
              {p === 'ALL' ? 'All' : p === 'INSTAGRAM' ? 'IG' : p === 'FACEBOOK' ? 'FB' : p === 'WHATSAPP' ? 'WA' : 'G/Y'}
            </button>
          ))}
        </div>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.map((template, i) => {
          const Icon = template.icon;
          const PlatformIcon = template.platform === 'INSTAGRAM' || template.platform === 'FACEBOOK' ? Target : template.platform === 'WHATSAPP' ? MessageCircle : Play;
          return (
            <div key={i} className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden hover:shadow-md transition-all group">
              {/* Header */}
              <div className={`bg-gradient-to-r ${template.gradient} p-4 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-bl-2xl" />
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
                    <Icon size={16} />
                  </div>
                  <PlatformIcon size={12} className="opacity-70" />
                </div>
                <h5 className="font-bold text-sm">{template.name}</h5>
                <p className="text-[10px] opacity-80 mt-0.5">{template.description}</p>
              </div>

              {/* Preview */}
              <div className="p-3 space-y-2">
                <div className="p-2.5 bg-gray-50 rounded-xl border border-border/50">
                  <p className="text-xs font-bold text-text-primary line-clamp-1">{template.headlineSample}</p>
                  <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{template.copySample}</p>
                  <div className="mt-1.5 px-2 py-1 bg-brand-black text-white text-[8px] font-bold rounded text-center inline-block">
                    {template.ctaSample}
                  </div>
                </div>
                <div className="text-[9px] text-text-muted flex items-center gap-2">
                  <span className="font-semibold">📈 {template.bestFor}</span>
                </div>
                <button className="w-full py-2 bg-brand-black text-white rounded-xl text-xs font-bold hover:bg-brand-black/90 transition-colors flex items-center justify-center gap-1.5 group-hover:gap-2"
                  onClick={() => applyTemplate(template)}>
                  Use Template <ArrowRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
