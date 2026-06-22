import { useState } from 'react';
import {
  Brain, Play, Search, MessageCircle, Sparkles, GitCompare, Award, Users,
  Target, Image, X, BookOpen, Building2, Diamond, Palette,
  Type, MessageSquareText, FileText, Zap, Lightbulb, Plus, Copy,
  DollarSign, ChevronDown, Activity, Link2
} from 'lucide-react';
import toast from '../../../utils/toast';

const PLATFORMS = [
  { id: 'INSTAGRAM', label: 'Instagram', icon: Target, color: 'bg-gradient-to-br from-pink-500 to-purple-600' },
  { id: 'FACEBOOK', label: 'Facebook', icon: Target, color: 'bg-blue-600' },
  { id: 'WHATSAPP', label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500' },
  { id: 'GOOGLE', label: 'Google / YouTube', icon: Play, color: 'bg-gradient-to-br from-blue-500 to-green-500' },
];

const TONE_OPTIONS = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'casual', label: 'Casual', emoji: '😊' },
  { id: 'luxury', label: 'Luxury', emoji: '💎' },
  { id: 'urgent', label: 'Urgent', emoji: '🔥' },
  { id: 'friendly', label: 'Friendly', emoji: '🤝' },
  { id: 'humorous', label: 'Humorous', emoji: '😂' },
];

