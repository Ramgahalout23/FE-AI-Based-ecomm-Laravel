import { X, Maximize2, Minimize2, ArrowUpDown } from 'lucide-react';
import { useState, useEffect, memo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const UNITS = { CM: 'cm', INCHES: 'in' };

const DEFAULT_SIZE_DATA = {
  XS: { chest: 86, waist: 71, length: 66, sleeve: 58 },
  S: { chest: 91, waist: 76, length: 68, sleeve: 60 },
  M: { chest: 97, waist: 81, length: 71, sleeve: 61 },
  L: { chest: 102, waist: 86, length: 73, sleeve: 63 },
  XL: { chest: 109, waist: 94, length: 76, sleeve: 65 },
  XXL: { chest: 117, waist: 102, length: 79, sleeve: 66 },
};

function cmToInches(cm) {
  return Math.round(cm / 2.54);
}

function BodySilhouette({ selectedSize, sizeData }) {
  const measurements = sizeData[selectedSize] || sizeData.M;
  const chestPct = ((measurements?.chest || 97) - 80) / 50;
  const waistPct = ((measurements?.waist || 81) - 70) / 45;
  const lenPct = ((measurements?.length || 71) - 60) / 30;

  return (
    <svg viewBox="0 0 120 240" className="w-24 md:w-28 h-auto" fill="none" stroke="currentColor" strokeWidth="1.2">
      {/* Head */}
      <ellipse cx="60" cy="14" rx="10" ry="12" className="text-gray-300" strokeWidth="1.5" />
      {/* Neck */}
      <line x1="60" y1="26" x2="60" y2="32" className="text-gray-200" />
      {/* Body */}
      <path
        d={`M ${40 - chestPct * 3} 32 Q ${38 - chestPct * 3} 48 ${42 - chestPct * 2} 60 L ${38 - waistPct * 2} 90 L ${38 - waistPct * 1} 110 L ${42} ${140 + lenPct * 8}`}
        className="text-gray-600"
        strokeLinecap="round"
      />
      <path
        d={`M ${80 + chestPct * 3} 32 Q ${82 + chestPct * 3} 48 ${78 + chestPct * 2} 60 L ${82 + waistPct * 2} 90 L ${82 + waistPct * 1} 110 L ${78} ${140 + lenPct * 8}`}
        className="text-gray-600"
        strokeLinecap="round"
      />
      {/* Shoulders */}
      <path d={`M ${30 - chestPct * 2} 34 L ${40 - chestPct * 3} 32`} className="text-gray-300" />
      <path d={`M ${90 + chestPct * 2} 34 L ${80 + chestPct * 3} 32`} className="text-gray-300" />
      {/* Arms */}
      <path d={`M ${30 - chestPct * 2} 34 L ${24 - chestPct * 2} 60 L ${22 - chestPct * 2} 90 L ${20 - chestPct * 2} 105`} className="text-gray-400" strokeLinecap="round" />
      <path d={`M ${90 + chestPct * 2} 34 L ${96 + chestPct * 2} 60 L ${98 + chestPct * 2} 90 L ${100 + chestPct * 2} 105`} className="text-gray-400" strokeLinecap="round" />
      {/* Measurement indicator lines */}
      <line x1="22" y1={48 - chestPct * 3} x2="34" y2={48 - chestPct * 3} stroke="#000" strokeWidth="2" opacity="0.6" />
      <line x1="26" y1={75 - waistPct * 2} x2="36" y2={75 - waistPct * 2} stroke="#000" strokeWidth="2" opacity="0.6" />
      <line x1="38" y1={86 + lenPct * 4} x2="46" y2={86 + lenPct * 4} stroke="#000" strokeWidth="2" opacity="0.6" />
      {/* Measurement labels */}
      <text x="14" y={48 - chestPct * 3 + 1} className="text-[5px] fill-gray-500" textAnchor="middle">C</text>
      <text x="18" y={75 - waistPct * 2 + 1} className="text-[5px] fill-gray-500" textAnchor="middle">W</text>
      <text x="30" y={86 + lenPct * 4 + 1} className="text-[5px] fill-gray-500" textAnchor="middle">L</text>
    </svg>
  );
}

export default memo(function SizeGuideModal({ isOpen, onClose, sizeData }) {
  const { t } = useTranslation();
  const [unit, setUnit] = useState(UNITS.CM);
  const [selectedSize, setSelectedSize] = useState('M');

  const sizes = (sizeData && typeof sizeData === 'object' && Object.keys(sizeData).length > 0) ? sizeData : DEFAULT_SIZE_DATA;

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const current = sizes[selectedSize] || sizes.M;
  const sizeLabels = Object.keys(sizes);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={t('size_guide.title')}
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-2xl bg-white rounded-2xl md:rounded-3xl shadow-[0_4px_40px_-12px_rgba(0,0,0,0.2),0_0_0_1px_rgba(0,0,0,0.04)_inset] overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 md:px-8 pt-5 md:pt-8 pb-4 border-b border-gray-100/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center shadow-sm">
                  <ArrowUpDown size={18} />
                </div>
                <div>
                  <h2 className="text-xl font-display font-extrabold text-black tracking-tight">{t('size_guide.title')}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{t('size_guide.find_perfect_fit')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Unit toggle */}
                <button
                  onClick={() => setUnit(unit === UNITS.CM ? UNITS.INCHES : UNITS.CM)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold text-gray-500 hover:border-gray-400 hover:text-black transition-all duration-200 active:scale-95"
                >
                  <Maximize2 size={12} />
                  {unit === UNITS.CM ? 'cm' : 'in'}
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close size guide"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-300 hover:text-black hover:bg-gray-100 transition-all duration-200 active:scale-90"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 md:p-8">
              <div className="flex flex-col md:flex-row gap-6 md:gap-12 items-start">
                {/* Silhouette + Size selector */}
                <div className="flex flex-col items-center gap-6 w-full md:w-auto">
                  <BodySilhouette selectedSize={selectedSize} sizeData={sizes} unit={unit} />

                  {/* Size selector pills */}
                  <div className="flex flex-wrap gap-2 justify-center">
                    {sizeLabels.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`w-10 h-10 rounded-xl text-xs font-bold transition-all duration-200 active:scale-90 ${
                          selectedSize === s
                            ? 'bg-black text-white shadow-md scale-105 hover:bg-gray-800'
                            : 'bg-gray-50 text-gray-600 border border-gray-200 hover:border-gray-400 hover:text-black hover:bg-gray-100/50 hover:shadow-sm'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Measurements table */}
                <div className="flex-1 w-full">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold text-black uppercase tracking-wider">{t('size_guide.measurements')}</span>
                    <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{selectedSize}</span>
                  </div>
                  <div className="rounded-xl border border-gray-200/80 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/80 border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">{t('size_guide.measurement')}</th>
                          <th className="text-right py-3 px-4 text-[10px] font-bold text-gray-500 uppercase tracking-[0.1em]">
                            {unit === UNITS.CM ? 'cm' : 'in'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {[
                          { label: t('size_guide.chest'), key: 'chest', desc: t('size_guide.chest_desc') },
                          { label: t('size_guide.waist'), key: 'waist', desc: t('size_guide.waist_desc') },
                          { label: t('size_guide.length'), key: 'length', desc: t('size_guide.length_desc') },
                          { label: t('size_guide.sleeve'), key: 'sleeve', desc: t('size_guide.sleeve_desc') },
                        ].map((m) => (
                          <tr key={m.key} className="group transition-colors hover:bg-gray-50/50">
                            <td className="py-3 px-4">
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-black">{m.label}</span>
                                <span className="text-[10px] text-gray-400 leading-tight mt-0.5">{m.desc}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="text-base font-extrabold text-black tabular-nums tracking-tight">
                                {unit === UNITS.CM ? current[m.key] : cmToInches(current[m.key])}
                              </span>
                              <span className="text-[10px] text-gray-400 ml-0.5">{unit === UNITS.CM ? 'cm' : '"'}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Fit tip */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                    className="mt-4 p-3.5 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-200/60 flex items-start gap-2.5 shadow-sm"
                  >
                    <span className="w-6 h-6 rounded-full bg-black/5 flex items-center justify-center shrink-0 mt-0.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-black">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="12" x2="12" y2="16" /><line x1="12" y1="8" x2="12.01" y2="8" />
                      </svg>
                    </span>
                    <p className="text-xs text-gray-500 leading-relaxed">
                      If your measurements fall between two sizes, we recommend choosing the <strong className="text-black font-bold">larger</strong> size for a relaxed fit. For a slimmer fit, choose the smaller size.
                    </p>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 md:px-8 py-4 border-t border-gray-100/80 shrink-0 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[11px] text-gray-400">
                <Minimize2 size={12} />
                <span>                    Unit: <strong className="text-gray-500 font-semibold">{unit === UNITS.CM ? t('size_guide.centimeters') : t('size_guide.inches')}</strong>
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-black text-white text-xs font-bold hover:bg-gray-800 transition-all duration-200 active:scale-[0.97] shadow-sm hover:shadow-md"
              >
                {t('size_guide.got_it')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});
