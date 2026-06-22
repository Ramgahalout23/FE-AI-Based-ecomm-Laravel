import { useState, useRef, useEffect } from 'react';
import './AdvancedPageEditor.css';
import RichTextEditor from './RichTextEditor';

const SECTION_TYPES = {
  hero: {
    name: 'Hero Section',
    icon: '🎯',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'textarea' },
      { name: 'image', label: 'Background Image URL', type: 'text' },
      { name: 'cta_text', label: 'CTA Button Text', type: 'text' },
      { name: 'cta_link', label: 'CTA Button Link', type: 'text' },
    ]
  },
  content: {
    name: 'Content Section',
    icon: '📝',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'content', label: 'Content', type: 'richtext' },
    ]
  },
  twoColumn: {
    name: 'Two Column Section',
    icon: '📄',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'leftContent', label: 'Left Content', type: 'richtext' },
      { name: 'rightContent', label: 'Right Content', type: 'richtext' },
      { name: 'image', label: 'Right Image URL', type: 'text' },
    ]
  },
  features: {
    name: 'Features Section',
    icon: '⭐',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'subtitle', label: 'Subtitle', type: 'text' },
      { name: 'features', label: 'Features (one per line)', type: 'textarea' },
    ]
  },
  stats: {
    name: 'Stats Section',
    icon: '📊',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'stats', label: 'Stats (JSON: [{"number":"100+","label":"Customers"}])', type: 'textarea' },
    ]
  },
  team: {
    name: 'Team Section',
    icon: '👥',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'members', label: 'Team Members (JSON: [{"name":"John","role":"CEO","image":"url"}])', type: 'textarea' },
    ]
  },
  pricing: {
    name: 'Pricing Section',
    icon: '💰',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'plans', label: 'Pricing Plans (JSON)', type: 'textarea' },
    ]
  },
  gallery: {
    name: 'Gallery Section',
    icon: '🖼️',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'images', label: 'Images (one URL per line)', type: 'textarea' },
    ]
  },
  testimonials: {
    name: 'Testimonials',
    icon: '💬',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'testimonials', label: 'Testimonials (JSON: [{"text":"Great!","author":"John","rating":5}])', type: 'textarea' },
    ]
  },
  newsletter: {
    name: 'Newsletter Signup',
    icon: '📧',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'placeholder', label: 'Input Placeholder', type: 'text' },
      { name: 'button_text', label: 'Button Text', type: 'text' },
    ]
  },
  video: {
    name: 'Video Section',
    icon: '🎬',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'videoUrl', label: 'YouTube/Vimeo URL', type: 'text' },
    ]
  },
  cta: {
    name: 'Call to Action',
    icon: '🎁',
    fields: [
      { name: 'title', label: 'CTA Title', type: 'text' },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'button_text', label: 'Button Text', type: 'text' },
      { name: 'button_link', label: 'Button Link', type: 'text' },
    ]
  },
  faq: {
    name: 'FAQ Section',
    icon: '❓',
    fields: [
      { name: 'title', label: 'Section Title', type: 'text' },
      { name: 'faqs', label: 'FAQs (JSON: [{"q":"Question","a":"Answer"}])', type: 'textarea' },
    ]
  },
};

