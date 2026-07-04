import { X, Activity, Play, ChevronDown, ChevronUp, MessageCircle, Image, Eye } from 'lucide-react';
import { useState } from 'react';

const PLATFORMS = [
  {
    id: 'INSTAGRAM',
    name: 'Instagram',
    icon: Target,
    gradient: 'from-pink-500 to-purple-600',
    mockup: 'square',
    format: 'Square (1:1)',
    maxHeadline: 40,
    maxText: 2200,
    tip: 'High-contrast visuals and lifestyle imagery perform best. Use 1:1 or 4:5 aspect ratio.',
  },
  {
    id: 'FACEBOOK',
    name: 'Facebook',
    icon: Target,
    gradient: 'from-blue-600 to-blue-700',
    mockup: 'landscape',
    format: 'Landscape (1.91:1)',
    maxHeadline: 40,
    maxText: 125,
    tip: 'Short, punchy copy works best. Use 1.91:1 or 1:1 images with clear branding.',
  },
  {
    id: 'GOOGLE',
    name: 'Google / YouTube',
    icon: Play,
    gradient: 'from-blue-500 to-green-500',
    mockup: 'text',
    format: 'Text Ad',
    maxHeadline: 30,
    maxText: 90,
    tip: 'Keep headlines under 30 chars for full visibility. Use relevant keywords in copy.',
  },
  {
    id: 'WHATSAPP',
    name: 'WhatsApp',
    icon: MessageCircle,
    gradient: 'from-green-500 to-emerald-600',
    mockup: 'chat',
    format: 'Chat Message',
    maxHeadline: 30,
    maxText: 1024,
    tip: 'Personal, conversational tone drives engagement. Include an exclusive offer or CTA.',
  },
];

