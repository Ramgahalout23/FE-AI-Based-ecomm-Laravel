import { Upload, X, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';
import { getImageUrl, getVideoUrl } from '../../utils/formatters';

export default function ImageUploadZone({
  label = 'Upload Image',
  value = '',
  onChange,
  multiple = false,
  maxFiles = 10,
  accept = 'image/*',
  isVideo = false,
  maxSizeMB = 10
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Client-side size guard — fail fast instead of waiting for the server timeout
    const sizeLimitMB = maxSizeMB || 10;
    const oversized = files.find(f => f.size > sizeLimitMB * 1024 * 1024);
    if (oversized) {
      toast.error(`${oversized.name} exceeds the ${sizeLimitMB}MB limit`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    setProgress(0);
    const formData = new FormData();
    const onUploadProgress = (evt) => {
      if (evt.total) setProgress(Math.round((evt.loaded / evt.total) * 100));
    };

    try {
      if (multiple) {
        files.forEach(file => formData.append('files', file));
        const res = await adminAPI.uploadMultipleFiles(formData, { onUploadProgress });
        const urls = res.data?.data?.files?.map(f => f.url) || [];
        
        // Combine existing images with newly uploaded ones
        const currentUrls = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
        const nextUrls = [...currentUrls, ...urls].slice(0, maxFiles);
        
        onChange(nextUrls.join(', '));
        toast.success(`Uploaded ${urls.length} images!`);
      } else {
        formData.append('file', files[0]);
        const res = await adminAPI.uploadFile(formData, { onUploadProgress });
        const url = res.data?.data?.url || '';
        onChange(url);
        toast.success(isVideo ? 'Uploaded video successfully!' : 'Uploaded image successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload image(s)');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemove = (urlToRemove) => {
    if (multiple) {
      const currentUrls = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
      const nextUrls = currentUrls.filter(u => u !== urlToRemove);
      onChange(nextUrls.join(', '));
    } else {
      onChange('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (uploading) return;
    
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    // Simulate input change
    const event = { target: { files } };
    handleFileChange(event);
  };

  const images = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];

  return (
    <div className="w-full flex flex-col gap-2">
      <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">{label}</label>
      
      {/* Upload Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed border-gray-300 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 min-h-[110px] bg-gray-50 hover:bg-gray-100 hover:border-black group ${uploading ? 'pointer-events-none opacity-60' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple={multiple}
          accept={accept}
          className="hidden"
        />
        
        {uploading ? (
          <Loader2 className="w-7 h-7 text-black animate-spin" />
        ) : (
          <Upload className="w-7 h-7 text-gray-400 group-hover:text-black transition-colors" />
        )}
        
        <div className="text-xs font-semibold text-gray-700">
          {uploading ? `Uploading… ${progress > 0 ? progress + '%' : ''}` : 'Drag & Drop or Click to Upload'}
        </div>
        <p className="text-[10px] text-gray-400">
          {isVideo ? `MP4, WebM or MOV (Max ${maxSizeMB}MB)` : `PNG, JPG, JPEG or WEBP (Max ${maxSizeMB}MB)`}
        </p>

        {/* Upload progress bar — useful for large videos */}
        {uploading && progress > 0 && progress < 100 && (
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Preview Section */}
      {images.length > 0 && (
        <div className={`${isVideo ? 'grid-cols-1' : 'grid grid-cols-4 sm:grid-cols-5'} gap-2.5 mt-1.5`} style={isVideo ? { display: 'grid' } : undefined}>
          {images.map((imgUrl, idx) => (
            <div key={idx} className={`relative rounded-lg overflow-hidden border border-gray-200 group bg-white shadow-sm ${isVideo ? 'aspect-video' : 'aspect-square'}`}>
              {isVideo ? (
                <video
                  src={imgUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <img loading="lazy" src={getImageUrl(imgUrl)}
                  alt={`Asset preview ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(imgUrl);
                }}
                className="absolute top-1 right-1 w-8 h-8 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center shadow transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
