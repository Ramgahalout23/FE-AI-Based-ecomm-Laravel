import { useRef } from 'react';
import { RefreshCw, CheckCircle, Image as ImageIcon, X } from 'lucide-react';
import { showError } from '../../utils/toast';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Reusable photo attachment picker (extracted from the return-request form).
 * Controlled component: pass `photos` as [{ file, preview }] and `onPhotosChange`
 * with the state setter. Uploads happen in the parent form on submit.
 */
export default function PhotoUploader({
  photos = [],
  onPhotosChange,
  maxPhotos = 5,
  uploading = false,
  disabled = false,
}) {
  const inputRef = useRef(null);

  const handlePhotoSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxPhotos - photos.length;
    const toAdd = files.slice(0, remaining);
    const valid = [];
    for (const file of toAdd) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_FILE_SIZE) { showError(`${file.name} exceeds the 10MB limit`); continue; }
      valid.push({ file, preview: URL.createObjectURL(file) });
    }
    if (valid.length < toAdd.length) showError(`You can attach up to ${maxPhotos} photos`);
    if (valid.length > 0) onPhotosChange(prev => [...prev, ...valid]);
    e.target.value = '';
  };

  const removePhoto = (idx) => {
    onPhotosChange(prev => {
      if (prev[idx]?.preview?.startsWith('blob:')) URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  return (
    <div>
      {/* Preview grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mb-3">
          {photos.map((img, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
              <img src={img.preview} alt={`Attached photo ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                aria-label={`Remove photo ${idx + 1}`}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-red-500 transition-colors"
              >
                <X size={12} />
              </button>
              <div className="absolute bottom-1 left-1 w-4 h-4 rounded bg-black/60 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">{idx + 1}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        disabled={photos.length >= maxPhotos || disabled || uploading}
        onChange={handlePhotoSelect}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={photos.length >= maxPhotos || disabled || uploading}
        className={`w-full border-2 border-dashed rounded-lg p-4 text-center text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
          photos.length >= maxPhotos
            ? 'border-green-200 bg-green-50/50 text-green-600'
            : 'border-gray-200 hover:border-gray-400 hover:bg-gray-50/50 text-gray-500'
        }`}
      >
        {uploading ? (
          <span className="inline-flex items-center gap-2"><RefreshCw size={15} className="animate-spin" /> Uploading photos…</span>
        ) : photos.length >= maxPhotos ? (
          <span className="inline-flex items-center gap-2"><CheckCircle size={15} /> Photos limit reached ({maxPhotos})</span>
        ) : (
          <span className="inline-flex flex-col items-center justify-center gap-1">
            <span className="inline-flex items-center gap-2">
              <ImageIcon size={15} />
              {photos.length > 0 ? `Add more photos (${photos.length}/${maxPhotos})` : 'Drag & drop or click to attach photos'}
            </span>
            <span className="text-[10px] text-gray-400">PNG, JPG, WebP · up to 10MB each</span>
          </span>
        )}
      </button>
    </div>
  );
}