function PlatformPreview({ platform, imageUrl, headline, primaryText, cta, landingUrl, imgError, onImgError }) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden group hover:shadow-md transition-all">
      {/* Platform Header */}
      <div className={`bg-gradient-to-r ${platform.gradient} px-4 py-3 text-white flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <platform.icon size={16} />
          <span className="text-sm font-bold">{platform.name}</span>
        </div>
        <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">{platform.format}</span>
      </div>

      {/* Preview Body */}
      <div className={`p-4 ${platform.mockup === 'chat' ? 'bg-green-50/40' : 'bg-gray-50'}`}>
        {platform.mockup === 'square' && (
          <div className="space-y-2.5">
            <div className={`rounded-xl overflow-hidden bg-gray-200 aspect-square ${imgError ? 'flex items-center justify-center' : ''}`}>
              {imgError ? (
                <Image size={36} />
              ) : (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={onImgError} />
              )}
            </div>
            <p className="text-sm font-extrabold text-gray-900 line-clamp-2">{headline}</p>
            <p className="text-xs text-gray-600 line-clamp-3">{primaryText}</p>
            <div className="block w-full py-2 bg-blue-600 text-white text-center rounded-lg text-xs font-bold">{cta}</div>
            <p className="text-[9px] text-gray-400 text-center truncate">{landingUrl}</p>
          </div>
        )}

        {platform.mockup === 'landscape' && (
          <div className="space-y-2.5">
            <div className={`rounded-xl overflow-hidden bg-gray-200 aspect-video ${imgError ? 'flex items-center justify-center' : ''}`}>
              {imgError ? (
                <Image size={36} />
              ) : (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={onImgError} />
              )}
            </div>
            <p className="text-xs font-extrabold text-gray-900 line-clamp-2">{headline}</p>
            <p className="text-[11px] text-gray-600 line-clamp-2">{primaryText}</p>
            <div className="block w-full py-2 bg-blue-600 text-white text-center rounded-lg text-xs font-bold">{cta}</div>
          </div>
        )}

        {platform.mockup === 'text' && (
          <div className="space-y-2 max-w-xs mx-auto">
            <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Sponsored</p>
              <p className="text-sm text-blue-700 font-semibold hover:underline cursor-pointer">{headline}</p>
              <p className="text-[11px] text-green-700 truncate">{landingUrl}</p>
              <p className="text-[11px] text-gray-600 mt-1 line-clamp-2">{primaryText}</p>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <Play size={12} /> Also available on YouTube
            </div>
          </div>
        )}

        {platform.mockup === 'chat' && (
          <div className="space-y-2 max-w-xs mx-auto">
            <div className="bg-white rounded-2xl rounded-bl-sm p-3.5 shadow-sm border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold">S</div>
                <div>
                  <p className="text-xs font-bold">Store Updates</p>
                  <p className="text-[9px] text-gray-400">Just now</p>
                </div>
              </div>
              {imageUrl && !imgError && (
                <div className="rounded-xl overflow-hidden mb-2 w-full aspect-square bg-gray-100">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={onImgError} />
                </div>
              )}
              <p className="text-sm font-bold">{headline}</p>
              <p className="text-xs text-gray-600 mt-1">{primaryText}</p>
              <div className="mt-2 px-4 py-2 bg-green-500 text-white text-center rounded-lg text-xs font-bold">{cta}</div>
            </div>
            <div className="flex items-center gap-1.5 text-[9px] text-gray-400">
              <MessageCircle size={11} />
              Delivered via WhatsApp Business
            </div>
          </div>
        )}
      </div>

      {/* Specs Footer */}
      <div className="px-4 py-2.5 border-t border-border/50 bg-gray-50/80">
        <div className="flex items-center justify-between text-[9px] text-text-muted">
          <span>Headline: <strong className={headline.length > platform.maxHeadline ? 'text-red-500' : 'text-green-600'}>{headline.length}/{platform.maxHeadline}</strong></span>
          <span>Body: <strong className={primaryText.length > platform.maxText ? 'text-red-500' : 'text-green-600'}>{primaryText.length}/{platform.maxText}</strong></span>
        </div>
      </div>

      {/* Tip */}
      <div className="px-4 py-2 bg-amber-50/80 border-t border-amber-100 text-[9px] text-amber-700 leading-relaxed">
        💡 {platform.tip}
      </div>
    </div>
  );
}

export default function AdPreviewCompare({ campaign, copy, onClose }) {
  const headline = copy?.headline || campaign?.name || 'Ad Headline';
  const primaryText = copy?.primaryText || copy?.description || campaign?.description || 'Your ad copy here...';
  const cta = copy?.callToAction || 'SHOP NOW';
  const imageUrl = campaign?.creativeUrl || 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=400';
  const landingUrl = campaign?.landingUrl || '/products';

  const [imgErrors, setImgErrors] = useState({});
  const [showTips, setShowTips] = useState(true);

  const handleImgError = (platformId) => setImgErrors(prev => ({ ...prev, [platformId]: true }));

  if (!campaign && !copy) return null;

  // Check if headline/body exceed limits
  const warnings = [];
  PLATFORMS.forEach(p => {
    if (headline.length > p.maxHeadline) {
      warnings.push({ platform: p.name, field: 'Headline', current: headline.length, max: p.maxHeadline });
    }
    if (primaryText.length > p.maxText) {
      warnings.push({ platform: p.name, field: 'Body text', current: primaryText.length, max: p.maxText });
    }
  });

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 sm:p-6"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bg-gray-50/90 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white rounded-t-2xl border-b border-border px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold font-display flex items-center gap-2">
              <Eye size={20} /> Multi-Platform Ad Preview
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              See how your ad looks across all platforms simultaneously
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-[10px] font-semibold text-text-muted hover:text-text-primary px-2.5 py-1.5 rounded-lg border border-border hover:bg-surface transition-colors flex items-center gap-1"
              onClick={() => setShowTips(!showTips)}>
              {showTips ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {showTips ? 'Hide Tips' : 'Show Tips'}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Creative Asset */}
          <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-border shadow-soft">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-border">
              {imgErrors['creative'] ? (
                <div className="w-full h-full flex items-center justify-center"><Image size={22} /></div>
              ) : (
                <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={() => handleImgError('creative')} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold truncate">{campaign?.name || 'Campaign Preview'}</div>
              <div className="text-[10px] text-text-muted mt-0.5">"{headline}"</div>
            </div>
            <div className="hidden sm:flex items-center gap-3 text-[10px] text-text-muted">
              <span>📝 {headline.length} chars headline</span>
              <span>📄 {primaryText.length} chars body</span>
              <span>🔗 CTA: {cta}</span>
            </div>
          </div>

          {/* Character Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              {warnings.slice(0, 3).map((w, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-[10px] font-semibold">
                  <span>⚠️ {w.platform}: {w.field} is {w.current - w.max} chars over the {w.max} char limit</span>
                </div>
              ))}
            </div>
          )}

          {/* Platform Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {PLATFORMS.map(platform => (
              <PlatformPreview
                key={platform.id}
                platform={platform}
                imageUrl={imageUrl}
                headline={headline}
                primaryText={primaryText}
                cta={cta}
                landingUrl={landingUrl}
                imgError={imgErrors[platform.id]}
                onImgError={() => handleImgError(platform.id)}
              />
            ))}
          </div>

          {/* Comparison Summary */}
          {showTips && (
            <div className="bg-white rounded-2xl border border-border shadow-soft p-5 space-y-3">
              <h4 className="font-bold text-sm flex items-center gap-2">📊 Cross-Platform Comparison</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 border border-pink-100">
                  <div className="font-bold text-pink-700 text-sm">Instagram</div>
                  <div className="text-pink-600 mt-1">Best for: Visual storytelling, lifestyle, fashion</div>
                  <div className="text-[10px] text-pink-500 mt-0.5">Square images + engaging captions drive highest engagement</div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="font-bold text-blue-700 text-sm">Facebook</div>
                  <div className="text-blue-600 mt-1">Best for: Offers, events, community building</div>
                  <div className="text-[10px] text-blue-500 mt-0.5">Landscape format with short, benefit-driven copy works best</div>
                </div>
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-green-50 border border-green-100">
                  <div className="font-bold text-green-700 text-sm">Google / YouTube</div>
                  <div className="text-green-600 mt-1">Best for: Search intent, product discovery</div>
                  <div className="text-[10px] text-green-500 mt-0.5">Keywords in headlines + clear value prop = higher CTR</div>
                </div>
                <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                  <div className="font-bold text-green-700 text-sm">WhatsApp</div>
                  <div className="text-green-600 mt-1">Best for: Direct engagement, exclusive offers</div>
                  <div className="text-[10px] text-green-500 mt-0.5">Personalized, conversational tone with clear CTA</div>
                </div>
              </div>
            </div>
          )}

          {/* Ad Copy Summary */}
          <div className="bg-white rounded-2xl border border-border shadow-soft p-5">
            <h4 className="font-bold text-sm mb-3 flex items-center gap-2">📋 Ad Copy Summary</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2">
                <div>
                  <span className="font-bold text-text-muted text-[10px] uppercase tracking-wider">Headline</span>
                  <p className="mt-0.5 font-semibold">{headline}</p>
                </div>
                <div>
                  <span className="font-bold text-text-muted text-[10px] uppercase tracking-wider">Call to Action</span>
                  <p className="mt-0.5 font-semibold">{cta}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-bold text-text-muted text-[10px] uppercase tracking-wider">Body Text</span>
                  <p className="mt-0.5">{primaryText}</p>
                </div>
                <div>
                  <span className="font-bold text-text-muted text-[10px] uppercase tracking-wider">Landing URL</span>
                  <p className="mt-0.5 text-blue-600 break-all">{landingUrl}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
