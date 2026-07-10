import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Paintbrush, ChevronRight, Sparkles, Palette, Layers, Monitor, ZoomIn, X, ChevronLeft } from 'lucide-react';

/* ═══════════ SAMPLE DESIGN DATA ═══════════ */
const SAMPLE_DESIGNS = [
  {
    id: 1,
    title: 'Abstract Wave Art',
    description: 'Custom screen-printed abstract wave design on oversized fit.',
    image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=800&fit=crop&q=80',
    tag: 'Trending',
  },
  {
    id: 2,
    title: 'Typography Statement',
    description: 'Bold custom typography print on premium cotton tee.',
    image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=800&fit=crop&q=80',
    tag: 'Popular',
  },
  {
    id: 3,
    title: 'Neon Graffiti',
    description: 'Vibrant neon graffiti on black heavyweight tee.',
    image: 'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=800&fit=crop&q=80',
    tag: 'New',
  },
  {
    id: 4,
    title: 'Geometric Pattern',
    description: 'Precision geometric pattern with metallic foil accents.',
    image: 'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&h=800&fit=crop&q=80',
    tag: 'Premium',
  },
];

/* ═══════════ EXPANDED DESIGN MODAL ═══════════ */
function ExpandedDesignModal({ design, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl" />
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full sm:max-w-lg bg-[#111] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/[0.06] max-h-[90vh] overflow-y-auto"
      >
        <div className="aspect-[4/3] relative">
          <img src={design.image} alt={design.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/60 transition-colors"><X size={13} /></button>
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-white border border-white/10">{design.tag}</span>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <h3 className="text-lg sm:text-xl font-display font-bold text-white mb-2">{design.title}</h3>
          <p className="text-sm text-white/50 leading-relaxed mb-4">{design.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-[9px] sm:text-[10px] text-white/30">
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06]">Premium 300 GSM cotton</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06]">DTG Printed</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════ MOBILE GALLERY CAROUSEL ═══════════ */
function MobileGalleryCarousel({ designs, onDesignClick }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  const scroll = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.gallery-card');
    if (!card) return;
    el.scrollBy({ left: dir * (card.offsetWidth + 12), behavior: 'smooth' });
  };

  return (
    <div className="relative sm:hidden">
      <div ref={scrollRef} onScroll={updateArrows} className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-4 px-4">
        {designs.map((design, i) => (
          <motion.button
            key={design.id}
            initial={{ opacity: 0, y: 16, scale: 0.92 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onDesignClick(design)}
            className="gallery-card relative min-w-[160px] w-[160px] sm:min-w-0 snap-start rounded-xl overflow-hidden bg-gray-800 border border-white/[0.06] shrink-0 group cursor-pointer"
          >
            <div className="aspect-[3/4] relative overflow-hidden">
              <img src={design.image} alt={design.title} loading={i < 2 ? 'eager' : 'lazy'} className="w-full h-full object-cover transition-all duration-500 group-active:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <span className="absolute top-2 left-2 inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/10 backdrop-blur-sm text-[6px] font-bold uppercase tracking-wider text-white/80 border border-white/10">{design.tag}</span>
              <div className="absolute bottom-0 left-0 right-0 p-2.5">
                <h4 className="text-white font-display font-bold text-[11px] leading-tight">{design.title}</h4>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
      {canScrollLeft && (
        <button onClick={() => scroll(-1)} className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 z-10"><ChevronLeft size={12} /></button>
      )}
      {canScrollRight && (
        <button onClick={() => scroll(1)} className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 z-10"><ChevronRight size={12} /></button>
      )}
      <div className="flex items-center justify-center gap-1 mt-1">
        <span className="h-0.5 w-4 rounded-full bg-white/10" />
        <span className="text-white/15 text-[6px] font-bold uppercase tracking-[0.3em]">Swipe</span>
        <span className="h-0.5 w-4 rounded-full bg-white/10" />
      </div>
    </div>
  );
}

/* ═══════════ HOME PAGE PREMIUM CTA ═══════════ */
export default function ProfessionalDesignCTA() {
  const navigate = useNavigate();
  const [expandedDesign, setExpandedDesign] = useState(null);

  const features = [
    { icon: <Palette size={14} />, label: 'Premium Colors', desc: '8 rich shades' },
    { icon: <Layers size={14} />, label: 'Design Presets', desc: '6 curated styles' },
    { icon: <Sparkles size={14} />, label: 'Text Overlays', desc: 'Custom typography' },
    { icon: <Monitor size={14} />, label: 'Image Upload', desc: 'PNG, SVG, JPG' },
  ];

  return (
    <>
      <section className="relative py-10 sm:py-14 lg:py-16 overflow-hidden bg-gradient-to-br from-[#0a0a0a] via-[#111] to-[#0d0d0d]">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-[400px] h-[400px] rounded-full bg-white/[0.03] blur-[120px] animate-pulse" style={{ animationDuration: '7s' }} />
          <div className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full bg-white/[0.04] blur-[100px] animate-pulse" style={{ animationDuration: '9s', animationDelay: '2s' }} />
        </div>
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />

        <div className="relative z-10 max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-6 sm:gap-8 lg:gap-12">
            {/* ── LEFT: CTA Content ── */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 max-w-xl flex flex-col justify-center"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-3 sm:mb-4 self-start">
                <span className="relative w-1.5 h-1.5 rounded-full bg-white/40">
                  <span className="absolute inset-0 rounded-full bg-white/40 animate-ping opacity-30" style={{ animationDuration: '2s' }} />
                </span>
                <span className="text-white/50 text-[9px] font-bold uppercase tracking-[0.2em]">Custom Design</span>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-extrabold tracking-tight leading-[1.1]">
                <span className="text-white">Design Your Own</span>
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-300 to-gray-500 mt-0.5 sm:mt-1">
                  Custom T-Shirt
                </span>
              </h2>

              <p className="text-gray-400 sm:text-gray-500 text-xs sm:text-sm md:text-base mt-2 sm:mt-3 leading-relaxed max-w-lg">
                Fill out our custom design form to get started. Choose from premium colors,
                upload custom artwork, add text overlays — create a t-shirt that's uniquely yours.
              </p>

              <div className="grid grid-cols-2 gap-1.5 sm:gap-2 mt-4 sm:mt-5">
                {features.map((f, i) => (
                  <motion.div
                    key={f.label}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.15 + i * 0.05 }}
                    className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-2 sm:py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-300"
                  >
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/60 shrink-0">
                      {f.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="block text-white/80 text-[10px] sm:text-[11px] font-semibold leading-tight truncate">{f.label}</span>
                      <span className="hidden sm:block text-white/25 text-[8px] font-medium">{f.desc}</span>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="mt-5 sm:mt-6">
                <button
                  onClick={() => navigate('/customize')}
                  className="group relative inline-flex items-center gap-2.5 sm:gap-3 px-6 sm:px-9 py-3 sm:py-4 rounded-full bg-white text-[#0a0a0a] text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.12)] hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden w-full sm:w-auto justify-center"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <span className="relative z-10 flex items-center gap-2 sm:gap-2.5">
                    <Paintbrush size={16} className="sm:w-[17px] sm:h-[17px]" />
                    Start Designing
                    <ChevronRight size={15} className="sm:w-[17px] sm:h-[17px] transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </button>
                <p className="text-gray-500 sm:text-gray-600 text-[9px] sm:text-[10px] mt-2 font-medium tracking-wide text-center sm:text-left">
                  Upload images · Text overlays · Save &amp; revisit
                </p>
              </div>
            </motion.div>

            {/* ── RIGHT: Design Gallery ── */}
            <motion.div
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="flex-1 max-w-xl mx-auto lg:mx-0 w-full"
            >
              <div className="relative">
                <div className="hidden sm:block absolute -inset-3 rounded-2xl bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.05] pointer-events-none" />
                <div className="hidden sm:block absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-white/15 rounded-tl" />
                <div className="hidden sm:block absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-white/15 rounded-tr" />
                <div className="hidden sm:block absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-white/15 rounded-bl" />
                <div className="hidden sm:block absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-white/15 rounded-br" />

                <div className="flex sm:hidden items-center justify-center gap-2 mb-2">
                  <span className="h-px w-8 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
                  <span className="text-white/20 text-[7px] font-bold uppercase tracking-[0.3em]">Inspiration Gallery</span>
                  <span className="h-px w-8 bg-gradient-to-l from-transparent via-white/10 to-transparent rounded-full" />
                </div>

                <MobileGalleryCarousel designs={SAMPLE_DESIGNS} onDesignClick={setExpandedDesign} />

                <div className="hidden sm:grid sm:grid-cols-2 gap-2.5 p-4">
                  {SAMPLE_DESIGNS.map((design, i) => (
                    <motion.button
                      key={design.id}
                      initial={{ opacity: 0, y: 18 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.25 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setExpandedDesign(design)}
                      className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-800 border border-white/[0.06] hover:border-white/[0.15] transition-all duration-500 cursor-pointer"
                    >
                      <img src={design.image} alt={design.title} loading={i < 2 ? 'eager' : 'lazy'} className="w-full h-full object-cover transition-all duration-700 ease-out group-hover:scale-110"
                        onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.classList.add('bg-gradient-to-br', 'from-gray-800', 'to-gray-900'); }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" />
                      <div className="absolute top-2.5 left-2.5">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-white/10 backdrop-blur-md text-[7px] font-bold uppercase tracking-wider text-white/90 border border-white/10">{design.tag}</span>
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center transform scale-75 group-hover:scale-100 transition-transform duration-300">
                          <ZoomIn size={15} className="text-white" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <h4 className="text-white font-display font-bold text-xs sm:text-sm tracking-tight mb-0.5">{design.title}</h4>
                        <p className="text-white/40 text-[8px] sm:text-[10px] leading-tight line-clamp-1">{design.description}</p>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="hidden sm:flex items-center justify-center gap-3 pb-1">
                  <span className="h-px w-10 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
                  <span className="text-white/20 text-[7px] font-bold uppercase tracking-[0.3em]">Inspiration Gallery</span>
                  <span className="h-px w-10 bg-gradient-to-l from-transparent via-white/10 to-transparent rounded-full" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {expandedDesign && <ExpandedDesignModal design={expandedDesign} onClose={() => setExpandedDesign(null)} />}
      </AnimatePresence>
    </>
  );
}
