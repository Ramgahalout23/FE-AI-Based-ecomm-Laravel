import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, ShoppingBag, X, Ruler, Palette, Type, Info } from 'lucide-react';
import useCartStore from '../../store/cartStore';
import { useSettings } from '../../store/useSettings';
import useDesignUpload from '../../hooks/useDesignUpload';
import { CUSTOM_TEE_PRODUCT_ID } from '../../utils/constants';
import toast from '../../utils/toast';
import SEOHead from '../../components/seo/SEOHead';

/* ═══════════ CONSTANTS ═══════════ */
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

/* ═══════════ SHARED DESIGN UPLOAD AREA ═══════════ */
function DesignUploadArea({ upload, label, id }) {
  return (
    <div className="p-6 rounded-2xl bg-white border border-gray-200">
      <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
        <Upload size={13} /> {label}
      </h3>
      <input ref={upload.fileInputRef} type="file" id={`custom-design-file-${id}`}
        accept="image/*,.ai,.eps,.psd,.pdf"
        onChange={upload.handleFileSelect} className="hidden" />
      {upload.designFile ? (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square flex items-center justify-center">
            <img src={upload.designFile.url} alt={label} className="max-w-full max-h-full object-contain p-4" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate flex-1">{upload.designFile.name}</span>
            {upload.designFile.serverUrl && (
              <span className="text-[8px] text-emerald-600 font-medium mr-2">✓ Uploaded</span>
            )}
            <div className="flex gap-2">
              <button onClick={() => upload.fileInputRef.current?.click()}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-[11px] font-bold hover:bg-gray-200 transition-all min-h-[44px]">
                Change
              </button>
              <button onClick={upload.removeFile}
                className="px-4 py-2 rounded-lg bg-red-50 text-red-500 text-[11px] font-bold hover:bg-red-100 transition-all min-h-[44px] min-w-[44px] flex items-center justify-center">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button onClick={() => upload.fileInputRef.current?.click()} disabled={upload.uploading}
          className="w-full border-2 border-dashed border-gray-300 rounded-xl py-12 text-center hover:border-gray-400 hover:bg-gray-50 transition-all group">
          {upload.uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full" />
              <p className="text-xs text-gray-400 font-medium">Uploading to server...</p>
            </div>
          ) : (
            <>
              <Upload size={32} className="mx-auto text-gray-300 group-hover:text-gray-400 transition-colors mb-3" />
              <p className="text-sm font-semibold text-gray-500">Click to upload {label.toLowerCase()}</p>
              <p className="text-[10px] text-gray-300 mt-1">PNG, JPG, AI, EPS, PSD, PDF (max 10MB)</p>
            </>
          )}
        </button>
      )}
    </div>
  );
}

