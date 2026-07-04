import { Hammer, Mail, ArrowRight, Clock, ThumbsUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SEOHead from '../../components/seo/SEOHead';
import { settingsAPI } from '../../api/settings';
import { useSettings } from '../../store/useSettings';

function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0a] via-[#141414] to-[#1a1a1a]" />

      {/* Animated orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-gradient-to-br from-[#1a1a1a]/40 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-tl from-[#2a2a2a]/30 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '1s' }} />
      <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full bg-gradient-to-br from-[#333]/20 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

function StatusIndicator() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 mb-10">
      <div className="relative flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-amber-500" />
        <div className="absolute inset-0 w-3 h-3 rounded-full bg-amber-500 animate-ping opacity-40" style={{ animationDuration: '2s' }} />
      </div>
      <span className="text-amber-400/80 text-xs font-semibold tracking-[0.2em] uppercase">
        {t('maintenance.scheduled')} {t('maintenance.in_progress')}
      </span>
    </div>
  );
}

function AnimatedIcon() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase((p) => (p + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative mb-10">
      {/* Outer ring */}
      <div className="w-28 h-28 md:w-32 md:h-32 mx-auto rounded-full border border-white/10 flex items-center justify-center animate-bounce-soft">
        {/* Inner ring */}
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          {phase === 0 && <Hammer className="w-9 h-9 md:w-10 md:h-10 text-white/70 animate-count-pulse" />}
          {phase === 1 && <Clock className="w-9 h-9 md:w-10 md:h-10 text-white/70 animate-count-pulse" />}
          {phase === 2 && <ThumbsUp className="w-9 h-9 md:w-10 md:h-10 text-white/70 animate-count-pulse" />}
          {phase === 3 && <Hammer className="w-9 h-9 md:w-10 md:h-10 text-white/70 animate-count-pulse" />}
        </div>
      </div>

      {/* Ring glow */}
      <div className="absolute inset-0 w-28 h-28 md:w-32 md:h-32 mx-auto rounded-full bg-amber-500/5 blur-xl animate-pulse" style={{ animationDuration: '3s' }} />
    </div>
  );
}

function ProgressBar() {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) return 0;
        return p + (1 + Math.random() * 3);
      });
    }, 800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full max-w-xs mx-auto mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/40 text-[11px] font-semibold tracking-wider uppercase">{t('maintenance.progress')}</span>
        <span className="text-white/50 text-[11px] font-mono">{Math.min(Math.round(progress), 100)}%</span>
      </div>
      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500/60 to-amber-400/80 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-white/25 text-[10px] text-center mt-2 tracking-wider">
        {t('maintenance.optimizing')}
      </p>
    </div>
  );
}

function ContactCard({ contactEmail }) {
  const { t } = useTranslation();
  return (
    <div className="relative group">
      <div className="absolute -inset-[1px] bg-gradient-to-b from-white/[0.06] to-white/[0.02] rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative bg-white/[0.03] backdrop-blur-sm border border-white/[0.06] rounded-2xl p-6 md:p-7 text-center transition-all duration-300 group-hover:bg-white/[0.05] group-hover:border-white/[0.1]">
        <p className="text-white/40 text-xs font-medium tracking-wider uppercase mb-4">
          {t('maintenance.urgent_assistance')}
        </p>
        <a
          href={`mailto:${contactEmail}`}
          className="inline-flex items-center justify-center gap-2.5 text-amber-400/80 hover:text-amber-300 font-semibold text-sm transition-all duration-300 group/link"
        >
          <Mail size={16} />
          <span>{contactEmail}</span>
          <ArrowRight size={14} />
        </a>
      </div>
    </div>
  );
}

function FooterNote() {
  const { t } = useTranslation();
  return (
    <div className="mt-12 text-center">
      <div className="flex items-center justify-center gap-3 text-white/20 text-[11px] tracking-wider">
        <span className="h-px w-8 bg-white/[0.08]" />
        <span>{t('maintenance.thank_you')}</span>
        <span className="h-px w-8 bg-white/[0.08]" />
      </div>
    </div>
  );
}

export default function MaintenancePage({ embedded = false }) {
  const { t } = useTranslation();
  const [settings, setSettings] = useState(null);
  const { getSetting } = useSettings();
  const storeName = getSetting('storeName', 'THREVOLT');

  useEffect(() => {
    settingsAPI.getMaintenanceStatus()
      .then(res => setSettings(res.data?.data || null))
      .catch(() => setSettings(null));
  }, []);

  const maintenanceData = settings || {};
  const message = maintenanceData.message || "We're currently performing scheduled maintenance to enhance your shopping experience. Our team is working diligently to bring things back online with improvements.";
  const contactEmail = maintenanceData.contactEmail || 'support@threvolt.com';

  const content = (
    <div className="relative flex flex-col items-center justify-center min-h-[100dvh] px-6 py-16 text-center">
      <SEOHead
        title={`${storeName} - Under Maintenance`}
        description="We're currently performing scheduled maintenance to enhance your shopping experience. Please check back shortly."
        noIndex={true}
      />
      <AnimatedBackground />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center animate-fade-in">
        <StatusIndicator />
        <AnimatedIcon />
        <ProgressBar />

        {/* Brand name */}
        {storeName && (
          <div className="mb-4">
            <span className="text-white/15 text-[10px] font-semibold tracking-[0.3em] uppercase">
              {storeName}
            </span>
          </div>
        )}

        {/* Heading */}
        <h1 className="text-white font-display text-3xl md:text-4xl lg:text-5xl font-extrabold mb-4 leading-[1.1] tracking-tight">
          {t('maintenance.enhancing')}
          <br />
          <span className="bg-gradient-to-r from-white/90 via-white/70 to-white/50 bg-clip-text text-transparent">
            {t('maintenance.shopping_experience')}
          </span>
        </h1>

        {/* Description */}
        <p className="text-white/40 text-sm md:text-base leading-relaxed max-w-sm mx-auto mb-10">
          {message}
        </p>

        {/* Contact card */}
        <ContactCard contactEmail={contactEmail} />

        <FooterNote />
      </div>
    </div>
  );

  if (embedded) {
    return content;
  }

  return content;
}