const DEMO_PRODUCT = {
  name: 'Premium Black Cotton T-Shirt',
  description: 'Made from 220 GSM premium cotton. Oversized fit, reinforced stitching, pre-shrunk fabric. Features a bold graphic print on the front with a minimalist back logo. Available in sizes S-5XL. Machine washable, fade-resistant colors. Perfect for casual wear, streetwear, and everyday comfort.',
  category: { name: 'T-Shirts' },
  price: 799,
  images: [{ url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=200' }],
};

export default function AiToolsTab({
  adsAPI, setForm, setShowModal, setAiGeneratedCopy, setAiResultTab
}) {
  const [aiPlatform, setAiPlatform] = useState('FACEBOOK');
  const [aiTone, setAiTone] = useState('professional');
  const [aiBrandVoice, setAiBrandVoice] = useState('threvolt');
  const [aiGeneratedCopy, setAiGeneratedCopyLocal] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [waDemoLoading, setWaDemoLoading] = useState(false);
  const [gdDemoLoading, setGdDemoLoading] = useState(false);
  const [aiVariants, setAiVariants] = useState([]);
  const [aiVariantsLoading, setAiVariantsLoading] = useState(false);
  const [aiStrategy, setAiStrategy] = useState(null);
  const [aiStrategyLoading, setAiStrategyLoading] = useState(false);
  const [aiAudience, setAiAudience] = useState(null);
  const [aiAudienceLoading, setAiAudienceLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [aiResultTab, setAiResultTabLocal] = useState('copy');

  const updateResultTab = (tab) => {
    setAiResultTabLocal(tab);
    setAiResultTab(tab);
  };

  // Re-use parent's state-sync
  const syncGeneratedCopy = (copy) => {
    setAiGeneratedCopyLocal(copy);
    setAiGeneratedCopy(copy);
  };

  const generateAdCopy = async (useDemo = false) => {
    if (!useDemo) setShowDemo(false);
    setAiLoading(true);
    try {
      const isDemo = useDemo;
      const payload = {
        platform: isDemo ? 'INSTAGRAM' : aiPlatform,
        tone: isDemo ? 'professional' : aiTone,
        brandVoice: aiBrandVoice,
        productName: isDemo ? DEMO_PRODUCT.name : (selectedProduct?.name || undefined),
        productDescription: isDemo ? DEMO_PRODUCT.description : (selectedProduct?.description || undefined),
        productId: isDemo ? undefined : (selectedProduct?.id || undefined),
      };
      const r = await adsAPI.aiGenerateAdCopy(payload);
      syncGeneratedCopy({ ...(r.data?.data || r.data), _demo: isDemo });
      updateResultTab('copy');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'AI generation failed. Check OPENAI_API_KEY.');
    }
    setAiLoading(false);
  };

  const generateDemoAdCopy = () => {
    syncGeneratedCopy(null);
    setShowDemo(true);
    generateAdCopy(true);
  };

  const generateDemoWhatsApp = async () => {
    setWaDemoLoading(true);
    syncGeneratedCopy(null);
    setShowDemo(true);
    updateResultTab('copy');
    try {
      const r = await adsAPI.aiGenerateAdCopy({
        platform: 'WHATSAPP', tone: 'friendly', brandVoice: aiBrandVoice,
        productName: DEMO_PRODUCT.name, productDescription: DEMO_PRODUCT.description,
      });
      syncGeneratedCopy({ ...(r.data?.data || r.data), _demo: true, _platform: 'WHATSAPP' });
      toast.success('WhatsApp broadcast sample generated!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'AI generation failed. Check OPENAI_API_KEY.');
    }
    setWaDemoLoading(false);
  };

  const generateDemoGoogle = async () => {
    setGdDemoLoading(true);
    syncGeneratedCopy(null);
    setShowDemo(true);
    updateResultTab('copy');
    try {
      const r = await adsAPI.aiGenerateAdCopy({
        platform: 'GOOGLE', tone: 'professional', brandVoice: aiBrandVoice,
        productName: DEMO_PRODUCT.name, productDescription: DEMO_PRODUCT.description,
      });
      syncGeneratedCopy({ ...(r.data?.data || r.data), _demo: true, _platform: 'GOOGLE' });
      toast.success('Google Search ad sample generated!');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'AI generation failed.');
    }
    setGdDemoLoading(false);
  };

  const generateVariants = async () => {
    setShowDemo(false);
    setAiVariantsLoading(true);
    try {
      const r = await adsAPI.aiGenerateVariants({
        platform: aiPlatform, tone: aiTone, brandVoice: aiBrandVoice,
        productName: selectedProduct?.name, productDescription: selectedProduct?.description, maxVariants: 4,
      });
      const data = r.data?.data || r.data;
      setAiVariants(data?.variants || []);
      updateResultTab('variants');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to generate variants');
    }
    setAiVariantsLoading(false);
  };

  const generateStrategy = async () => {
    setShowDemo(false);
    setAiStrategyLoading(true);
    try {
      const r = await adsAPI.aiGenerateStrategy({
        platform: aiPlatform, tone: aiTone, brandVoice: aiBrandVoice,
        productName: selectedProduct?.name, productDescription: selectedProduct?.description,
        productCategory: selectedProduct?.category?.name, productPrice: selectedProduct?.price ? Number(selectedProduct.price) : undefined,
      });
      setAiStrategy(r.data?.data || r.data);
      updateResultTab('strategy');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to generate strategy');
    }
    setAiStrategyLoading(false);
  };

  const suggestAudience = async () => {
    setShowDemo(false);
    setAiAudienceLoading(true);
    try {
      const r = await adsAPI.aiSuggestAudience({
        productName: selectedProduct?.name, productDescription: selectedProduct?.description,
        platform: aiPlatform, brandVoice: aiBrandVoice,
      });
      setAiAudience(r.data?.data || r.data);
      updateResultTab('audience');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to suggest audience');
    }
    setAiAudienceLoading(false);
  };

  const applyAICopyToForm = (copy) => {
    setForm(prev => ({
      ...prev, platform: aiPlatform,
      name: copy.headline || prev.name,
      creativeUrl: prev.creativeUrl || selectedProduct?.images?.[0]?.url || '',
      landingUrl: prev.landingUrl || (selectedProduct ? `/products/${selectedProduct.slug}` : ''),
      notes: `AI Generated: ${copy.primaryText || ''}\n${copy.suggestions?.join('\n') || ''}`.trim(),
    }));
    toast.success('AI copy applied to form!');
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      {/* AI Tools Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-2">
          <Brain size={28} />
          <h3 className="text-xl font-bold font-display">AI-Powered Ad Tools</h3>
        </div>
        <p className="text-purple-200 text-sm mb-4">Generate high-converting ad copy, A/B test variants, audience insights, and full campaign strategies using ChatGPT.</p>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={generateDemoAdCopy} disabled={aiLoading || waDemoLoading || gdDemoLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-semibold transition-all border border-white/20 disabled:opacity-50">
            {aiLoading && showDemo ? <><div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Generating...</> : <><Play size={14} /> Show Me an Example</>}
          </button>
          <button onClick={generateDemoGoogle} disabled={aiLoading || waDemoLoading || gdDemoLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold transition-all border border-white/20 disabled:opacity-50">
            {gdDemoLoading ? <><div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Generating Google...</> : <><Search size={14} /> Try on Google</>}
          </button>
          <button onClick={generateDemoWhatsApp} disabled={aiLoading || waDemoLoading || gdDemoLoading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-semibold transition-all border border-white/20 disabled:opacity-50">
            {waDemoLoading ? <><div className="spinner w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Generating WhatsApp...</> : <><MessageCircle size={14} /> Try on WhatsApp</>}
          </button>
        </div>
      </div>

      {/* Product Selector */}
      <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Image size={16} /> Select Product (Optional)
          </label>
          {selectedProduct && (
            <button className="text-xs text-red-500 hover:text-red-600 font-semibold" onClick={() => { setSelectedProduct(null); setProducts([]); }}>
              <X size={14} className="inline mr-1" /> Clear
            </button>
          )}
        </div>
        {selectedProduct ? (
          <div className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
              {selectedProduct.productimage?.[0]?.url || selectedProduct.images?.[0]?.url ? (
                <img loading="lazy" src={selectedProduct.productimage?.[0]?.url || selectedProduct.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
              ) : <Image size={20} className="text-gray-400" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{selectedProduct.name}</div>
              <div className="text-xs text-text-muted">₹{Number(selectedProduct.price || 0).toLocaleString()} · {selectedProduct.category?.name || 'General'}</div>
            </div>
          </div>
        ) : (
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input className="w-full pl-9 pr-4 py-2.5 border border-border rounded-xl text-sm focus:outline-none focus:border-purple-500"
              placeholder="Search products..." value={productSearch} onChange={(e) => setProductSearch(e.target.value)} />
            {productSearch && products.length > 0 && (
              <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
                {products.map((p) => (
                  <button key={p.id} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-50 transition-colors text-left"
                    onClick={() => { setSelectedProduct(p); setProductSearch(''); setProducts([]); }}>
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {(p.productimage?.[0]?.url || p.images?.[0]?.url) ? <img loading="lazy" src={p.productimage?.[0]?.url || p.images?.[0]?.url} alt="" className="w-full h-full object-cover" /> : <Image size={14} className="text-gray-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      <div className="text-xs text-text-muted">₹{Number(p.price || 0).toLocaleString()}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Platform & Tone Selectors */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <label className="text-sm font-bold text-text-primary block mb-3">Platform</label>
          <div className="grid grid-cols-2 gap-2">
            {PLATFORMS.map((p) => {
              const isSelected = aiPlatform === p.id;
              const Icon = p.icon;
              return (
                <button key={p.id} className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl text-sm font-semibold transition-all ${isSelected ? `${p.color} text-white shadow-lg scale-105` : 'bg-surface text-text-muted border border-border hover:border-purple-300'}`}
                  onClick={() => setAiPlatform(p.id)}>
                  <Icon size={16} /> {p.label.split('/')[0].trim()}
                </button>
              );
            })}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
          <label className="text-sm font-bold text-text-primary block mb-3">Tone</label>
          <div className="grid grid-cols-3 gap-2">
            {TONE_OPTIONS.map((t) => (
              <button key={t.id} className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${aiTone === t.id ? 'bg-brand-black text-white shadow-lg' : 'bg-surface text-text-muted border border-border hover:border-purple-300'}`}
                onClick={() => setAiTone(t.id)}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Brand Voice */}
      <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-bold text-text-primary flex items-center gap-2">
            <BookOpen size={16} className="text-amber-600" /> Brand Voice
          </label>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {['threvolt', 'luxury', 'minimal'].map(v => (
            <button key={v} className={`px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${aiBrandVoice === v ? 'bg-amber-600 text-white shadow-lg' : 'bg-surface text-text-muted border border-border hover:border-amber-400'}`}
              onClick={() => setAiBrandVoice(v)}>
              {v === 'threvolt' ? <><Building2 size={12} className="inline mr-1" /> THREVOLT</> : v === 'luxury' ? <><Diamond size={12} className="inline mr-1" /> Luxury</> : <><Palette size={12} className="inline mr-1" /> Minimal</>}
            </button>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-border shadow-soft hover:border-purple-400 hover:shadow-md transition-all"
          onClick={generateAdCopy} disabled={aiLoading}>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${aiLoading ? 'bg-purple-100' : 'bg-purple-50'}`}>
            {aiLoading ? <div className="spinner w-5 h-5 border-2 border-purple-400/30 border-t-purple-500 rounded-full" /> : <Sparkles size={22} className="text-purple-600" />}
          </div>
          <span className="text-xs font-semibold text-text-primary">Generate Copy</span>
        </button>
        <button className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-border shadow-soft hover:border-blue-400 hover:shadow-md transition-all"
          onClick={generateVariants} disabled={aiVariantsLoading}>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
            {aiVariantsLoading ? <div className="spinner w-5 h-5 border-2 border-blue-400/30 border-t-blue-500 rounded-full" /> : <GitCompare size={22} className="text-blue-600" />}
          </div>
          <span className="text-xs font-semibold text-text-primary">A/B Variants</span>
        </button>
        <button className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-border shadow-soft hover:border-green-400 hover:shadow-md transition-all"
          onClick={generateStrategy} disabled={aiStrategyLoading}>
          <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
            {aiStrategyLoading ? <div className="spinner w-5 h-5 border-2 border-green-400/30 border-t-green-500 rounded-full" /> : <Award size={22} className="text-green-600" />}
          </div>
          <span className="text-xs font-semibold text-text-primary">Full Strategy</span>
        </button>
        <button className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-border shadow-soft hover:border-amber-400 hover:shadow-md transition-all"
          onClick={suggestAudience} disabled={aiAudienceLoading}>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            {aiAudienceLoading ? <div className="spinner w-5 h-5 border-2 border-amber-400/30 border-t-amber-500 rounded-full" /> : <Users size={22} className="text-amber-600" />}
          </div>
          <span className="text-xs font-semibold text-text-primary">Audience</span>
        </button>
      </div>

      {/* AI Results - Copy */}
      {aiResultTab === 'copy' && aiGeneratedCopy && (
        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <h4 className="font-bold text-text-primary flex items-center gap-2"><Sparkles size={18} className="text-purple-600" /> Generated Ad Copy</h4>
              {aiGeneratedCopy._demo && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 cursor-help">🧪 Demo</span>}
              {aiGeneratedCopy._platform && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">{aiGeneratedCopy._platform}</span>}
            </div>
            {!aiGeneratedCopy._demo ? (
              <button className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1.5"
                onClick={() => applyAICopyToForm(aiGeneratedCopy)}>
                <Plus size={13} /> Create Campaign
              </button>
            ) : (
              <span className="px-3 py-1.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold cursor-not-allowed flex items-center gap-1.5">
                <Plus size={13} /> Create Campaign
              </span>
            )}
          </div>
          <div className="p-5 space-y-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-border">
              <div className="flex items-center gap-2 mb-2"><Type size={14} className="text-purple-600" /><span className="text-xs font-bold text-text-muted uppercase tracking-wider">Headline</span></div>
              <p className="text-lg font-bold text-text-primary">{aiGeneratedCopy.headline}</p>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-border">
              <div className="flex items-center gap-2 mb-2"><MessageSquareText size={14} className="text-purple-600" /><span className="text-xs font-bold text-text-muted uppercase tracking-wider">Primary Text</span></div>
              <p className="text-sm text-text-primary leading-relaxed">{aiGeneratedCopy.primaryText}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 border border-border">
                <div className="flex items-center gap-2 mb-2"><FileText size={14} className="text-purple-600" /><span className="text-xs font-bold text-text-muted uppercase tracking-wider">Description</span></div>
                <p className="text-sm text-text-primary">{aiGeneratedCopy.description || '—'}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border border-border">
                <div className="flex items-center gap-2 mb-2"><Zap size={14} className="text-purple-600" /><span className="text-xs font-bold text-text-muted uppercase tracking-wider">Call to Action</span></div>
                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold">{aiGeneratedCopy.callToAction}</span>
              </div>
            </div>
            {aiGeneratedCopy.suggestions?.length > 0 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div className="flex items-center gap-2 mb-2"><Lightbulb size={14} className="text-amber-600" /><span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Tips</span></div>
                <ul className="space-y-1">{aiGeneratedCopy.suggestions.map((s, i) => <li key={i} className="text-sm text-amber-800 flex items-start gap-2"><span className="text-amber-500 mt-0.5">•</span>{s}</li>)}</ul>
              </div>
            )}
            {aiGeneratedCopy.hashtags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {aiGeneratedCopy.hashtags.map((h, i) => <span key={i} className="px-2.5 py-1 bg-purple-100 text-purple-600 rounded-full text-xs font-semibold">{h}</span>)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI Results - Variants */}
      {aiResultTab === 'variants' && aiVariants.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-bold text-text-primary flex items-center gap-2"><GitCompare size={18} className="text-blue-600" /> A/B Test Variants</h4>
          {aiVariants.map((v, i) => (
            <div key={i} className="bg-white rounded-2xl border border-border shadow-soft p-5 hover:border-blue-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">Variant {i + 1}: {v.variantName}</span>
                <button className="text-xs text-blue-600 hover:text-blue-700 font-semibold px-3 py-1.5 bg-blue-50 rounded-lg"
                  onClick={() => { setForm(prev => ({ ...prev, name: v.headline, notes: `${v.primaryText}\n\n${v.description}` })); toast.success('Applied to form!'); setShowModal(true); }}>
                  <Copy size={12} className="inline mr-1" /> Use
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div><span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Headline</span><p className="text-sm font-bold text-text-primary">{v.headline}</p></div>
                <div><span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">CTA</span><span className="inline-block px-2.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">{v.callToAction}</span></div>
              </div>
              <div className="mb-3"><span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Primary Text</span><p className="text-sm text-text-primary">{v.primaryText}</p></div>
              <div className="p-3 bg-gray-50 rounded-xl border border-border"><span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block mb-1">Why This Works</span><p className="text-xs text-text-muted">{v.reasoning}</p></div>
            </div>
          ))}
        </div>
      )}

      {/* AI Results - Strategy */}
      {aiResultTab === 'strategy' && aiStrategy && (
        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="p-5 border-b border-border bg-gradient-to-r from-green-50 to-emerald-50">
            <h4 className="font-bold text-text-primary flex items-center gap-2"><Award size={18} className="text-green-600" /> Full Campaign Strategy</h4>
            <p className="text-sm text-text-muted mt-1">{aiStrategy.campaignName}</p>
          </div>
          <div className="p-5 space-y-4">
            {aiStrategy.adCopy && (
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-gray-50 border border-border"><span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Headline</span><p className="text-sm font-bold mt-1">{aiStrategy.adCopy.headline}</p></div>
                <div className="p-3 rounded-xl bg-gray-50 border border-border"><span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">CTA</span><span className="inline-block mt-1 px-2.5 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold">{aiStrategy.adCopy.callToAction}</span></div>
              </div>
            )}
            {aiStrategy.budgetRecommendation && (
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200"><span className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><DollarSign size={14} /> Budget Recommendation</span><p className="text-sm text-blue-800 mt-1">{aiStrategy.budgetRecommendation}</p></div>
            )}
            {aiStrategy.platformSpecificTips?.length > 0 && (
              <div><span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Platform Tips</span><div className="space-y-1.5">{aiStrategy.platformSpecificTips.map((tip, i) => (<div key={i} className="flex items-start gap-2 text-sm text-text-primary"><span className="text-green-500 mt-0.5">✓</span> {tip}</div>))}</div></div>
            )}
            {aiStrategy.expectedKPIs && (
              <div className="p-3 rounded-xl bg-gray-50 border border-border"><span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">Expected KPIs</span><p className="text-sm text-text-primary mt-1">{aiStrategy.expectedKPIs}</p></div>
            )}
            <button className="w-full px-4 py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-colors"
              onClick={() => { setForm(prev => ({ ...prev, name: aiStrategy.campaignName })); toast.success('Strategy name applied!'); setShowModal(true); }}>
              <Plus size={15} className="inline mr-1.5" /> Create Campaign from Strategy
            </button>
          </div>
        </div>
      )}

      {/* AI Results - Audience */}
      {aiResultTab === 'audience' && aiAudience && (
        <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
          <div className="p-5 border-b border-border bg-gradient-to-r from-amber-50 to-orange-50">
            <h4 className="font-bold text-text-primary flex items-center gap-2"><Users size={18} className="text-amber-600" /> Audience Targeting Suggestions</h4>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded-xl bg-gray-50 border border-border text-center">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Age Range</div>
                <div className="text-lg font-bold text-text-primary mt-1">{aiAudience.ageRange || 'All'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-border text-center">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Gender</div>
                <div className="text-lg font-bold text-text-primary mt-1">{aiAudience.gender || 'All'}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-border text-center">
                <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Best Time</div>
                <div className="text-xs font-bold text-text-primary mt-1">{aiAudience.bestTimeToAdvertise || 'Anytime'}</div>
              </div>
            </div>
            {aiAudience.interests?.length > 0 && (
              <div className="mb-4"><span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Target Interests</span><div className="flex flex-wrap gap-1.5">{aiAudience.interests.map((interest, i) => <span key={i} className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">{interest}</span>)}</div></div>
            )}
            {aiAudience.behaviors?.length > 0 && (
              <div className="mb-4"><span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Behaviors</span><div className="flex flex-wrap gap-1.5">{aiAudience.behaviors.map((b, i) => <span key={i} className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">{b}</span>)}</div></div>
            )}
            {aiAudience.locations?.length > 0 && (
              <div><span className="text-xs font-bold text-text-muted uppercase tracking-wider block mb-2">Target Locations</span><div className="flex flex-wrap gap-1.5">{aiAudience.locations.map((loc, i) => <span key={i} className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">{loc}</span>)}</div></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