export default function AdvancedPageEditor({ value, onChange }) {
  const [sections, setSections] = useState(parseSections(value));
  const [activeTab, setActiveTab] = useState('builder');
  const [editingIndex, setEditingIndex] = useState(null);
  const [showAddSection, setShowAddSection] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Auto-sync content to parent onChange whenever sections change
  // This ensures content is always saved without needing to switch tabs first
  useEffect(() => {
    onChangeRef.current?.(generateHTML(sections));
  }, [sections]);

  function parseSections(html) {
    if (!html || typeof html !== 'string') return [];
    try {
      const match = html.match(/<div class="page-sections">([\s\S]*?)<\/div>/);
      if (!match) return [];
      const sectionsStr = match[1];
      return JSON.parse(atob(sectionsStr));
    } catch {
      return [];
    }
  }

  function generateHTML(sectionData) {
    const secs = sectionData || sections;
    if (secs.length === 0) return '';
    
    let html = secs.map((section, idx) => {
      if (section.type === 'hero') {
        return `
          <section class="hero-section" style="background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: white; padding: 100px 20px; text-align: center; background-image: url('${section.image}'); background-size: cover; background-position: center;">
            <div style="background: rgba(0,0,0,0.6); padding: 60px 40px; border-radius: 12px; max-width: 800px; margin: 0 auto;">
              <h1 style="font-size: 56px; font-weight: 800; margin: 0 0 20px 0; letter-spacing: -0.02em;">${section.title || ''}</h1>
              <p style="font-size: 20px; margin: 0 0 40px 0; opacity: 0.95; line-height: 1.6;">${section.subtitle || ''}</p>
              ${section.cta_text ? `<a href="${section.cta_link || '#'}" style="display: inline-block; background: white; color: #1a1a1a; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; transition: all 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.2);">${section.cta_text}</a>` : ''}
            </div>
          </section>
        `;
      }
      if (section.type === 'content') {
        return `
          <section class="content-section" style="padding: 60px 40px; max-width: 900px; margin: 0 auto;">
            ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; margin: 0 0 30px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
            <div style="font-size: 16px; line-height: 1.8; color: #4a4a5a;">${section.content || ''}</div>
          </section>
        `;
      }
      if (section.type === 'twoColumn') {
        return `
          <section class="two-column-section" style="padding: 60px 40px; max-width: 1200px; margin: 0 auto;">
            ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; margin: 0 0 40px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 50px; align-items: center;">
              <div style="font-size: 16px; line-height: 1.8; color: #4a4a5a;">${section.leftContent || ''}</div>
              ${section.image ? `<img loading="lazy" src="${section.image}" alt="" style="width: 100%; height: auto; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">` : `<div style="font-size: 16px; line-height: 1.8; color: #4a4a5a;">${section.rightContent || ''}</div>`}
            </div>
          </section>
        `;
      }
      if (section.type === 'features') {
        const features = (section.features || '').split('\n').map(f => f.trim()).filter(f => f);
        return `
          <section class="features-section" style="padding: 80px 40px; background: linear-gradient(135deg, #fafafa 0%, #f0f0f5 100%);">
            <div style="max-width: 1200px; margin: 0 auto;">
              ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 15px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
              ${section.subtitle ? `<p style="font-size: 18px; text-align: center; color: #8a8a9a; margin: 0 0 50px 0;">${section.subtitle}</p>` : ''}
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
      if (section.type === 'stats') {
        let stats = [];
        try {
          stats = JSON.parse(section.stats || '[]');
        } catch {
          stats = [];
        }
        return `
          <section class="stats-section" style="padding: 80px 40px; background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: white;">
            <div style="max-width: 1200px; margin: 0 auto;">
              ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 60px 0;">${section.title}</h2>` : ''}
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 40px;">
                ${stats.map((stat, i) => `
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
      if (section.type === 'team') {
        let members = [];
        try {
          members = JSON.parse(section.members || '[]');
        } catch {
          members = [];
        }
        return `
          <section class="team-section" style="padding: 80px 40px; max-width: 1200px; margin: 0 auto;">
            ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 15px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
            ${section.description ? `<p style="font-size: 18px; text-align: center; color: #8a8a9a; margin: 0 0 50px 0;">${section.description}</p>` : ''}
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 30px;">
              ${members.map((member, i) => `
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
      if (section.type === 'gallery') {
        const images = (section.images || '').split('\n').map(f => f.trim()).filter(f => f);
        return `
          <section class="gallery-section" style="padding: 80px 40px; background: #fafafa;">
            <div style="max-width: 1200px; margin: 0 auto;">
              ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 50px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
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
      if (section.type === 'testimonials') {
        let testimonials = [];
        try {
          testimonials = JSON.parse(section.testimonials || '[]');
        } catch {
          testimonials = [];
        }
        return `
          <section class="testimonials-section" style="padding: 80px 40px; background: linear-gradient(135deg, #f0f0f5 0%, #fafafa 100%);">
            <div style="max-width: 1200px; margin: 0 auto;">
              ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 50px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 30px;">
                ${testimonials.map((t, i) => `
                  <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <div style="color: #f59e0b; margin-bottom: 15px; font-size: 18px;">${'★'.repeat(t.rating || 5)}</div>
                    <p style="font-size: 16px; line-height: 1.6; color: #4a4a5a; margin: 0 0 20px 0;">"${t.text || 'Great experience!'}"</p>
                    <div style="font-weight: 600; color: #1a1a2e; font-size: 14px;">— ${t.author || 'Customer'}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          </section>
        `;
      }
      if (section.type === 'video') {
        const getEmbedUrl = (url) => {
          if (!url) return '';
          if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const id = url.split('v=')[1] || url.split('/').pop();
            return `https://www.youtube.com/embed/${id}`;
          }
          if (url.includes('vimeo.com')) {
            const id = url.split('/').pop();
            return `https://player.vimeo.com/video/${id}`;
          }
          return url;
        };
        return `
          <section class="video-section" style="padding: 80px 40px; max-width: 1000px; margin: 0 auto;">
            ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 15px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
            ${section.description ? `<p style="font-size: 18px; text-align: center; color: #8a8a9a; margin: 0 0 40px 0;">${section.description}</p>` : ''}
            <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.1);">
              <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" src="${getEmbedUrl(section.videoUrl)}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
          </section>
        `;
      }
      if (section.type === 'newsletter') {
        return `
          <section class="newsletter-section" style="padding: 80px 40px; background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: white;">
            <div style="max-width: 600px; margin: 0 auto; text-align: center;">
              <h2 style="font-size: 42px; font-weight: 700; margin: 0 0 20px 0;">${section.title || 'Subscribe to Our Newsletter'}</h2>
              <p style="font-size: 18px; margin: 0 0 40px 0; opacity: 0.9;">${section.description || 'Stay updated with the latest news'}</p>
              <form style="display: flex; gap: 10px;">
                <input type="email" placeholder="${section.placeholder || 'Enter your email'}" style="flex: 1; padding: 14px 20px; border: none; border-radius: 8px; font-size: 16; background: white; color: #1a1a2e;" required>
                <button type="submit" style="padding: 14px 30px; background: white; color: #1a1a1a; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">${section.button_text || 'Subscribe'}</button>
              </form>
            </div>
          </section>
        `;
      }
      if (section.type === 'pricing') {
        let plans = [];
        try {
          plans = JSON.parse(section.plans || '[]');
        } catch {
          plans = [];
        }
        return `
          <section class="pricing-section" style="padding: 80px 40px; background: #fafafa; max-width: 1200px; margin: 0 auto;">
            ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; text-align: center; margin: 0 0 50px 0; color: #1a1a2e;">${section.title}</h2>` : ''}
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 30px;">
              ${plans.map((plan, i) => `
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
          </section>
        `;
      }
      if (section.type === 'cta') {
        return `
          <section class="cta-section" style="padding: 80px 40px; background: linear-gradient(135deg, #1a1a1a 0%, #333 100%); color: white; text-align: center;">
            <div style="max-width: 700px; margin: 0 auto;">
              <h2 style="font-size: 42px; font-weight: 700; margin: 0 0 20px 0;">${section.title || ''}</h2>
              <p style="font-size: 18px; margin: 0 0 40px 0; opacity: 0.95; line-height: 1.6;">${section.description || ''}</p>
              <a href="${section.button_link || '#'}" style="display: inline-block; background: white; color: #1a1a1a; padding: 14px 50px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">${section.button_text || 'Learn More'}</a>
            </div>
          </section>
        `;
      }
      if (section.type === 'faq') {
        let faqs = [];
        try {
          faqs = JSON.parse(section.faqs || '[]');
        } catch {
          faqs = [];
        }
        return `
          <section class="faq-section" style="padding: 80px 40px; max-width: 800px; margin: 0 auto;">
            ${section.title ? `<h2 style="font-size: 42px; font-weight: 700; margin: 0 0 50px 0; text-align: center; color: #1a1a2e;">${section.title}</h2>` : ''}
            <div style="space-y: 20px;">
              ${faqs.map((faq, i) => `
                <details style="margin-bottom: 20px; border: 1px solid #e5e5ea; border-radius: 8px; padding: 20px; background: #fafafa;">
                  <summary style="font-weight: 600; cursor: pointer; font-size: 16px; color: #1a1a2e;">${faq.q || 'Question'}</summary>
                  <p style="margin-top: 15px; color: #4a4a5a; line-height: 1.6;">${faq.a || 'Answer'}</p>
                </details>
              `).join('')}
            </div>
          </section>
        `;
      }
      return '';
    }).join('');

    const encodedSections = btoa(JSON.stringify(secs));
    return `<div class="page-sections">${encodedSections}</div>\n${html}`;
  }

  const addSection = (type) => {
    const newSection = {
      id: Date.now(),
      type,
      ...Object.fromEntries(SECTION_TYPES[type].fields.map(f => [f.name, '']))
    };
    setSections([...sections, newSection]);
    setShowAddSection(false);
  };

  const updateSection = (index, updates) => {
    const updated = [...sections];
    updated[index] = { ...updated[index], ...updates };
    setSections(updated);
  };

  const deleteSection = (index) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const moveSection = (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;
    const updated = [...sections];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setSections(updated);
  };

  return (
    <div className="advanced-editor">
      {/* Tabs */}
      <div className="editor-tabs">
        <button 
          className={`tab-btn ${activeTab === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('builder')}
        >
          🏗️ Page Builder
        </button>
        <button 
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`}
          onClick={() => setActiveTab('html')}
        >
          &lt;/&gt; HTML
        </button>
      </div>

      {/* Builder */}
      {activeTab === 'builder' && (
        <div className="builder-panel">
          <div className="sections-list">
            {sections.length === 0 ? (
              <div className="empty-sections">
                <div className="empty-icon">📄</div>
                <p>No sections yet. Add one to get started!</p>
              </div>
            ) : (
              sections.map((section, idx) => (
                <div key={section.id} className="section-card">
                  <div className="section-header">
                    <div className="section-title">
                      <span className="section-type">{SECTION_TYPES[section.type]?.icon}</span>
                      <strong>{SECTION_TYPES[section.type]?.name}</strong>
                    </div>
                    <div className="section-actions">
                      <button title="Move Up" onClick={() => moveSection(idx, 'up')} disabled={idx === 0} className="action-btn">↑</button>
                      <button title="Move Down" onClick={() => moveSection(idx, 'down')} disabled={idx === sections.length - 1} className="action-btn">↓</button>
                      <button title="Edit" onClick={() => setEditingIndex(editingIndex === idx ? null : idx)} className="action-btn">✏️</button>
                      <button title="Delete" onClick={() => deleteSection(idx)} className="action-btn delete">🗑️</button>
                    </div>
                  </div>

                  {editingIndex === idx && (
                    <div className="section-form">
                      {SECTION_TYPES[section.type]?.fields.map(field => (
                        <div key={field.name} className="form-group">
                          <label>{field.label}</label>
                          {field.type === 'text' && (
                            <input
                              type="text"
                              value={section[field.name] || ''}
                              onChange={(e) => updateSection(idx, { [field.name]: e.target.value })}
                              placeholder={field.label}
                            />
                          )}
                          {field.type === 'textarea' && (
                            <textarea
                              value={section[field.name] || ''}
                              onChange={(e) => updateSection(idx, { [field.name]: e.target.value })}
                              rows={3}
                              placeholder={field.label}
                            />
                          )}
                          {field.type === 'richtext' && (
                            <div style={{ minHeight: '250px', border: '1px solid #e5e5ea', borderRadius: '8px', overflow: 'hidden' }}>
                              <RichTextEditor
                                value={section[field.name] || ''}
                                onChange={(content) => updateSection(idx, { [field.name]: content })}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <button 
            className="btn-add-section"
            onClick={() => setShowAddSection(!showAddSection)}
          >
            + Add Section
          </button>

          {showAddSection && (
            <div className="section-selector">
              <h4>Select Section Type</h4>
              <div className="selector-grid">
                {Object.entries(SECTION_TYPES).map(([key, type]) => (
                  <button
                    key={key}
                    className="selector-btn"
                    onClick={() => addSection(key)}
                  >
                    <span className="selector-icon">{type.icon}</span>
                    <span className="selector-name">{type.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {activeTab === 'preview' && (
        <div className="preview-panel">
          <div className="preview-content" dangerouslySetInnerHTML={{ __html: generateHTML() }} />
        </div>
      )}

      {/* HTML */}
      {activeTab === 'html' && (
        <div className="html-panel">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="html-editor"
            spellCheck="false"
          />
        </div>
      )}
    </div>
  );
}
