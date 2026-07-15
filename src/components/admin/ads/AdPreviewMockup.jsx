const PLATFORM_STYLES = {
  INSTAGRAM: {
    name: 'Instagram',
    icon: Target,
    gradient: 'from-pink-500 to-purple-600',
    mockup: 'square',
    textMax: 2200,
    headlineMax: 40,
  },
  FACEBOOK: {
    name: 'Facebook',
    icon: Target,
    gradient: 'from-blue-600 to-blue-700',
    mockup: 'landscape',
    textMax: 125,
    headlineMax: 40,
  },
  GOOGLE: {
    name: 'Google / YouTube',
    icon: Play,
    gradient: 'from-blue-500 to-green-500',
    mockup: 'text',
    headlineMax: 30,
    textMax: 90,
  },
  WHATSAPP: {
    name: 'WhatsApp',
    icon: MessageCircle,
    gradient: 'from-green-500 to-emerald-600',
    mockup: 'chat',
    textMax: 1024,
    headlineMax: 30,
  },
};

import { X, Target, Play, MessageCircle, Image } from 'lucide-react';
import { useState } from 'react';

export default function AdPreviewMockup({ campaign, copy, platform, onClose }) {
  const plat = PLATFORM_STYLES[platform || campaign?.platform] || PLATFORM_STYLES.INSTAGRAM;
  const headline = copy?.headline || campaign?.name || 'Ad Headline';
  const primaryText = copy?.primaryText || copy?.description || campaign?.description || 'Your ad copy here...';
  const cta = copy?.callToAction || 'SHOP NOW';
  const [imgError, setImgError] = useState(false);
  const imageUrl = campaign?.creativeUrl || 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=400';
  const landingUrl = campaign?.landingUrl || '/products';

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`bg-gradient-to-r ${plat.gradient} px-5 py-4 rounded-t-2xl flex items-center justify-between text-white`}>
          <div className="flex items-center gap-2">
            <plat.icon size={18} />
            <span className="font-bold">{plat.name} Ad Preview</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Mockup Container */}
          <div className={`bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-4 ${plat.mockup === 'chat' ? 'bg-green-50/50' : ''}`}>
            {/* Instagram/Facebook - Image + Text */}
            {(plat.mockup === 'square' || plat.mockup === 'landscape') && (
              <div className="space-y-3">
                <div className={`rounded-xl overflow-hidden bg-gray-200 ${plat.mockup === 'square' ? 'aspect-square max-w-sm mx-auto' : 'aspect-video'} ${imgError ? 'flex items-center justify-center' : ''}`}>
                  {imgError ? (
                    <Image size={48} />
                  ) : (
                    <img src={imageUrl} alt="Ad creative" className="w-full h-full object-cover"
                      onError={() => setImgError(true)} />
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-extrabold text-gray-900 line-clamp-2">{headline}</p>
                  <p className="text-xs text-gray-600 line-clamp-3">{primaryText}</p>
                </div>
                <div className="block w-full py-2.5 bg-blue-600 text-white text-center rounded-lg text-xs font-bold tracking-wider">
                  {cta}
                </div>
                <p className="text-[10px] text-gray-400 text-center">{landingUrl}</p>
              </div>
            )}

            {/* Google - Text only */}
            {plat.mockup === 'text' && (
              <div className="space-y-2 max-w-md mx-auto">
                <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Sponsored</p>
                  <p className="text-sm text-blue-700 font-semibold hover:underline cursor-pointer">{headline}</p>
                  <p className="text-xs text-green-700">{landingUrl}</p>
                  <p className="text-xs text-gray-600 mt-1">{primaryText}</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Play size={12} /> Also available on YouTube
                </div>
              </div>
            )}

            {/* WhatsApp - Chat bubble */}
            {plat.mockup === 'chat' && (
              <div className="space-y-3 max-w-sm mx-auto">
                <div className="bg-white rounded-2xl rounded-bl-sm p-4 shadow-sm border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">S</div>
                    <div>
                      <p className="text-xs font-bold">Store Updates</p>
                      <p className="text-[10px] text-gray-400">Just now</p>
                    </div>
                  </div>
                  {imageUrl && (
                    <div className="rounded-xl overflow-hidden mb-2 w-48 h-48 bg-gray-100 flex items-center justify-center">
                      {imgError ? (
                        <Image size={32} />
                      ) : (
                        <img src={imageUrl} alt="" className="w-full h-full object-cover"
                          onError={() => setImgError(true)} />
                      )}
                    </div>
                  )}
                  <p className="text-sm font-bold">{headline}</p>
                  <p className="text-xs text-gray-600 mt-1">{primaryText}</p>
                  <div className="mt-2 px-4 py-2 bg-green-500 text-white text-center rounded-lg text-xs font-bold cursor-pointer hover:bg-green-600 transition-colors">
                    {cta}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-gray-400">
                  <MessageCircle size={12} />
                  Delivered via WhatsApp Business
                </div>
              </div>
            )}
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 bg-gray-50 rounded-lg">
              <span className="font-bold text-gray-500">Format</span>
              <p className="font-semibold text-gray-800 mt-0.5">{plat.mockup === 'square' ? 'Square (1:1)' : plat.mockup === 'landscape' ? 'Landscape (16:9)' : plat.mockup === 'chat' ? 'Chat Message' : 'Text Ad'}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <span className="font-bold text-gray-500">Headline</span>
              <p className="font-semibold text-gray-800 mt-0.5">{headline.length}/{plat.headlineMax} chars</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <span className="font-bold text-gray-500">Body Text</span>
              <p className="font-semibold text-gray-800 mt-0.5">{primaryText.length}/{plat.textMax} chars</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <span className="font-bold text-gray-500">CTA</span>
              <p className="font-semibold text-gray-800 mt-0.5">{cta}</p>
            </div>
          </div>

          {/* Recommendation */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
            <strong>💡 Tip:</strong> {plat.name} ads with high-contrast visuals and clear CTAs perform best. Keep headlines under {plat.headlineMax} chars.
          </div>
        </div>
      </div>
    </div>
  );
}
