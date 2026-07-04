import { useState, useRef, useEffect, useCallback } from 'react';
import './AdvancedPageEditor.css';
import RichTextEditor from './RichTextEditor';
import ImageUploadZone from './ImageUploadZone';

/* ── SECTION CATEGORIES ── */
const SECTION_CATEGORIES = [
  { id: 'hero-cta', label: 'Hero & CTA', icon: '🎯', color: '#7c3aed' },
  { id: 'content', label: 'Content Layout', icon: '📝', color: '#2563eb' },
  { id: 'media', label: 'Media & Gallery', icon: '🖼️', color: '#0891b2' },
  { id: 'social', label: 'Social Proof', icon: '💬', color: '#059669' },
  { id: 'marketing', label: 'Marketing', icon: '📧', color: '#d97706' },
];

const CATEGORY_MAP = {
  hero: 'hero-cta',
  cta: 'hero-cta',
  content: 'content',
  twoColumn: 'content',
  features: 'content',
  stats: 'content',
  faq: 'content',
  gallery: 'media',
  video: 'media',
  testimonials: 'social',
  team: 'social',
  newsletter: 'marketing',
  pricing: 'marketing',
};

/* ── SECTION TYPE DEFINITIONS ── */
const SECTION_TYPES = {
  hero: {
    name: 'Hero Section',
    icon: '🎯',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { name: 'image', label: 'Background Image URL', type: 'media' },
      { name: 'cta_text', label: 'CTA Button Text', type: 'text' },
      { name: 'cta_link', label: 'CTA Button Link', type: 'text' },
    ],
    inlineFields: ['title', 'subtitle', 'cta_text'],
  },
  content: {
    name: 'Content Section',
    icon: '📝',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'content', label: 'Content', type: 'richtext' },
    ],
    inlineFields: ['title'],
  },
  twoColumn: {
    name: 'Two Column Section',
    icon: '📄',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'leftContent', label: 'Left Content', type: 'richtext' },
      { name: 'rightContent', label: 'Right Content', type: 'richtext' },
      { name: 'image', label: 'Right Image URL', type: 'media' },
    ],
    inlineFields: ['title'],
  },
  features: {
    name: 'Features Section',
    icon: '⭐',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'text' },
      { name: 'features', label: 'Features', type: 'list' },
    ],
    inlineFields: ['title', 'subtitle'],
  },
  stats: {
    name: 'Stats Section',
    icon: '📊',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'stats', label: 'Statistics', type: 'stats_array' },
    ],
    inlineFields: ['title'],
  },
  team: {
    name: 'Team Section',
    icon: '👥',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'members', label: 'Team Members', type: 'team_array' },
    ],
    inlineFields: ['title', 'description'],
  },
  pricing: {
    name: 'Pricing Section',
    icon: '💰',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'plans', label: 'Pricing Plans', type: 'pricing_array' },
    ],
    inlineFields: ['title'],
  },
  gallery: {
    name: 'Gallery Section',
    icon: '🖼️',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'images', label: 'Images', type: 'gallery_media' },
    ],
    inlineFields: ['title'],
  },
  testimonials: {
    name: 'Testimonials',
    icon: '💬',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'testimonials', label: 'Testimonials', type: 'testimonials_array' },
    ],
    inlineFields: ['title'],
  },
  newsletter: {
    name: 'Newsletter Signup',
    icon: '📧',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'placeholder', label: 'Input Placeholder', type: 'text' },
      { name: 'button_text', label: 'Button Text', type: 'text' },
    ],
    inlineFields: ['title', 'description', 'button_text'],
  },
  video: {
    name: 'Video Section',
    icon: '🎬',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'videoUrl', label: 'YouTube/Vimeo URL', type: 'text' },
    ],
    inlineFields: ['title', 'description'],
  },
  cta: {
    name: 'Call to Action',
    icon: '🎁',
    fields: [
      { name: 'title', label: 'CTA Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'button_text', label: 'Button Text', type: 'text' },
      { name: 'button_link', label: 'Button Link', type: 'text' },
    ],
    inlineFields: ['title', 'description', 'button_text'],
  },
  faq: {
    name: 'FAQ Section',
    icon: '❓',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'faqs', label: 'FAQs', type: 'faq_array' },
    ],
    inlineFields: ['title'],
  },
};

/* ── DEFAULT STYLES ── */
const DEFAULT_STYLES = { bgColor: '', padding: 'medium', fullWidth: false };

/* ── UNDO/REDO HOOK ── */
function useUndoRedo(initialState) {
  const [history, setHistory] = useState([JSON.stringify(initialState)]);
  const [index, setIndex] = useState(0);

  const push = useCallback((newState) => {
    setHistory((prev) => {
      const next = prev.slice(0, index + 1);
      next.push(JSON.stringify(newState));
      return next;
    });
    setIndex((prev) => prev + 1);
  }, [index]);

  const undo = useCallback(() => {
    if (index > 0) setIndex((prev) => prev - 1);
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) setIndex((prev) => prev + 1);
  }, [index, history.length]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;
  const current = JSON.parse(history[index]);

  const reset = useCallback((val) => {
    setHistory([JSON.stringify(val)]);
    setIndex(0);
  }, []);

  return { current, push, undo, redo, canUndo, canRedo, reset };
}

/* ── VISUAL ARRAY EDITOR COMPONENTS ── */

function SimpleListEditor({ value = '', onChange }) {
  const items = value ? value.split('\n').map((s) => s.trim()).filter(Boolean) : [];
  const updateItems = (newItems) => onChange(newItems.join('\n'));
  const addItem = () => updateItems([...items, '']);
  const updateItem = (idx, val) => {
    const next = [...items];
    next[idx] = val;
    updateItems(next);
  };
  const removeItem = (idx) => updateItems(items.filter((_, i) => i !== idx));
  return (
    <div className="visual-array-editor">
      {items.map((item, idx) => (
        <div key={idx} className="visual-array-item">
          <div className="visual-array-item-content">
            <div className="feature-visual">
              <div className="feature-icon">✨</div>
              <input value={item} onChange={(e) => updateItem(idx, e.target.value)} placeholder="Feature name" />
            </div>
          </div>
          <button className="array-item-remove" onClick={() => removeItem(idx)} title="Remove">✕</button>
        </div>
      ))}
      <button className="array-item-add" onClick={addItem}>+ Add Feature</button>
    </div>
  );
}