/* ═══════════ CUSTOM DESIGN ORDER FORM ═══════════ */
export default function CustomizePage() {
  const navigate = useNavigate();
  const addItem = useCartStore((s) => s.addItem);
  const openCart = useCartStore((s) => s.openCart);

  const frontUpload = useDesignUpload();
  const backUpload = useDesignUpload();

  const { getSetting } = useSettings();

  const [selectedColor, setSelectedColor] = useState(TEE_COLORS[0]);
  const [selectedSize, setSelectedSize] = useState('M');
  const [quantity, setQuantity] = useState(1);
  const [designNotes, setDesignNotes] = useState('');
  const [placement, setPlacement] = useState('front'); // front, back, both

  // Per-side upload validation
  const needsBothDesigns = placement === 'both';
  const frontMissing = !frontUpload.designFile;
  const backMissing = needsBothDesigns && !backUpload.designFile;
  const canAddToCart = frontUpload.designFile && (!needsBothDesigns || backUpload.designFile);

  // ── Dynamic pricing from settings ──
  const singlePrintPrice = Number(getSetting('customDesignSinglePrintPrice', '699'));
  const bothSidesPrice = Number(getSetting('customDesignBothSidesPrice', '899'));
  const effectiveUnitPrice = placement === 'both' ? bothSidesPrice : singlePrintPrice;

  // ── Add to cart as custom product ──
  const handleAddToCart = useCallback(() => {
    if (!canAddToCart) {
      if (frontMissing) { toast.error('Please upload your front design first'); return; }
      if (backMissing) { toast.error('Please upload your back design first'); return; }
      toast.error('Please upload your design first');
      return;
    }

    const frontImageUrl = frontUpload.designFile.serverUrl || frontUpload.designFile.url;
    const backImageUrl = backUpload.designFile ? (backUpload.designFile.serverUrl || backUpload.designFile.url) : null;
    addItem({
      productId: CUSTOM_TEE_PRODUCT_ID,
      id: CUSTOM_TEE_PRODUCT_ID,
      name: `Custom T-Shirt (Your Design)`,
      quantity,
      size: selectedSize,
      color: selectedColor.name,
      image: frontImageUrl,
      price: effectiveUnitPrice,
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
  }, [frontUpload.designFile, backUpload.designFile, selectedSize, selectedColor, quantity, designNotes, placement, addItem, openCart, effectiveUnitPrice, canAddToCart, frontMissing, backMissing]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-gray-50 to-white">
      <SEOHead title="Custom T-Shirt Design — Order Your Custom Tee" description="Upload your own design and order custom printed t-shirts. Choose color, size, and quantity." />

      {/* ── Top Bar ── */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12 md:h-14">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-xs sm:text-sm font-semibold min-h-[44px] min-w-[44px]">
              <ArrowLeft size={16} /> Back
            </button>
            <span className="w-px h-4 bg-gray-200" />
            <h1 className="text-sm font-bold text-gray-900">Custom T-Shirt</h1>
          </div>
        </div>
      </div>

      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          
          {/* ── Header ── */}
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-gray-900">Design Your Own T-Shirt</h2>
            <p className="text-gray-400 text-sm mt-2">Upload your artwork, pick your style, and we'll print it</p>
          </div>

          {/* ── Two Column Layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* ── LEFT: Design Upload & Preview ── */}
            <div className="space-y-4">
              {needsBothDesigns ? (
                <>
                  <DesignUploadArea upload={frontUpload} label="Front Design" id="front" />
                  <DesignUploadArea upload={backUpload} label="Back Design" id="back" />
                </>
              ) : (
                <DesignUploadArea upload={frontUpload} label="Upload Your Design" id="single" />
              )}

              {/* ── Design Notes ── */}
              <div className="p-6 rounded-2xl bg-white border border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <Type size={13} /> Design Notes
                </h3>                  <textarea id="design-notes" name="designNotes" value={designNotes}
                  onChange={e => setDesignNotes(e.target.value)}
                  placeholder="Tell us about your design — colors to use, placement details, special instructions..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm min-h-[120px] focus:outline-none focus:ring-1 focus:ring-gray-400 resize-none"
                  maxLength={500} />
                <p className="text-[10px] text-gray-400 mt-1.5 text-right">{designNotes.length}/500</p>
              </div>
            </div>

            {/* ── RIGHT: Options & Pricing ── */}
            <div className="space-y-4">
              {/* ── Color ── */}
              <div className="p-6 rounded-2xl bg-white border border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <Palette size={13} /> T-Shirt Color
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {TEE_COLORS.map((c) => (
                    <button key={c.name} onClick={() => setSelectedColor(c)}
                      className={`min-w-[44px] min-h-[44px] rounded-full transition-all duration-300 ${
                        selectedColor.name === c.name
                          ? 'ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-md'
                          : 'ring-1 ring-gray-200 hover:scale-105'
                      }`}
                      style={{ background: c.hex, borderColor: c.border }} title={c.name} />
                  ))}
                </div>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 font-medium">{selectedColor.name}</p>
              </div>

              {/* ── Size ── */}
              <div className="p-6 rounded-2xl bg-white border border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <Ruler size={13} /> Size
                </h3>
                <div className="flex flex-wrap gap-2">
                  {TEE_SIZES.map((s) => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={`min-w-[44px] h-11 px-3 rounded-lg text-sm font-semibold transition-all ${
                        selectedSize === s
                          ? 'bg-gray-900 text-white shadow-md scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>

              {/* ── Placement ── */}
              <div className="p-6 rounded-2xl bg-white border border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">Print Placement</h3>
                <div className="flex gap-2.5">
                  {['front', 'back', 'both'].map((p) => (
                    <button key={p} onClick={() => setPlacement(p)}
                      className={`flex-1 py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider transition-all min-h-[44px] ${
                        placement === p ? 'bg-gray-900 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}>
                      {p === 'front' ? 'Front' : p === 'back' ? 'Back' : 'Front & Back'}
                      {p === 'both' && (
                        <span className={`block text-[9px] font-normal tracking-normal mt-0.5 ${placement === 'both' ? 'text-amber-300' : 'text-amber-500'}`}>
                          ₹{bothSidesPrice}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                {placement === 'both' && (
                  <p className="text-[10px] text-amber-600 mt-2 flex items-start gap-1.5">
                    <Info size={14} className="mt-px shrink-0" />
                    <span>Both-sides printing is priced separately at ₹{bothSidesPrice}.</span>
                  </p>
                )}
              </div>

              {/* ── Quantity ── */}
              <div className="p-6 rounded-2xl bg-white border border-gray-200">
                <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">Quantity</h3>
                <div className="flex items-center gap-3">
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all flex items-center justify-center text-lg">
                    −
                  </button>
                  <input type="number" id="custom-quantity" name="quantity" value={quantity} min={1} max={100}
                    onChange={e => setQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-16 text-center py-2 rounded-xl border border-gray-200 text-sm font-bold focus:outline-none focus:ring-1 focus:ring-gray-400 min-h-[44px]" />
                  <button onClick={() => setQuantity(q => Math.min(100, q + 1))}
                    className="min-w-[44px] min-h-[44px] rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all flex items-center justify-center text-lg">
                    +
                  </button>
                </div>
              </div>

              {/* ── Pricing ── */}
              <div className="p-6 rounded-2xl bg-gray-900 text-white border border-gray-800">
                <h3 className="text-[11px] font-bold text-white/60 uppercase tracking-[0.15em] mb-3">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/70">Print type</span>
                    <span>{placement === 'both' ? 'Both Sides' : 'Single Side'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/70">Unit price</span>
                    <span>₹{effectiveUnitPrice}</span>
                  </div>
                  <div className="border-t border-white/20 pt-2 flex justify-between font-bold text-base">
                    <span>Total (×{quantity})</span>
                    <span>₹{effectiveUnitPrice * quantity}</span>
                  </div>
                </div>
              </div>

              {/* ── Add to Cart ── */}
              <button onClick={handleAddToCart} disabled={!canAddToCart}
                className="w-full py-4 rounded-xl bg-gray-900 text-white text-sm sm:text-base font-bold tracking-wide hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg min-h-[52px]">
                <ShoppingBag size={18} />
                {!frontUpload.designFile ? 'Upload a design first' : (needsBothDesigns && !backUpload.designFile) ? 'Upload back design too' : 'Add to Cart'}
              </button>

              <p className="text-[10px] text-gray-400 text-center">
                Custom designs are reviewed before production. We'll contact you if any changes are needed.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
