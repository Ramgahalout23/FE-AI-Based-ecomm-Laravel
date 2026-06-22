import { useState, useRef } from 'react';
import { Upload, X, Loader2 } from 'lucide-react';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';
import { getImageUrl } from '../../utils/formatters';

export default function ImageUploadZone({
  label = 'Upload Image',
  value = '',
  onChange,
  multiple = false,
  maxFiles = 10
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    const formData = new FormData();

    try {
      if (multiple) {
        files.forEach(file => formData.append('files', file));
        const res = await adminAPI.uploadMultipleFiles(formData);
        const urls = res.data?.data?.files?.map(f => f.url) || [];
        
        // Combine existing images with newly uploaded ones
        const currentUrls = value ? value.split(',').map(s => s.trim()).filter(Boolean) : [];
        const nextUrls = [...currentUrls, ...urls].slice(0, maxFiles);
        
        onChange(nextUrls.join(', '));
        toast.success(`Uploaded ${urls.length} images!`);
      } else {
        formData.append('file', files[0]);
        const res = await adminAPI.uploadFile(formData);
        const url = res.data?.data?.url || '';
        onChange(url);
        toast.success('Uploaded image successfully!');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to upload image(s)');
    } finally {
      setUploading(false);
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
          accept="image/*"
          className="hidden"
        />
        
        {uploading ? (
          <Loader2 className="w-7 h-7 text-black animate-spin" />
        ) : (
          <Upload className="w-7 h-7 text-gray-400 group-hover:text-black transition-colors" />
        )}
        
        <div className="text-xs font-semibold text-gray-700">
          {uploading ? 'Uploading assets...' : 'Drag & Drop or Click to Upload'}
        </div>
        <p className="text-[10px] text-gray-400">PNG, JPG, JPEG or WEBP (Max 10MB)</p>
      </div>

      {/* Preview Section */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 mt-1.5">
          {images.map((imgUrl, idx) => (
            <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group bg-white shadow-sm">
              <img loading="lazy" src={getImageUrl(imgUrl)}
                alt={`Asset preview ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(imgUrl);
                }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/75 hover:bg-black text-white flex items-center justify-center shadow transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