function TestimonialEditor({ value = '', onChange }) {
  let items = [];
  try { items = JSON.parse(value || '[]'); } catch { items = []; }
  const update = (newItems) => onChange(JSON.stringify(newItems));
  const addItem = () => update([...items, { text: '', author: '', rating: 5 }]);
  const updateItem = (idx, field, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    update(next);
  };
  const removeItem = (idx) => update(items.filter((_, i) => i !== idx));
  return (
    <div className="visual-array-editor">
      {items.map((item, idx) => (
        <div key={idx} className="visual-array-item">
          <div className="visual-array-item-content">
            <input value={item.text || ''} onChange={(e) => updateItem(idx, 'text', e.target.value)} placeholder="Testimonial text" />
            <div className="item-preview">
              <input value={item.author || ''} onChange={(e) => updateItem(idx, 'author', e.target.value)} placeholder="Author name" style={{ width: 140 }} />
              <span className="stars">{'★'.repeat(item.rating || 5)}{'☆'.repeat(5 - (item.rating || 5))}</span>
              <select value={item.rating || 5} onChange={(e) => updateItem(idx, 'rating', Number(e.target.value))} className="style-select">
                {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} ★</option>)}
              </select>
            </div>
          </div>
          <button className="array-item-remove" onClick={() => removeItem(idx)}>✕</button>
        </div>
      ))}
      <button className="array-item-add" onClick={addItem}>+ Add Testimonial</button>
    </div>
  );
}

