import { X, Upload, Check, Image, Video } from 'lucide-react';
import { useState, useRef } from 'react';

;
import { adminAPI } from '../../../api/admin';
import toast from '../../../utils/toast';

const PLATFORMS = [
  { id: 'INSTAGRAM', label: 'Instagram', formats: ['Image (1:1, 4:5)', 'Video (1:1, 4:5)', 'Carousel (up to 10)'], maxSize: '500MB' },
  { id: 'FACEBOOK', label: 'Facebook', formats: ['Image (1.91:1, 1:1)', 'Video (16:9, 1:1)', 'Carousel (up to 10)'], maxSize: '500MB' },
  { id: 'WHATSAPP', label: 'WhatsApp', formats: ['Image', 'Video'], maxSize: '64MB' },
  { id: 'GOOGLE', label: 'Google / YouTube', formats: ['Image (1.91:1)', 'Video (16:9)'], maxSize: '100MB' },
];

const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/mov', 'video/avi', 'video/webm'];
const ACCEPTED_ALL = [...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES];

// ── Platform Dimension Requirements ──
const PLATFORM_DIMS = {
  INSTAGRAM: {
    image: { minW: 600, minH: 600, maxW: 4096, maxH: 4096, aspectRatios: ['1:1', '4:5', '1.91:1'] },
    video: { minW: 600, minH: 600, maxW: 4096, maxH: 4096, maxFileMB: 500 },
    carousel: { minW: 600, minH: 600, maxW: 4096, maxH: 4096, maxCards: 10 },
    maxFileMB: 500,
  },
  FACEBOOK: {
    image: { minW: 600, minH: 315, maxW: 4096, maxH: 4096, aspectRatios: ['1.91:1', '1:1'] },
    video: { minW: 600, minH: 315, maxW: 4096, maxH: 4096, maxFileMB: 500 },
    carousel: { minW: 600, minH: 600, maxW: 4096, maxH: 4096, maxCards: 10 },
    maxFileMB: 500,
  },
  GOOGLE: {
    image: { minW: 600, minH: 314, maxW: 4096, maxH: 4096, aspectRatios: ['1.91:1', '1:1'] },
    video: { minW: 640, minH: 360, maxW: 4096, maxH: 4096, maxFileMB: 100 },
    maxFileMB: 100,
  },
  WHATSAPP: {
    image: { minW: 400, minH: 400, maxW: 4096, maxH: 4096 },
    video: { minW: 400, minH: 400, maxW: 4096, maxH: 4096, maxFileMB: 64 },
    maxFileMB: 64,
  },
};

// ── Validation Helpers ──

/** Load an image file in the browser and get its natural dimensions. */
function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for dimension check'));
    };
    img.src = url;
  });
}

/** Validate a creative file against platform specs before uploading. Returns null if valid, or an error string. */
async function validateCreative(file, platformId, creativeType) {
  const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
  const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
  const specs = PLATFORM_DIMS[platformId];
  if (!specs) return null; // unknown platform, skip validation

  const typeKey = creativeType === 'CAROUSEL' ? 'carousel' : isVideo ? 'video' : 'image';
  const typeSpec = specs[typeKey] || specs;

  // File size check
  const maxMB = typeSpec?.maxFileMB || specs.maxFileMB || 500;
  const maxBytes = maxMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `${platformId} ${typeKey === 'video' ? 'videos' : typeKey === 'carousel' ? 'carousel images' : 'images'} must be under ${maxMB}MB. This file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`;
  }

  // Dimension check (images only — we can't easily check video dimensions in browser)
  if (isImage) {
    try {
      const { width, height } = await getImageDimensions(file);

      if (width < typeSpec.minW || height < typeSpec.minH) {
        return `${platformId} requires minimum ${typeSpec.minW}×${typeSpec.minH}px for ${typeKey === 'carousel' ? 'carousel cards' : 'images'}. This image is ${width}×${height}px.`;
      }

      if (width > typeSpec.maxW || height > typeSpec.maxH) {
        return `${platformId} supports maximum ${typeSpec.maxW}×${typeSpec.maxH}px. This image is ${width}×${height}px.`;
      }

      // Aspect ratio validation
      if (typeSpec.aspectRatios && typeSpec.aspectRatios.length > 0) {
        const ratio = width / height;
        const closeEnough = typeSpec.aspectRatios.some(ar => {
          const [w, h] = ar.split(':').map(Number);
          const targetRatio = w / h;
          return Math.abs(ratio - targetRatio) < 0.06;
        });
        if (!closeEnough) {
          const expected = typeSpec.aspectRatios.join(' or ');
          return `${platformId} recommends ${expected} aspect ratio for ${typeKey === 'carousel' ? 'carousel cards' : 'images'}. Your image is ${width}×${height}px (${(width / height).toFixed(2)}:1).`;
        }
      }
    } catch {
      // If we can't load the image, proceed anyway
    }
  }

  return null; // valid
}

