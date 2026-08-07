import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Upload, ShoppingBag, Palette, Loader2, X, ArrowRight, Minus, Plus, Info } from 'lucide-react';
import useCartStore from '../../store/cartStore';
import useDesignUpload from '../../hooks/useDesignUpload';
import { useSettings } from '../../store/useSettings';
import { CUSTOM_TEE_PRODUCT_ID } from '../../utils/constants';
import toast from '../../utils/toast';

/* ═══════════ T-SHIRT COLOR PALETTE ═══════════ */
const TEE_COLORS = [
  { name: 'White', hex: '#FFFFFF', border: '#E0E0E0' },
  { name: 'Black', hex: '#1A1A1A', border: '#333333' },
  { name: 'Navy', hex: '#1B2838', border: '#2A3F54' },
  { name: 'Charcoal', hex: '#36454F', border: '#4A5A65' },
  { name: 'Olive', hex: '#556B2F', border: '#6B7D4A' },
  { name: 'Burgundy', hex: '#800020', border: '#A00028' },
  { name: 'Forest Green', hex: '#228B22', border: '#2EA02E' },
  { name: 'Royal Blue', hex: '#4169E1', border: '#5A7FEB' },
];

const TEE_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

/* ═══════════ COMPACT DESIGN UPLOAD ═══════════ */
function CompactUpload({ upload, label, id }) {
  return (
    <div className="p-3 sm:p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
      <h4 className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2">{label}</h4>
      <input ref={upload.fileInputRef} type="file" accept="image/*,.ai,.eps,.psd,.pdf"
        onChange={upload.handleFileSelect} className="hidden" id={`tee-file-${id}`} />
      {upload.designFile ? (
        <div className="space-y-1.5 sm:space-y-2">
          <div className="relative rounded-lg overflow-hidden border border-gray-200 bg-gray-50 aspect-video flex items-center justify-center">
            <img src={upload.designFile.url} alt={label} className="max-w-full max-h-full object-contain p-1.5 sm:p-2" />
          </div>
          <div className="flex items-center justify-between gap-1.5 sm:gap-2">
            <span className="text-[9px] sm:text-[10px] text-gray-500 truncate flex-1">{upload.designFile.name}</span>
            {upload.designFile.serverUrl && (
              <span className="text-[7px] sm:text-[8px] text-emerald-600 font-medium mr-1">✓ Uploaded</span>
            )}
            <button onClick={() => upload.fileInputRef.current?.click()}
              className="text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all">Change</button>
            <button onClick={upload.removeFile}
              className="text-[8px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all"><X size={11} className="sm:w-[12px] sm:h-[12px]" /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => upload.fileInputRef.current?.click()} disabled={upload.uploading}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-4 sm:py-6 text-center hover:border-gray-400 hover:bg-gray-50 transition-all group">
          {upload.uploading ? (
            <div className="flex flex-col items-center gap-1.5">
              <Loader2 size={18} className="animate-spin text-gray-400" />
              <p className="text-[10px] text-gray-400 font-medium">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload size={18} className="mx-auto text-gray-300 group-hover:text-gray-400 mb-1 transition-colors" />
              <p className="text-[11px] sm:text-xs font-semibold text-gray-500">Click to upload {label.toLowerCase()}</p>
              <p className="text-[8px] sm:text-[9px] text-gray-300 mt-0.5">PNG, JPG, AI, EPS, PSD (max 10MB)</p>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ═══════════ TEE SVG PREVIEW ═══════════ */
function TeePreview({ color }) {
  return (
    <svg viewBox="0 0 300 340" className="w-full h-full drop-shadow-lg" fill="none">
      <defs>
        <linearGradient id="teeShade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color.hex} stopOpacity="1" />
          <stop offset="50%" stopColor={color.hex} stopOpacity="0.92" />
          <stop offset="100%" stopColor={color.hex} stopOpacity="0.85" />
        </linearGradient>
        <filter id="teeShadow">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodOpacity="0.12" />
        </filter>
      </defs>
      <path d="M80 60 L60 55 L30 72 L42 105 L68 100 L65 280 L120 290 L150 295 L180 290 L235 280 L232 100 L258 105 L270 72 L240 55 L220 60 L200 55 L150 48 L100 55 Z"
        fill="url(#teeShade)" stroke={color.border} strokeWidth="1" filter="url(#teeShadow)" />
      <path d="M115 55 Q150 40 185 55" stroke={color.border} strokeWidth="1.5" fill="none" opacity="0.4" />
    </svg>
  );
}

/* ═══════════ MAIN COMPONENT ═══════════ */
export default function TShirtCustomizerSection() {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);
  const frontUpload = useDesignUpload();
  const backUpload = useDesignUpload();

  const [selectedColor, setSelectedColor] = useState(TEE_COLORS[0]);
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [designNotes, setDesignNotes] = useState('');
  const [placement, setPlacement] = useState('front');

  const { getSetting } = useSettings();

  const needsBothDesigns = placement === 'both';
  const frontMissing = !frontUpload.designFile;
  const backMissing = needsBothDesigns && !backUpload.designFile;
  const canAddToCart = frontUpload.designFile && (!needsBothDesigns || backUpload.designFile);

  // ── Dynamic pricing from settings ──
  const singlePrintPrice = Number(getSetting('customDesignSinglePrintPrice', '699'));
  const bothSidesPrice = Number(getSetting('customDesignBothSidesPrice', '899'));
  const effectiveUnitPrice = placement === 'both' ? bothSidesPrice : singlePrintPrice;

  // ── Add to cart ──
  const handleAddToCart = useCallback(() => {
    if (!canAddToCart) {
      if (frontMissing) { toast.error('Please upload your front design first'); return; }
      if (backMissing) { toast.error('Please upload your back design first'); return; }
      return;
    }

    const frontImageUrl = frontUpload.designFile.serverUrl || frontUpload.designFile.url;
    const backImageUrl = backUpload.designFile ? (backUpload.designFile.serverUrl || backUpload.designFile.url) : null;
    addItem({
      productId: CUSTOM_TEE_PRODUCT_ID,
      id: CUSTOM_TEE_PRODUCT_ID,
      name: `Custom T-Shirt (Your Design)`,
      price: effectiveUnitPrice,
      quantity,
      size: selectedSize,
      color: selectedColor.name,
      image: frontImageUrl,
      isCustom: true,
      customDesign: {
        designFile: frontUpload.designFile.name,
        designNotes,
        placement,
        color: selectedColor,
        serverUrl: frontUpload.designFile.serverUrl,
        path: frontUpload.designFile.path,
        backDesignFile: backUpload.designFile?.name || null,
        backServerUrl: backUpload.designFile?.serverUrl || null,
        backPath: backUpload.designFile?.path || null,
        backUrl: backImageUrl,
      },
    });
    openCart();
  }, [frontUpload.designFile, backUpload.designFile, selectedSize, selectedColor, quantity, designNotes, placement, effectiveUnitPrice, addItem, openCart, getSetting, canAddToCart, frontMissing, backMissing]);

  return (
    <section className="relative py-8 sm:py-12 lg:py-16 bg-gradient-to-b from-white via-gray-50 to-white overflow-hidden">
      {/* Subtle dot pattern */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #000 1px, transparent 1px), radial-gradient(circle at 75% 75%, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-30px' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-6 sm:mb-8 lg:mb-10"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="h-px w-5 sm:w-6 bg-gradient-to-r from-transparent via-gray-300 to-transparent rounded-full" />
            <div className="flex items-center gap-1.5">
              <span className="relative w-1 h-1 rounded-full bg-gray-400">
                <span className="absolute inset-0 rounded-full bg-gray-400 animate-ping opacity-30" style={{ animationDuration: '2s' }} />
              </span>
              <span className="text-gray-400 text-[8px] sm:text-[9px] font-bold uppercase tracking-[0.2em]">Custom Design</span>
            </div>
            <span className="h-px w-5 sm:w-6 bg-gradient-to-l from-transparent via-gray-300 to-transparent rounded-full" />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display font-bold tracking-tight text-gray-900 px-2">
            Design Your Own Custom T-Shirt
          </h2>
          <p className="text-gray-400 text-[11px] sm:text-xs md:text-sm mt-1 font-medium max-w-lg mx-auto px-4">
            Upload your artwork, pick your colors and size — we'll print it for you
          </p>
        </motion.div>

        {/* ── Layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6 md:gap-10 items-start">
          {/* ── LEFT: Preview + Upload ── */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3 sm:space-y-4"
          >
            {/* T-Shirt Preview — smaller on mobile */}
            <div className="relative mx-auto max-w-[200px] sm:max-w-[240px] md:max-w-[280px] lg:max-w-[320px]">
              <div className="absolute -inset-6 sm:-inset-8 rounded-full blur-3xl opacity-20 transition-all duration-700"
                style={{ background: `radial-gradient(circle, ${selectedColor.hex} 0%, transparent 70%)` }} />
              <TeePreview color={selectedColor} />
            </div>
            <p className="text-center text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider -mt-1 sm:mt-0">{selectedColor.name}</p>

            {/* Upload Area — compact on mobile */}
            {needsBothDesigns ? (
              <div className="space-y-3 sm:space-y-4">
                <CompactUpload upload={frontUpload} label="Front Design" id="front" />
                <CompactUpload upload={backUpload} label="Back Design" id="back" />
              </div>
            ) : (
              <CompactUpload upload={frontUpload} label="Upload your design" id="single" />
            )}
          </motion.div>

          {/* ── RIGHT: Options ── */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-3 sm:space-y-4"
          >
            {/* Color */}
            <div className="p-3 sm:p-4 rounded-xl bg-white border border-gray-200">
              <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2 sm:mb-2.5 flex items-center gap-1.5">
                <Palette size={12} className="sm:w-[13px] sm:h-[13px]" /> Color
              </h3>
              <div className="flex flex-wrap gap-2 sm:gap-2">
                {TEE_COLORS.map((c) => (
                  <button key={c.name} onClick={() => setSelectedColor(c)}
                    className={`w-9 h-9 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full transition-all duration-300 ${
                      selectedColor.name === c.name
                        ? 'ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-md'
                        : 'ring-1 ring-gray-200 hover:scale-105'
                    }`}
                    style={{ background: c.hex, borderColor: c.border }} title={c.name} />
                ))}
              </div>
            </div>

            {/* Size */}
            <div className="p-3 sm:p-4 rounded-xl bg-white border border-gray-200">
              <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2 sm:mb-2.5">Size</h3>
              <div className="flex flex-wrap gap-1.5 sm:gap-1.5">
                {TEE_SIZES.map((s) => (
                  <button key={s} onClick={() => setSelectedSize(s)}
                    className={`min-w-[40px] sm:min-w-[36px] h-9 sm:h-8 px-3 sm:px-2.5 rounded-lg text-xs sm:text-xs font-semibold transition-all ${
                      selectedSize === s ? 'bg-gray-900 text-white shadow-md scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>{s}</button>
                ))}
              </div>
            </div>

            {/* Placement */}
            <div className="p-3 sm:p-4 rounded-xl bg-white border border-gray-200">
              <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2 sm:mb-2.5">Print Placement</h3>
              <div className="flex gap-1.5 sm:gap-2">
                {['front', 'back', 'both'].map((p) => (
                  <button key={p} onClick={() => setPlacement(p)}                      className={`flex-1 py-2.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all ${
                        placement === p ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}>
                    {p === 'front' ? 'Front' : p === 'back' ? 'Back' : 'Front & Back'}
                    {p === 'both' && (
                      <span className={`block text-[8px] font-normal tracking-normal mt-0.5 ${placement === 'both' ? 'text-amber-300' : 'text-amber-500'}`}>
                        ₹{bothSidesPrice}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {placement === 'both' && (
                <p className="text-[9px] sm:text-[10px] text-amber-600 mt-2 flex items-start gap-1.5">
                  <Info size={12} className="sm:w-[14px] sm:h-[14px] mt-px shrink-0" />
                  <span>Both-sides printing is priced separately at ₹{bothSidesPrice}.</span>
                </p>
              )}
            </div>

            {/* Quantity — compact */}
            <div className="p-3 sm:p-4 rounded-xl bg-white border border-gray-200">
              <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2 sm:mb-2.5">Quantity</h3>
              <div className="flex items-center gap-3 sm:gap-3">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-9 h-9 sm:w-9 sm:h-9 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all flex items-center justify-center min-h-[44px] min-w-[44px]"><Minus size={16} className="sm:w-[16px] sm:h-[16px]" /></button>
                <input type="number" value={quantity} min={1} max={100}
                  onChange={e => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  className="w-14 sm:w-14 text-center py-2 sm:py-1.5 rounded-lg border border-gray-200 text-sm sm:text-sm font-bold focus:outline-none focus:ring-1 focus:ring-gray-400 min-h-[44px] sm:min-h-0" />
                <button onClick={() => setQuantity(q => Math.min(100, q + 1))}
                  className="w-9 h-9 sm:w-9 sm:h-9 rounded-lg bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all flex items-center justify-center min-h-[44px] min-w-[44px]"><Plus size={16} className="sm:w-[16px] sm:h-[16px]" /></button>
              </div>
            </div>

            {/* Notes — compact */}
            <div className="p-3 sm:p-4 rounded-xl bg-white border border-gray-200">
              <h3 className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-2 sm:mb-2.5">Design Notes (optional)</h3>
              <textarea value={designNotes} onChange={e => setDesignNotes(e.target.value)}
                placeholder="Colors to use, special instructions..."
                className="w-full px-3 sm:px-3 py-2 sm:py-2 rounded-lg border border-gray-200 text-xs sm:text-xs min-h-[60px] sm:min-h-[60px] focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                maxLength={300} />
            </div>

            {/* Pricing + Add to Cart — premium dark card */}
            <div className="p-4 sm:p-5 rounded-xl bg-gray-900 text-white border border-gray-800">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-white/60">Print type</span>
                <span className="text-xs sm:text-sm">{placement === 'both' ? 'Both Sides' : 'Single Side'}</span>
              </div>
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <span className="text-xs sm:text-sm text-white/60">Unit price</span>
                <span className="text-xs sm:text-sm">₹{effectiveUnitPrice}</span>
              </div>
              <div className="border-t border-white/20 pt-2 sm:pt-3 flex items-center justify-between text-sm sm:text-base font-bold">
                <span>Total (×{quantity})</span>
                <span>₹{effectiveUnitPrice * quantity}</span>
              </div>
            </div>

            {/* Add to Cart — full width on mobile with shimmer */}
            <button onClick={handleAddToCart} disabled={!canAddToCart}
              className="group relative w-full py-4 sm:py-3.5 rounded-xl bg-gray-900 text-white text-sm sm:text-sm font-bold tracking-wide hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 disabled:hidden" />
              <span className="relative z-10 flex items-center gap-2">
                <ShoppingBag size={15} className="sm:w-[16px] sm:h-[16px]" />
                {!frontUpload.designFile ? 'Upload a design first' : (needsBothDesigns && !backUpload.designFile) ? 'Upload back design too' : 'Add to Cart'}
              </span>
            </button>

            {/* Link to full form */}
            <div className="text-center">
              <button onClick={() => navigate('/customize')}
                className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-gray-400 hover:text-gray-800 transition-colors group">
                Need more options? Open full design form
                <ArrowRight size={11} className="sm:w-[13px] sm:h-[13px] transition-transform duration-300 group-hover:translate-x-0.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