function PricingEditor({ value = '', onChange }) {
  let items = [];
  try { items = JSON.parse(value || '[]'); } catch { items = []; }
  const update = (newItems) => onChange(JSON.stringify(newItems));
  const addItem = () => update([...items, { name: '', price: '', features: [] }]);
  const updateItem = (idx, field, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    update(next);
  };
  const removeItem = (idx) => update(items.filter((_, i) => i !== idx));
  const addFeature = (idx) => {
    const next = [...items];
    next[idx] = { ...next[idx], features: [...(next[idx].features || []), ''] };
    update(next);
  };
  const updateFeature = (planIdx, featIdx, val) => {
    const next = [...items];
    const feats = [...(next[planIdx].features || [])];
    feats[featIdx] = val;
    next[planIdx] = { ...next[planIdx], features: feats };
    update(next);
  };
  const removeFeature = (planIdx, featIdx) => {
    const next = [...items];
    next[planIdx] = { ...next[planIdx], features: (next[planIdx].features || []).filter((_, i) => i !== featIdx) };
    update(next);
  };
  return (
    <div className="visual-array-editor">
      {items.map((plan, idx) => (
        <div key={idx} className="visual-array-item" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            <div className="visual-array-item-content" style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
              <input value={plan.name || ''} onChange={(e) => updateItem(idx, 'name', e.target.value)} placeholder="Plan name" style={{ flex: 1 }} />
              <input value={plan.price || ''} onChange={(e) => updateItem(idx, 'price', e.target.value)} placeholder="Price" style={{ width: 80 }} />
            </div>
            <button className="array-item-remove" onClick={() => removeItem(idx)}>✕</button>
          </div>
          <div style={{ paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {(plan.features || []).map((feat, fi) => (
              <div key={fi} className="visual-array-item" style={{ padding: '4px 8px' }}>
                <input value={feat} onChange={(e) => updateFeature(idx, fi, e.target.value)} placeholder="Feature" style={{ flex: 1, fontSize: 11 }} />
                <button className="array-item-remove" onClick={() => removeFeature(idx, fi)} style={{ fontSize: 10, padding: '2px 4px' }}>✕</button>
              </div>
            ))}
            <button className="array-item-add" onClick={() => addFeature(idx)} style={{ fontSize: 10, padding: '4px 8px' }}>+ Feature</button>
          </div>
        </div>
      ))}
      <button className="array-item-add" onClick={addItem}>+ Add Plan</button>
    </div>
  );
}

function StatEditor({ value = '', onChange }) {
  let items = [];
  try { items = JSON.parse(value || '[]'); } catch { items = []; }
  const update = (newItems) => onChange(JSON.stringify(newItems));
  const addItem = () => update([...items, { number: '', label: '' }]);
  const updateItem = (idx, field, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    update(next);
  };
  const removeItem = (idx) => update(items.filter((_, i) => i !== idx));
  return (
    <div className="visual-array-editor">
      {items.map((item, idx) => (
        <div key={idx} className="visual-array-item">
          <div className="visual-array-item-content" style={{ display: 'flex', flexDirection: 'row', gap: 6 }}>
            <input value={item.number || ''} onChange={(e) => updateItem(idx, 'number', e.target.value)} placeholder="e.g. 10,000+" style={{ width: 100 }} />
            <input value={item.label || ''} onChange={(e) => updateItem(idx, 'label', e.target.value)} placeholder="e.g. Customers" style={{ flex: 1 }} />
          </div>
          <button className="array-item-remove" onClick={() => removeItem(idx)}>✕</button>
        </div>
      ))}
      <button className="array-item-add" onClick={addItem}>+ Add Stat</button>
    </div>
  );
}

function FAQEditor({ value = '', onChange }) {
  let items = [];
  try { items = JSON.parse(value || '[]'); } catch { items = []; }
  const update = (newItems) => onChange(JSON.stringify(newItems));
  const addItem = () => update([...items, { q: '', a: '' }]);
  const updateItem = (idx, field, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    update(next);
  };
  const removeItem = (idx) => update(items.filter((_, i) => i !== idx));
  return (
    <div className="visual-array-editor">
      {items.map((item, idx) => (
        <div key={idx} className="visual-array-item" style={{ flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: 6, width: '100%' }}>
            <div className="visual-array-item-content">
              <input value={item.q || ''} onChange={(e) => updateItem(idx, 'q', e.target.value)} placeholder="Question" />
            </div>
            <button className="array-item-remove" onClick={() => removeItem(idx)}>✕</button>
          </div>
          <textarea value={item.a || ''} onChange={(e) => updateItem(idx, 'a', e.target.value)} placeholder="Answer" style={{ minHeight: 50 }} />
        </div>
      ))}
      <button className="array-item-add" onClick={addItem}>+ Add FAQ</button>
    </div>
  );
}

function TeamEditor({ value = '', onChange }) {
  let items = [];
  try { items = JSON.parse(value || '[]'); } catch { items = []; }
  const update = (newItems) => onChange(JSON.stringify(newItems));
  const addItem = () => update([...items, { name: '', role: '', image: '' }]);
  const updateItem = (idx, field, val) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    update(next);
  };
  const removeItem = (idx) => update(items.filter((_, i) => i !== idx));
  return (
    <div className="visual-array-editor">
      {items.map((item, idx) => (
        <div key={idx} className="visual-array-item">
          <div className="visual-array-item-content" style={{ display: 'flex', flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            <input value={item.name || ''} onChange={(e) => updateItem(idx, 'name', e.target.value)} placeholder="Name" style={{ flex: 1, minWidth: 100 }} />
            <input value={item.role || ''} onChange={(e) => updateItem(idx, 'role', e.target.value)} placeholder="Role" style={{ flex: 1, minWidth: 100 }} />
            <input value={item.image || ''} onChange={(e) => updateItem(idx, 'image', e.target.value)} placeholder="Image URL" style={{ flex: 1, minWidth: 120 }} />
          </div>
          <button className="array-item-remove" onClick={() => removeItem(idx)}>✕</button>
        </div>
      ))}
      <button className="array-item-add" onClick={addItem}>+ Add Member</button>
    </div>
  );
}

function GalleryMediaEditor({ value = '', onChange }) {
  const items = value ? value.split('\n').map((s) => s.trim()).filter(Boolean) : [];
  const update = (newItems) => onChange(newItems.join('\n'));
  const addItem = () => update([...items, '']);
  const updateItem = (idx, val) => {
    const next = [...items];
    next[idx] = val;
    update(next);
  };
  const removeItem = (idx) => update(items.filter((_, i) => i !== idx));
  return (
    <div className="visual-array-editor">
      {items.map((item, idx) => (
        <div key={idx} className="visual-array-item">
          <div className="visual-array-item-content" style={{ display: 'flex', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <div style={{ width: 40, height: 40, borderRadius: 4, overflow: 'hidden', background: '#f0f0f5', flexShrink: 0 }}>
              {item ? <img src={item} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🖼</div>}
            </div>
            <input value={item} onChange={(e) => updateItem(idx, e.target.value)} placeholder="Image URL" style={{ flex: 1 }} />
          </div>
          <button className="array-item-remove" onClick={() => removeItem(idx)}>✕</button>
        </div>
      ))}
      <button className="array-item-add" onClick={addItem}>+ Add Image</button>
    </div>
  );
}

/* ── FIELD RENDERER ── */
function FieldRenderer({ field, value, onChange, onOpenMedia }) {
  switch (field.type) {
    case 'text':
      return <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.label} />;
    case 'textarea':
      return <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={field.label} />;
    case 'richtext':
      return (
        <div className="richtext-wrapper">
          <RichTextEditor value={value || ''} onChange={onChange} />
        </div>
      );
    case 'media':
      return (
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={field.label} style={{ flex: 1 }} />
          <button className="action-btn" onClick={() => onOpenMedia && onOpenMedia((url) => onChange(url))} title="Browse Media">📁</button>
        </div>
      );
    case 'list':
      return <SimpleListEditor value={value || ''} onChange={onChange} />;
    case 'testimonials_array':
      return <TestimonialEditor value={value || ''} onChange={onChange} />;
    case 'pricing_array':
      return <PricingEditor value={value || ''} onChange={onChange} />;
    case 'stats_array':
      return <StatEditor value={value || ''} onChange={onChange} />;
    case 'faq_array':
      return <FAQEditor value={value || ''} onChange={onChange} />;
    case 'team_array':
      return <TeamEditor value={value || ''} onChange={onChange} />;
    case 'gallery_media':
      return <GalleryMediaEditor value={value || ''} onChange={onChange} />;
    default:
      return null;
  }
}

/* ── INLINE EDIT FIELD ── */
function InlineEditField({ value, onChange, className, style, placeholder, tag: Tag = 'span' }) {
  const ref = useRef(null);
  const [editing, setEditing] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (ref.current && !editing) {
      ref.current.innerText = value || '';
    }
    prevValueRef.current = value;
  }, [value, editing]);

  const handleBlur = () => {
    setEditing(false);
    const newVal = ref.current?.innerText || '';
    if (newVal !== prevValueRef.current) {
      onChange(newVal);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      ref.current?.blur();
    }
    if (e.key === 'Escape') {
      ref.current.innerText = prevValueRef.current || '';
      ref.current?.blur();
    }
  };

  return (
    <Tag
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={className}
      style={{
        ...style,
        cursor: 'text',
        outline: editing ? '2px dashed #6366f1' : 'none',
        outlineOffset: '2px',
        borderRadius: '2px',
        transition: 'outline 0.2s ease',
      }}
      onDoubleClick={() => setEditing(true)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
    />
  );
}

/* ── HTML GENERATORS ── */
function generateHeroHTML(section) {
  const bgStyle = section.image ? `background-image: url('${section.image}'); background-size: cover; background-position: center;` : '';
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : bgStyle ? '' : 'background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);';
  return `
    <section class="hero-section" style="${extraStyle} color: white; padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '140px 20px' : '100px 20px'}; text-align: center; background-size: cover; background-position: center;">
      <div style="background: rgba(0,0,0,0.6); padding: 60px 40px; border-radius: 12px; max-width: 800px; margin: 0 auto;">
        <h1 class="inline-edit-title" style="font-size: 56px; font-weight: 800; margin: 0 0 20px 0; letter-spacing: -0.02em;">${section.title || ''}</h1>
        <p class="inline-edit-subtitle" style="font-size: 20px; margin: 0 0 40px 0; opacity: 0.95; line-height: 1.6;">${section.subtitle || ''}</p>
        ${section.cta_text ? `<a href="${section.cta_link || '#'}" class="inline-edit-cta" style="display: inline-block; background: white; color: #1a1a1a; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; transition: all 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">${section.cta_text}</a>` : ''}
      </div>
    </section>
  `;
}

function generateContentHTML(section) {
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="content-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '40px 20px' : section._styles?.padding === 'large' ? '80px 40px' : '60px 40px'}; max-width: 900px; margin: 0 auto;">
      ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; margin: 0 0 30px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
      <div style="font-size: 16px; line-height: 1.8; color: #4a4a5a;">${section.content || ''}</div>
    </section>
  `;
}

function generateTwoColumnHTML(section) {
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="two-column-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '40px 20px' : section._styles?.padding === 'large' ? '80px 40px' : '60px 40px'}; max-width: 1200px; margin: 0 auto;">
      ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; margin: 0 0 40px 0; color: #1a1a2e; text-align: center;">${section.title}</h2>` : ''}
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px; align-items: center;">
        <div style="font-size: 16px; line-height: 1.8; color: #4a4a5a;">${section.leftContent || ''}</div>
        ${section.image ? `<img loading="lazy" src="${section.image}" alt="" style="width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">` : `<div style="font-size: 16px; line-height: 1.8; color: #4a4a5a;">${section.rightContent || ''}</div>`}
      </div>
    </section>
  `;
}

function generateFeaturesHTML(section) {
  const features = (section.features || '').split('\n').map(f => f.trim()).filter(f => f);
  const bg = section._styles?.bgColor || 'linear-gradient(135deg, #fafafa 0%, #f0f0f5 100%)';
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="features-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; background: ${bg};">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 15px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
        ${section.subtitle ? `<p class="inline-edit-subtitle" style="font-size: 18px; text-align: center; color: #8a8a9a; margin: 0 0 50px 0;">${section.subtitle}</p>` : ''}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px;">
          ${features.map(f => `
            <div style="background: white; padding: 40px 30px; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); border-left: 4px solid #1a1a1a;">
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 15px 0; color: #1a1a2e;">✨ ${f}</h3>
              <p style="color: #8a8a9a; margin: 0; line-height: 1.6;">Premium feature for enhanced experience</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateStatsHTML(section) {
  let stats = [];
  try { stats = JSON.parse(section.stats || '[]'); } catch { stats = []; }
  const bg = section._styles?.bgColor || 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)';
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="stats-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; background: ${bg}; color: white;">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 60px 0;">${section.title}</h2>` : ''}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px;">
          ${stats.map((stat) => `
            <div style="text-align: center;">
              <div style="font-size: 48px; font-weight: 800; margin: 0 0 10px 0;">${stat.number || '0'}</div>
              <div style="font-size: 16px; opacity: 0.9;">${stat.label || ''}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateTeamHTML(section) {
  let members = [];
  try { members = JSON.parse(section.members || '[]'); } catch { members = []; }
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="team-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; max-width: 1200px; margin: 0 auto;">
      ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 15px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
      ${section.description ? `<p class="inline-edit-desc" style="font-size: 18px; text-align: center; color: #8a8a9a; margin: 0 0 50px 0;">${section.description}</p>` : ''}
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">
        ${members.map((member) => `
          <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
            ${member.image ? `<img loading="lazy" src="${member.image}" alt="${member.name}" style="width: 100%; height: 300px; object-fit: cover;">` : `<div style="width: 100%; height: 300px; background: #f0f0f5; display: flex; align-items: center; justify-content: center; font-size: 48px;">👤</div>`}
            <div style="padding: 25px; text-align: center;">
              <h3 style="font-size: 20px; font-weight: 600; margin: 0 0 5px 0; color: #1a1a2e;">${member.name || 'Team Member'}</h3>
              <p style="color: #888888; margin: 0; font-size: 14px; font-weight: 500;">${member.role || 'Position'}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function generateGalleryHTML(section) {
  const images = (section.images || '').split('\n').map(f => f.trim()).filter(f => f);
  const bg = section._styles?.bgColor || '#fafafa';
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="gallery-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; background: ${bg};">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 50px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
          ${images.map((img, i) => `
            <div style="border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); aspect-ratio: 1;">
              <img loading="lazy" src="${img}" alt="Gallery ${i+1}" style="width: 100%; height: 100%; object-fit: cover;">
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateTestimonialsHTML(section) {
  let testimonials = [];
  try { testimonials = JSON.parse(section.testimonials || '[]'); } catch { testimonials = []; }
  const bg = section._styles?.bgColor || 'linear-gradient(135deg, #f0f0f5 0%, #fafafa 100%)';
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="testimonials-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; background: ${bg};">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 50px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
          ${testimonials.map((t) => `
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
              <div style="color: #f59e0b; margin-bottom: 15px; font-size: 18px;">${'★'.repeat(t.rating || 5)}</div>
              <p style="font-size: 16px; line-height: 1.6; color: #4a4a5a; margin: 0 0 20px 0;">&ldquo;${t.text || 'Great experience!'}&rdquo;</p>
              <div style="font-weight: 600; color: #1a1a2e; font-size: 14px;">— ${t.author || 'Customer'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateVideoHTML(section) {
  const getEmbedUrl = (url) => {
    if (!url) return '';
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/|vimeo\.com\/)([a-zA-Z0-9_-]+)/);
    if (match) {
      const id = match[1];
      return url.includes('vimeo') ? `https://player.vimeo.com/video/${id}` : `https://www.youtube.com/embed/${id}`;
    }
    return url;
  };
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="video-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; max-width: 1000px; margin: 0 auto;">
      ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 15px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
      ${section.description ? `<p class="inline-edit-desc" style="font-size: 18px; text-align: center; color: #8a8a9a; margin: 0 0 40px 0;">${section.description}</p>` : ''}
      <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
        <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" src="${getEmbedUrl(section.videoUrl)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      </div>
    </section>
  `;
}

function generateNewsletterHTML(section) {
  const bg = section._styles?.bgColor || 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)';
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="newsletter-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; background: ${bg}; color: white;">
      <div style="max-width: 600px; margin: 0 auto; text-align: center;">
        <h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; margin: 0 0 20px 0;">${section.title || 'Subscribe to Our Newsletter'}</h2>
        <p class="inline-edit-desc" style="font-size: 18px; margin: 0 0 40px 0; opacity: 0.9;">${section.description || 'Stay updated with the latest news'}</p>
        <form style="display: flex; gap: 10px;">
          <input type="email" placeholder="${section.placeholder || 'Enter your email'}" style="flex: 1; padding: 14px 20px; border: none; border-radius: 8px; font-size: 16px; background: white; color: #1a1a2e;" required>
          <button type="submit" style="padding: 14px 30px; background: white; color: #1a1a1a; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">${section.button_text || 'Subscribe'}</button>
        </form>
      </div>
    </section>
  `;
}

function generatePricingHTML(section) {
  let plans = [];
  try { plans = JSON.parse(section.plans || '[]'); } catch { plans = []; }
  const bg = section._styles?.bgColor || '#fafafa';
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="pricing-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; background: ${bg};">
      <div style="max-width: 1200px; margin: 0 auto;">
        ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 50px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px;">
          ${plans.map((plan) => `
            <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-top: 4px solid #1a1a1a;">
              <h3 style="font-size: 24px; font-weight: 700; margin: 0 0 20px 0;">${plan.name || 'Plan'}</h3>
              <div style="font-size: 36px; font-weight: 800; margin: 0 0 20px 0;">$${plan.price || '0'}<span style="font-size: 16px; color: #8a8a9a;">/mo</span></div>
              <ul style="list-style: none; padding: 0; margin: 0 0 30px 0;">
                ${(plan.features || []).map(f => `<li style="padding: 8px 0; color: #4a4a5a;">✓ ${f}</li>`).join('')}
              </ul>
              <button style="width: 100%; padding: 12px; background: #1a1a1a; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Get Started</button>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function generateCTAHTML(section) {
  const bg = section._styles?.bgColor || 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)';
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="cta-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; background: ${bg}; color: white; text-align: center;">
      <div style="max-width: 700px; margin: 0 auto;">
        <h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; margin: 0 0 20px 0;">${section.title || ''}</h2>
        <p class="inline-edit-desc" style="font-size: 18px; margin: 0 0 40px 0; opacity: 0.95; line-height: 1.6;">${section.description || ''}</p>
        <a href="${section.button_link || '#'}" class="inline-edit-cta" style="display: inline-block; background: white; color: #1a1a1a; padding: 14px 50px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">${section.button_text || 'Learn More'}</a>
      </div>
    </section>
  `;
}

function generateFAQHTML(section) {
  let faqs = [];
  try { faqs = JSON.parse(section.faqs || '[]'); } catch { faqs = []; }
  const extraStyle = section._styles?.bgColor ? `background-color: ${section._styles.bgColor};` : '';
  return `
    <section class="faq-section" style="${extraStyle} padding: ${section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '100px 40px' : '80px 40px'}; max-width: 800px; margin: 0 auto;">
      ${section.title ? `<h2 class="inline-edit-title" style="font-size: 42px; font-weight: 700; margin: 0 0 50px 0; text-align: center; color: #1a1a2e;">${section.title}</h2>` : ''}
      <div>
        ${faqs.map((faq) => `
          <details style="margin-bottom: 20px; border: 1px solid #e5e5ea; border-radius: 8px; padding: 20px; background: #fafafa;">
            <summary style="font-weight: 600; cursor: pointer; font-size: 16px; color: #1a1a2e;">${faq.q || 'Question'}</summary>
            <p style="margin-top: 15px; color: #4a4a5a; line-height: 1.6;">${faq.a || 'Answer'}</p>
          </details>
        `).join('')}
      </div>
    </section>
  `;
}

/* ── MAIN COMPONENT ── */
export default function AdvancedPageEditor({ value, onChange }) {
  const parsed = parseSections(value);
  const {
    current: sections,
    push: pushHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useUndoRedo(parsed);

  const [activeTab, setActiveTab] = useState('builder');
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const [sectionSearch, setSectionSearch] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pageTemplates') || '[]'); } catch { return []; }
  });
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const [mediaCallback, setMediaCallback] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [undoToast, setUndoToast] = useState('');
  const [mediaUrls, setMediaUrls] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mediaLibrary') || '[]'); } catch { return []; }
  });
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sync to parent whenever sections change
  useEffect(() => {
    onChangeRef.current?.(generateHTML(sections));
  }, [sections]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) { doRedo(); } else { doUndo(); }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        doRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function parseSections(html) {
    if (!html || typeof html !== 'string') return [];
    try {
      const match = html.match(/<div class="page-sections">([\s\S]*?)<\/div>/);
      if (!match) return [];
      return JSON.parse(atob(match[1]));
    } catch { return []; }
  }

  function generateHTML(sectionData) {
    const secs = sectionData || sections;
    if (secs.length === 0) return '';

    const html = secs.map((section) => {
      switch (section.type) {
        case 'hero': return generateHeroHTML(section);
        case 'content': return generateContentHTML(section);
        case 'twoColumn': return generateTwoColumnHTML(section);
        case 'features': return generateFeaturesHTML(section);
        case 'stats': return generateStatsHTML(section);
        case 'team': return generateTeamHTML(section);
        case 'gallery': return generateGalleryHTML(section);
        case 'testimonials': return generateTestimonialsHTML(section);
        case 'video': return generateVideoHTML(section);
        case 'newsletter': return generateNewsletterHTML(section);
        case 'pricing': return generatePricingHTML(section);
        case 'cta': return generateCTAHTML(section);
        case 'faq': return generateFAQHTML(section);
        default: return '';
      }
    }).join('');

    const encodedSections = btoa(JSON.stringify(secs));
    return `<div class="page-sections">${encodedSections}</div>\n${html}`;
  }

  const showUndoToast = (msg) => {
    setUndoToast(msg);
    setTimeout(() => setUndoToast(''), 1500);
  };

  const doUndo = () => {
    if (canUndo) { undo(); showUndoToast('↩ Undo'); }
  };

  const doRedo = () => {
    if (canRedo) { redo(); showUndoToast('↪ Redo'); }
  };

  const commitChange = (newSections) => {
    pushHistory(newSections);
  };

  const addSection = (type) => {
    const newSection = {
      id: Date.now(),
      type,
      _styles: { ...DEFAULT_STYLES },
      ...Object.fromEntries(SECTION_TYPES[type].fields.map(f => [f.name, ''])),
    };
    const next = [...sections, newSection];
    commitChange(next);
    setShowAddSection(false);
    setEditingIndex(next.length - 1);
  };

  const updateSection = (index, updates) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], ...updates };
    commitChange(updated);
  };

  const deleteSection = (index) => {
    const next = sections.filter((_, i) => i !== index);
    commitChange(next);
    if (editingIndex === index) setEditingIndex(null);
  };

  const duplicateSection = (index) => {
    const cloned = { ...JSON.parse(JSON.stringify(sections[index])), id: Date.now() };
    const next = [...sections.slice(0, index + 1), cloned, ...sections.slice(index + 1)];
    commitChange(next);
  };

  // ── Drag & Drop ──
  const handleDragStart = (index) => setDraggedIndex(index);
  const handleDragOver = (e, index) => { e.preventDefault(); setDragOverIndex(index); };
  const handleDragLeave = () => setDragOverIndex(null);
  const handleDrop = (index) => {
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const next = [...sections];
    const [removed] = next.splice(draggedIndex, 1);
    next.splice(index, 0, removed);
    commitChange(next);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => { setDraggedIndex(null); setDragOverIndex(null); };

  // ── Templates ──
  const saveAsTemplate = () => {
    if (sections.length === 0) { alert('Add at least one section first'); return; }
    const name = prompt('Template name:');
    if (!name) return;
    const template = { id: Date.now(), name, sections: JSON.parse(JSON.stringify(sections)) };
    const next = [...savedTemplates, template];
    setSavedTemplates(next);
    localStorage.setItem('pageTemplates', JSON.stringify(next));
  };

  const loadTemplate = (template) => {
    if (sections.length > 0 && !confirm('Loading this template will replace all current sections. Continue?')) return;
    commitChange(JSON.parse(JSON.stringify(template.sections)));
    setShowTemplates(false);
  };

  const deleteTemplate = (id) => {
    const next = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(next);
    localStorage.setItem('pageTemplates', JSON.stringify(next));
  };

  // ── Media Browser ──
  const openMediaBrowser = (callback) => {
    setMediaCallback(() => callback);
    setShowMediaBrowser(true);
  };

  const handleMediaSelect = (url) => {
    if (mediaCallback) mediaCallback(url);
    // Save to media library
    if (url && !mediaUrls.includes(url)) {
      const next = [...mediaUrls, url];
      setMediaUrls(next);
      localStorage.setItem('mediaLibrary', JSON.stringify(next));
    }
    setShowMediaBrowser(false);
    setMediaCallback(null);
  };

  const handleMediaUpload = (url) => {
    if (url && !mediaUrls.includes(url)) {
      const next = [...mediaUrls, url];
      setMediaUrls(next);
      localStorage.setItem('mediaLibrary', JSON.stringify(next));
    }
  };

  // ── Inline Editing in Preview ──
  const handlePreviewClick = (index, fieldName) => {
    setActiveTab('builder');
    setEditingIndex(index);
    setTimeout(() => {
      const el = document.querySelector(`.section-card[data-index="${index}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleInlineEdit = (index, fieldName, newValue) => {
    updateSection(index, { [fieldName]: newValue });
  };

  // ── Filter section types based on search ──
  const sectionSearchLower = sectionSearch.toLowerCase().trim();
  const filteredEntries = Object.entries(SECTION_TYPES).filter(([key, type]) => {
    if (!sectionSearchLower) return true;
    const catId = CATEGORY_MAP[key];
    const cat = SECTION_CATEGORIES.find(c => c.id === catId);
    return (
      key.toLowerCase().includes(sectionSearchLower) ||
      type.name.toLowerCase().includes(sectionSearchLower) ||
      type.icon.includes(sectionSearchLower) ||
      (cat && cat.label.toLowerCase().includes(sectionSearchLower)) ||
      (cat && cat.id.toLowerCase().includes(sectionSearchLower)) ||
      type.fields.some(f => f.label.toLowerCase().includes(sectionSearchLower) || f.name.toLowerCase().includes(sectionSearchLower))
    );
  });

  // Group filtered entries by category
  const groupedEntries = {};
  for (const [key, type] of filteredEntries) {
    const catId = CATEGORY_MAP[key];
    if (!groupedEntries[catId]) groupedEntries[catId] = [];
    groupedEntries[catId].push([key, type]);
  }

  const hasSearch = sectionSearchLower.length > 0;

  // ── Section Preview in Builder ──
  const getSectionPreview = (section) => {
    switch (section.type) {
      case 'hero': return section.title || section.subtitle || '(empty hero)';
      case 'content': return section.title || section.content?.replace(/<[^>]*>/g, '').slice(0, 40) || '(empty content)';
      case 'twoColumn': return section.title || 'Two column layout';
      case 'features': return section.title || `${(section.features || '').split('\n').filter(Boolean).length} features`;
      case 'stats': return section.title || `${(() => { try { return JSON.parse(section.stats || '[]').length; } catch { return 0; } })()} stats`;
      case 'team': return section.title || `${(() => { try { return JSON.parse(section.members || '[]').length; } catch { return 0; } })()} members`;
      case 'gallery': return section.title || `${(section.images || '').split('\n').filter(Boolean).length} images`;
      case 'testimonials': return section.title || `${(() => { try { return JSON.parse(section.testimonials || '[]').length; } catch { return 0; } })()} testimonials`;
      case 'video': return section.title || section.videoUrl || '(video)';
      case 'newsletter': return section.title || 'Newsletter signup';
      case 'pricing': return section.title || `${(() => { try { return JSON.parse(section.plans || '[]').length; } catch { return 0; } })()} plans`;
      case 'cta': return section.title || section.cta_text || '(call to action)';
      case 'faq': return section.title || `${(() => { try { return JSON.parse(section.faqs || '[]').length; } catch { return 0; } })()} FAQs`;
      default: return '';
    }
  };

  return (
    <div className="advanced-editor">
      {/* ── Editor Toolbar ── */}
      <div className="editor-toolbar-bar">
        <div className="editor-toolbar-left">
          <button className="editor-toolbar-btn" onClick={doUndo} disabled={!canUndo} title="Undo (Ctrl+Z)">↩ Undo</button>
          <button className="editor-toolbar-btn" onClick={doRedo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">↪ Redo</button>
          <div className="editor-toolbar-sep" />
          <button className={`editor-toolbar-btn ${showTemplates ? 'active' : ''}`} onClick={() => setShowTemplates(!showTemplates)} title="Templates">📋 Templates</button>
          <button className="editor-toolbar-btn" onClick={saveAsTemplate} title="Save current as template">💾 Save Template</button>
        </div>
        <div className="editor-toolbar-right">
          <span style={{ fontSize: 10, color: '#8a8a9a', fontWeight: 600 }}>Preview:</span>
          <button className={`preview-device-btn ${previewDevice === 'desktop' ? 'active' : ''}`} onClick={() => setPreviewDevice('desktop')}>🖥 Desktop</button>
          <button className={`preview-device-btn ${previewDevice === 'tablet' ? 'active' : ''}`} onClick={() => setPreviewDevice('tablet')}>📱 Tablet</button>
          <button className={`preview-device-btn ${previewDevice === 'mobile' ? 'active' : ''}`} onClick={() => setPreviewDevice('mobile')}>📱 Mobile</button>
        </div>
      </div>

      {/* ── Undo/Redo Toast ── */}
      {undoToast && <div className="undo-toast">{undoToast}</div>}

      {/* ── Templates Bar ── */}
      {showTemplates && (
        <div className="templates-bar">
          <span className="templates-label">📋 Saved Templates</span>
          {savedTemplates.length === 0 ? (
            <span style={{ fontSize: 11, color: '#8a8a9a' }}>No saved templates yet. Build a page and click "Save Template".</span>
          ) : (
            savedTemplates.map((t) => (
              <span key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button className="template-chip" onClick={() => loadTemplate(t)}>{t.name}</button>
                <button className="template-chip save-template" onClick={() => deleteTemplate(t.id)} style={{ padding: '2px 6px', fontSize: 10 }}>✕</button>
              </span>
            ))
          )}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="editor-tabs">
        <button className={`tab-btn ${activeTab === 'builder' ? 'active' : ''}`} onClick={() => setActiveTab('builder')}>🏗️ Page Builder</button>
        <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')}>👁️ Preview {sections.length > 0 && `(${sections.length})`}</button>
        <button className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`} onClick={() => setActiveTab('html')}>&lt;/&gt; HTML</button>
      </div>

      {/* ── BUILDER ── */}
      {activeTab === 'builder' && (
        <div className="builder-panel">
          <div className="sections-list">
            {sections.length === 0 ? (
              <div className="empty-sections">
                <div className="empty-icon">📄</div>
                <h3 style={{ margin: '0 0 8px', color: '#1a1a2e' }}>Start Building Your Page</h3>
                <p style={{ margin: '0 0 20px', fontSize: 14 }}>Click the button below and choose a section type!</p>
                <button className="btn-add-section" onClick={() => setShowAddSection(true)} style={{ display: 'inline-block', margin: 0 }}>+ Add Your First Section</button>
              </div>
            ) : (
              sections.map((section, idx) => (
                <div
                  key={section.id}
                  className={`section-card ${draggedIndex === idx ? 'dragging' : ''} ${dragOverIndex === idx ? 'drag-over' : ''}`}
                  data-index={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragLeave={handleDragLeave}
                  onDrop={() => handleDrop(idx)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="section-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                      <span className="drag-handle" title="Drag to reorder">⠿</span>
                      <span className="section-type">{SECTION_TYPES[section.type]?.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ fontSize: 13, color: '#1a1a2e' }}>{SECTION_TYPES[section.type]?.name}</strong>
                        <span style={{ fontSize: 10, color: '#8a8a9a', marginLeft: 8 }}>{getSectionPreview(section)}</span>
                      </div>
                    </div>
                    <div className="section-actions">
                      <button className="action-btn duplicate" onClick={() => duplicateSection(idx)} title="Duplicate section">📋</button>
                      <button className={`action-btn ${editingIndex === idx ? 'active' : ''}`} onClick={() => setEditingIndex(editingIndex === idx ? null : idx)} title="Edit section">✏️</button>
                      <button className="action-btn delete" onClick={() => deleteSection(idx)} title="Delete section">🗑️</button>
                    </div>
                  </div>

                  {editingIndex === idx && (
                    <div className="section-form">
                      {SECTION_TYPES[section.type]?.fields.map(field => (
                        <div key={field.name} className="form-group">
                          <label>{field.label}</label>
                          <FieldRenderer
                            field={field}
                            value={section[field.name]}
                            onChange={(val) => updateSection(idx, { [field.name]: val })}
                            onOpenMedia={field.type === 'media' || field.type === 'gallery_media' ? openMediaBrowser : undefined}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* ── Section Styling Options ── */}
                  <div className="styling-options">
                    <div className="styling-group">
                      <span className="styling-label">BG</span>
                      <div className="color-picker-wrapper">
                        <input
                          type="color"
                          value={section._styles?.bgColor || '#ffffff'}
                          onChange={(e) => updateSection(idx, { _styles: { ...section._styles, bgColor: e.target.value } })}
                        />
                        <input
                          type="text"
                          value={section._styles?.bgColor || ''}
                          onChange={(e) => updateSection(idx, { _styles: { ...section._styles, bgColor: e.target.value } })}
                          placeholder="None"
                        />
                      </div>
                    </div>
                    <div className="styling-group">
                      <span className="styling-label">Padding</span>
                      <select
                        className="style-select"
                        value={section._styles?.padding || 'medium'}
                        onChange={(e) => updateSection(idx, { _styles: { ...section._styles, padding: e.target.value } })}
                      >
                        <option value="small">Small</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                      </select>
                    </div>
                    {section._styles?.bgColor && (
                      <div className="styling-group">
                        <span style={{
                          width: 16, height: 16, borderRadius: 4,
                          background: section._styles.bgColor,
                          border: '1px solid #e5e5ea',
                          display: 'inline-block',
                        }} />
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {sections.length > 0 && (
            <button className="btn-add-section" onClick={() => setShowAddSection(!showAddSection)}>
              {showAddSection ? '− Close Section Picker' : '+ Add Section'}
            </button>
          )}

          {showAddSection && (
            <div className="section-selector">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <h4 style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Section Type</h4>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder="Search sections..."
                    value={sectionSearch}
                    onChange={(e) => setSectionSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '6px 12px 6px 32px',
                      border: '1px solid #e5e5ea',
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: '"Jost", sans-serif',
                      background: '#ffffff',
                      outline: 'none',
                      transition: 'border-color 0.2s ease',
                      boxSizing: 'border-box',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#1a1a1a'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e5e5ea'; }}
                  />
                  <span style={{
                    position: 'absolute', left: 10, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 12, color: '#8a8a9a',
                    pointerEvents: 'none',
                  }}>🔍</span>
                </div>
                <span style={{ fontSize: 10, color: '#8a8a9a', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {filteredEntries.length} / {Object.entries(SECTION_TYPES).length}
                </span>
              </div>

              {filteredEntries.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#8a8a9a', fontSize: 13 }}>
                  No sections match "{sectionSearch}"<br />
                  <button
                    onClick={() => setSectionSearch('')}
                    style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, fontWeight: 600, marginTop: 4 }}
                  >
                    Clear search
                  </button>
                </div>
              ) : hasSearch ? (
                // Flat list when searching
                <div className="selector-grid">
                  {filteredEntries.map(([key, type]) => (
                    <button key={key} className="selector-btn" onClick={() => { addSection(key); setSectionSearch(''); }}>
                      <span className="selector-icon">{type.icon}</span>
                      <span className="selector-name">{type.name}</span>
                    </button>
                  ))}
                </div>
              ) : (
                // Grouped by category
                <div className="selector-categories">
                  {SECTION_CATEGORIES.map((cat) => {
                    const entries = groupedEntries[cat.id];
                    if (!entries || entries.length === 0) return null;
                    return (
                      <div key={cat.id} className="selector-category">
                        <div className="category-header" style={{ borderLeftColor: cat.color }}>
                          <span className="category-icon">{cat.icon}</span>
                          <span className="category-label">{cat.label}</span>
                          <span className="category-count">{entries.length}</span>
                        </div>
                        <div className="selector-grid">
                          {entries.map(([key, type]) => (
                            <button key={key} className="selector-btn" onClick={() => { addSection(key); setSectionSearch(''); }}>
                              <span className="selector-icon">{type.icon}</span>
                              <span className="selector-name">{type.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW ── */}
      {activeTab === 'preview' && (
        <div className="preview-panel">
          <div className={`preview-frame device-${previewDevice}`}>
            {sections.length === 0 ? (
              <div className="empty-sections" style={{ padding: 60 }}>
                <div className="empty-icon">📄</div>
                <p>Add sections to see a preview</p>
              </div>
            ) : (
              <div className="preview-content">
                {sections.map((section, idx) => (
                  <div key={section.id} className="preview-section">
                    <span className="inline-edit-hint" onClick={() => handlePreviewClick(idx)}>✏️ Edit in builder</span>
                    {section.type === 'hero' && (
                      <section className="hero-section" style={{
                        background: section._styles?.bgColor ? section._styles.bgColor : section.image ? `url(${section.image}) center/cover` : 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                        color: 'white',
                        padding: section._styles?.padding === 'small' ? '60px 20px' : section._styles?.padding === 'large' ? '140px 20px' : '100px 20px',
                        textAlign: 'center',
                      }}>
                        <div style={{ background: 'rgba(0,0,0,0.6)', padding: '60px 40px', borderRadius: 12, maxWidth: 800, margin: '0 auto' }}>
                          <InlineEditField tag="h1" value={section.title} onChange={(v) => handleInlineEdit(idx, 'title', v)}
                            className="inline-edit-title" placeholder="Hero Title"
                            style={{ fontSize: 48, fontWeight: 800, margin: '0 0 20px 0', color: 'white' }} />
                          <InlineEditField tag="p" value={section.subtitle} onChange={(v) => handleInlineEdit(idx, 'subtitle', v)}
                            className="inline-edit-subtitle" placeholder="Hero subtitle"
                            style={{ fontSize: 20, margin: '0 0 40px 0', opacity: 0.95 }} />
                          {section.cta_text && (
                            <InlineEditField tag="span" value={section.cta_text} onChange={(v) => handleInlineEdit(idx, 'cta_text', v)}
                              className="inline-edit-cta" placeholder="CTA"
                              style={{ display: 'inline-block', background: 'white', color: '#1a1a1a', padding: '14px 40px', borderRadius: 8, fontWeight: 700, fontSize: 16 }} />
                          )}
                        </div>
                      </section>
                    )}
                    {section.type === 'content' && (
                      <section className="content-section" style={{
                        ...section._styles?.bgColor && { backgroundColor: section._styles.bgColor },
                        padding: section._styles?.padding === 'small' ? '40px 20px' : section._styles?.padding === 'large' ? '80px 40px' : '60px 40px',
                        maxWidth: 900, margin: '0 auto',
                      }}>
                        {section.title && (
                          <InlineEditField tag="h2" value={section.title} onChange={(v) => handleInlineEdit(idx, 'title', v)}
                            placeholder="Section title"
                            style={{ fontSize: 42, fontWeight: 700, margin: '0 0 30px 0', color: '#1a1a2e' }} />
                        )}
                      </section>
                    )}
                    {section.type === 'twoColumn' && <div dangerouslySetInnerHTML={{ __html: generateTwoColumnHTML(section) }} />}
                    {section.type === 'features' && <div dangerouslySetInnerHTML={{ __html: generateFeaturesHTML(section) }} />}
                    {section.type === 'stats' && <div dangerouslySetInnerHTML={{ __html: generateStatsHTML(section) }} />}
                    {section.type === 'team' && <div dangerouslySetInnerHTML={{ __html: generateTeamHTML(section) }} />}
                    {section.type === 'gallery' && <div dangerouslySetInnerHTML={{ __html: generateGalleryHTML(section) }} />}
                    {section.type === 'testimonials' && <div dangerouslySetInnerHTML={{ __html: generateTestimonialsHTML(section) }} />}
                    {section.type === 'video' && <div dangerouslySetInnerHTML={{ __html: generateVideoHTML(section) }} />}
                    {section.type === 'newsletter' && <div dangerouslySetInnerHTML={{ __html: generateNewsletterHTML(section) }} />}
                    {section.type === 'pricing' && <div dangerouslySetInnerHTML={{ __html: generatePricingHTML(section) }} />}
                    {section.type === 'cta' && <div dangerouslySetInnerHTML={{ __html: generateCTAHTML(section) }} />}
                    {section.type === 'faq' && <div dangerouslySetInnerHTML={{ __html: generateFAQHTML(section) }} />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── HTML ── */}
      {activeTab === 'html' && (
        <div className="html-panel">
          <textarea
            value={generateHTML()}
            onChange={(e) => onChange(e.target.value)}
            className="html-editor"
            spellCheck="false"
          />
        </div>
      )}

      {/* ── Media Browser Modal ── */}
      {showMediaBrowser && (
        <div className="media-browser-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowMediaBrowser(false); setMediaCallback(null); } }}>
          <div className="media-browser-modal">
            <div className="media-browser-header">
              <h3>📁 Media Library</h3>
              <button className="media-browser-close" onClick={() => { setShowMediaBrowser(false); setMediaCallback(null); }}>✕</button>
            </div>
            <div className="media-browser-body">
              {/* Upload new */}
              <ImageUploadZone
                label="Upload New Image"
                onChange={(url) => {
                  handleMediaUpload(url);
                  handleMediaSelect(url);
                }}
              />

              {/* Previously uploaded gallery */}
              {mediaUrls.length > 0 && (
                <>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#1a1a2e', marginTop: 20, marginBottom: 8 }}>Previously uploaded</p>
                  <div className="media-grid">
                    {mediaUrls.map((url, i) => (
                      <div key={i} className="media-grid-item" onClick={() => handleMediaSelect(url)}>
                        <img src={url} alt={`Upload ${i}`} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