export default function CampaignModal({ show, onClose, editing, form, setForm, loading, handleSave }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [carouselUploading, setCarouselUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const [previewImgError, setPreviewImgError] = useState(false);
  const [carouselImgErrors, setCarouselImgErrors] = useState({});
  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const carouselInputRef = useRef(null);

  if (!show) return null;

  const platform = PLATFORMS.find(p => p.id === form.platform) || PLATFORMS[0];

  const handleFileUpload = async (file, isCarousel = false) => {
    if (!file) return;

    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
    if (!isImage && !isVideo) {
      toast.error('Unsupported file type. Please upload an image (JPEG, PNG, WebP, GIF) or video (MP4, MOV, AVI, WebM).');
      return;
    }

    // Platform-specific file size & dimension validation
    const platformId = form.platform;
    const creativeType = isCarousel ? 'CAROUSEL' : (isVideo ? 'VIDEO' : 'IMAGE');
    const validationError = await validateCreative(file, platformId, creativeType);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    if (isCarousel) setCarouselUploading(true);
    else setUploading(true);

    try {
      const r = await adminAPI.uploadFile(formData);
      const url = r.data?.data?.url || r.data?.url || r.data?.path || null;
      if (url) {
        if (isCarousel) {
          const newItem = { url, name: file.name, size: file.size };
          setForm({ ...form, carouselUrls: [...(form.carouselUrls || []), newItem] });
        } else {
          setForm({
            ...form,
            creativeUrl: url,
            creativeType: isVideo ? 'VIDEO' : 'IMAGE',
            creativeFileName: file.name,
            creativeFileSize: file.size,
          });
        }
        toast.success(`${isVideo ? 'Video' : 'Image'} uploaded successfully`);
      } else {
        toast.error('Upload succeeded but no URL returned');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    }

    if (isCarousel) setCarouselUploading(false);
    else setUploading(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = '';
  };

  const handleCarouselFileInput = (e) => {
    const files = Array.from(e.target.files || []);
    const maxSlots = 10 - (form.carouselUrls?.length || 0);
    const toUpload = files.slice(0, maxSlots);
    if (files.length > maxSlots) {
      toast.info(`Uploading ${maxSlots} of ${files.length} (max 10 cards)`);
    }
    toUpload.forEach(file => handleFileUpload(file, true));
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (form.creativeType === 'CAROUSEL') {
      const files = Array.from(e.dataTransfer?.files || []).filter(f => ACCEPTED_IMAGE_TYPES.includes(f.type));
      const maxSlots = 10 - (form.carouselUrls?.length || 0);
      files.slice(0, maxSlots).forEach(file => handleFileUpload(file, true));
    } else {
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileUpload(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const clearCreative = () => {
    setForm({ ...form, creativeUrl: '', creativeType: 'IMAGE', creativeFileName: '', creativeFileSize: 0, carouselUrls: [] });
    setPreviewImgError(false);
    setCarouselImgErrors({});
  };

  // ── Carousel DnD reorder ──
  const handleCarouselDragStart = (e, index) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCarouselDragOver = (e, index) => {
    e.preventDefault();
    setDropIndex(index);
  };

  const handleCarouselDragLeave = () => setDropIndex(null);

  const handleCarouselDrop = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDropIndex(null);
      return;
    }
    const urls = [...(form.carouselUrls || [])];
    const [moved] = urls.splice(dragIndex, 1);
    urls.splice(index, 0, moved);
    setForm({ ...form, carouselUrls: urls });
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleCarouselDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const removeCarouselCard = (index) => {
    const urls = [...(form.carouselUrls || [])];
    urls.splice(index, 1);
    setForm({ ...form, carouselUrls: urls });
  };

  const isImage = form.creativeType === 'IMAGE' || form.creativeType === 'CAROUSEL';
  const isVideo = form.creativeType === 'VIDEO';

  return (
    <div className="modal-overlay">
      <div className="detail-panel campaign-modal-panel">
        {/* Header */}
        <div className="detail-header">
          <h3>{editing ? 'Edit Campaign' : 'New Campaign'}</h3>
          <button onClick={onClose} className="modal-close-btn-icon"><X size={20} /></button>
        </div>

        <div className="form-grid" style={{ marginTop: '1rem' }}>
          {/* Campaign Name */}
          <div className="form-group form-full">
            <label>Campaign Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Summer Sale 2025" />
          </div>

          {/* Platform */}
          <div className="form-group">
            <label>Platform</label>
            <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
              {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>

          {/* Objective */}
          <div className="form-group">
            <label>Objective</label>
            <input value={form.objective} onChange={e => setForm({ ...form, objective: e.target.value })} placeholder="Brand Awareness, Sales, etc." />
          </div>

          {/* Budget */}
          <div className="form-group">
            <label>Budget (₹)</label>
            <input type="number" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} placeholder="5000" />
          </div>

          {/* Start Date */}
          <div className="form-group">
            <label>Start Date</label>
            <input type="datetime-local" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
          </div>

          {/* End Date */}
          <div className="form-group">
            <label>End Date</label>
            <input type="datetime-local" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
          </div>

          {/* Creative Type */}
          <div className="form-group">
            <label>Creative Type</label>
            <select value={form.creativeType} onChange={e => setForm({ ...form, creativeType: e.target.value })}>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
              <option value="CAROUSEL">Carousel</option>
            </select>
          </div>

          {/* Platform Format Info */}
          <div className="form-group">
            <label style={{ opacity: 0.7 }}>Recommended Formats</label>
            <div className="text-[11px] text-text-muted space-y-0.5 bg-gray-50 rounded-lg p-2.5 border border-border/50">
              {platform.formats.map((f, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-brand-black" />
                  {f}
                </div>
              ))}
            </div>
          </div>

          {/* ── Creative Upload Section ── */}
          {form.creativeType === 'CAROUSEL' ? (
            /* ── Carousel Multi-Upload ── */
            <div className="form-group form-full">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Image size={14} />
                Carousel Images {(form.carouselUrls?.length || 0) > 0 && (
                  <span className="text-[10px] text-green-600 font-semibold">({form.carouselUrls.length}/10)</span>
                )}
              </label>

              {/* Carousel Thumbnail Grid */}
              {form.carouselUrls?.length > 0 && (
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {form.carouselUrls.map((item, idx) => (
                    <div key={idx}
                      draggable
                      onDragStart={(e) => handleCarouselDragStart(e, idx)}
                      onDragOver={(e) => handleCarouselDragOver(e, idx)}
                      onDragLeave={handleCarouselDragLeave}
                      onDrop={(e) => handleCarouselDrop(e, idx)}
                      onDragEnd={handleCarouselDragEnd}
                      className={`relative aspect-square rounded-xl overflow-hidden bg-gray-100 border-2 cursor-grab active:cursor-grabbing group transition-all
                        ${dropIndex === idx ? 'border-brand-black scale-105 ring-2 ring-brand-black/20' : 'border-border'}
                        ${dragIndex === idx ? 'opacity-40 scale-90' : ''}`}
                    >
                      {carouselImgErrors[idx] ? (
                          <div className="w-full h-full flex items-center justify-center bg-gray-100">
                            <Image size={18} />
                          </div>
                        ) : (
                          <img src={item.url} alt={`Card ${idx + 1}`} className="w-full h-full object-cover"
                            onError={() => setCarouselImgErrors(prev => ({ ...prev, [idx]: true }))} />
                        )}
                      <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-brand-black/70 text-white text-[9px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </div>
                      <div className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                          onClick={(e) => { e.stopPropagation(); removeCarouselCard(idx); }} title="Remove">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 px-2 py-0.5 rounded-full">
                          Drag to reorder
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Add More Images Button */}
                  {(form.carouselUrls.length < 10) && (
                    <div
                      onClick={() => carouselInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-black hover:bg-gray-50 transition-all flex flex-col items-center justify-center cursor-pointer"
                    >
                      {carouselUploading ? (
                        <div className="spinner w-5 h-5 border-2 border-gray-300 border-t-brand-black rounded-full" />
                      ) : (
                        <>
                          <Upload size={18} />
                          <span className="text-[9px] font-semibold text-text-muted mt-1">Add</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Carousel Dropzone (shown when empty) */}
              {(!form.carouselUrls || form.carouselUrls.length === 0) && (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => carouselInputRef.current?.click()}
                  className={`upload-dropzone ${dragOver ? 'drag-over' : ''}`}
                >
                  {carouselUploading ? (
                    <div>
                      <div className="spinner w-8 h-8 border-2 border-gray-300 border-t-brand-black rounded-full mx-auto mb-2" />
                      <p className="text-sm font-semibold">Uploading images...</p>
                    </div>
                  ) : (
                    <div>
                      <div className="upload-dropzone-icon-box">
                        <Image size={20} />
                      </div>
                      <p className="text-sm font-semibold">Drop images here or click to add carousel cards</p>
                      <p className="text-xs text-text-muted mt-0.5">
                        Add up to 10 images · JPEG, PNG, WebP, GIF
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <button className="btn-dark btn-sm" onClick={(e) => { e.stopPropagation(); carouselInputRef.current?.click(); }}>
                          <Image size={12} /> Add Images
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Add More Button (when grid is showing but not full) */}
              {form.carouselUrls?.length > 0 && form.carouselUrls.length < 10 && (
                <div className="mt-2">
                  <button className="text-xs font-semibold text-brand-black hover:underline flex items-center gap-1"
                    onClick={() => carouselInputRef.current?.click()}>
                    <Upload size={11} /> Add more images ({10 - form.carouselUrls.length} slots left)
                  </button>
                </div>
              )}

              <input ref={carouselInputRef} type="file" accept={ACCEPTED_IMAGE_TYPES.join(',')} multiple
                onChange={handleCarouselFileInput} style={{ display: 'none' }} />
            </div>
          ) : (
            /* ── Single Image/Video Upload ── */
            <div className="form-group form-full">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {isVideo ? <Video size={14} /> : <Image size={14} />}
                Creative Asset {form.creativeUrl ? <span className="text-[10px] text-green-600 font-semibold">(Uploaded)</span> : ''}
              </label>

              {!form.creativeUrl ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}                    onClick={() => fileInputRef.current?.click()}
                  className={`upload-dropzone upload-dropzone-lg ${dragOver ? 'drag-over' : ''}`}
                >
                  {uploading ? (
                    <div>
                      <div className="spinner w-8 h-8 border-2 border-gray-300 border-t-brand-black rounded-full mx-auto mb-2" />
                      <p className="text-sm font-semibold">Uploading...</p>
                    </div>
                  ) : (
                    <div>
                      <div className="upload-dropzone-large-icon-box">
                        <Upload size={22} />
                      </div>
                      <p className="text-sm font-semibold">Drop image/video here or click to browse</p>
                      <p className="text-xs text-text-muted mt-1">
                        Supports JPEG, PNG, WebP, GIF, MP4, MOV · Up to 500MB
                      </p>
                      <div className="flex items-center justify-center gap-2 mt-3">
                        <button className="btn-dark btn-sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                          <Upload size={12} /> Browse Files
                        </button>
                        <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); videoInputRef.current?.click(); }}>
                          <Video size={12} /> Browse Video
                        </button>
                      </div>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept={ACCEPTED_ALL.join(',')} onChange={handleFileInput} style={{ display: 'none' }} />
                  <input ref={videoInputRef} type="file" accept={ACCEPTED_VIDEO_TYPES.join(',')} onChange={handleFileInput} style={{ display: 'none' }} />
                </div>
              ) : (
                <div className="bg-gray-50 rounded-2xl border border-border p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-28 h-28 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 border border-border">
                      {isVideo ? (
                        <video src={form.creativeUrl} className="w-full h-full object-cover" controls />
                      ) : previewImgError ? (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-[11px] font-semibold">
                          <Image size={22} />
                          <span>No preview</span>
                        </div>
                      ) : (
                        <img src={form.creativeUrl} alt="Creative" className="w-full h-full object-cover"
                          onError={() => setPreviewImgError(true)} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <Check size={16} />
                        {form.creativeFileName || 'Creative uploaded'}
                      </div>
                      <p className="text-xs text-text-muted mt-1 break-all">{form.creativeUrl}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-text-muted">
                        <span className="flex items-center gap-1">
                          {isVideo ? <Video size={12} /> : <Image size={12} />}
                          {form.creativeType}
                        </span>
                        {form.creativeFileSize && (
                          <span>{Math.round(form.creativeFileSize / 1024 / 1024 * 10) / 10} MB</span>
                        )}
                      </div>
                      <button className="text-xs text-red-500 font-semibold hover:underline mt-2 flex items-center gap-1"
                        onClick={clearCreative}>
                        <X size={12} /> Remove & upload new
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── URL input fallback ── */}
              <div className="creative-url-section">
                <label className="creative-url-label">Or paste a URL directly</label>
                <input value={form.creativeUrl} onChange={e => setForm({ ...form, creativeUrl: e.target.value })}
                  placeholder="https://example.com/ad-creative.jpg" className="creative-url-input" />
              </div>
            </div>
          )}

          {/* Landing URL */}
          <div className="form-group form-full">
            <label>Landing URL</label>
            <input value={form.landingUrl} onChange={e => setForm({ ...form, landingUrl: e.target.value })} placeholder="https://example.com/landing-page" />
          </div>

          {/* Notes */}
          <div className="form-group form-full">
            <label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes about this campaign..." />
          </div>
        </div>

        {/* Footer */}
        <div className="form-actions form-actions-bordered">
          <button className="btn-ghost btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn-dark btn-sm" onClick={handleSave} disabled={loading || !form.name}>
            {loading ? 'Saving...' : editing ? 'Update Campaign' : 'Create Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
