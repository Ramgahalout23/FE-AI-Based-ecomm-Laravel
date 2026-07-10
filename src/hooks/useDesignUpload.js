import { useState, useCallback, useRef } from 'react';
import { customDesignAPI } from '../api/customizer';
import toast from '../utils/toast';

const VALID_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml'];
const VALID_EXTENSIONS = /\.(ai|eps|psd|pdf|png|jpg|jpeg|gif|webp)$/i;
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * useDesignUpload — Uploads a design file to the server immediately on selection.
 *
 * Returns:
 *  - designFile: { url, serverUrl, name, path } or null
 *  - uploading: boolean
 *  - error: string | null
 *  - handleFileSelect: (event) => Promise<void>
 *  - removeFile: () => void
 *  - fileInputRef: ref to attach to <input type="file">
 */
export default function useDesignUpload() {
  const fileInputRef = useRef(null);
  const [designFile, setDesignFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── Validate type ──
    const isImage = VALID_TYPES.includes(file.type);
    const hasValidExt = VALID_EXTENSIONS.test(file.name);
    if (!isImage && !hasValidExt) {
      toast.error('Please upload a design file (PNG, JPG, AI, EPS, PSD, PDF)');
      setError('Invalid file type');
      return;
    }

    // ── Validate size ──
    if (file.size > MAX_SIZE) {
      toast.error('File size must be under 10MB');
      setError('File too large');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // ── Show a local preview immediately using object URL ──
      const localUrl = URL.createObjectURL(file);

      // Optimistically set the local preview so the user sees their design right away
      setDesignFile({
        url: localUrl,       // local object URL for instant preview
        serverUrl: null,     // will be set after upload completes
        name: file.name,
        file,
        path: null,
      });

      // ── Upload to server ──
      const formData = new FormData();
      formData.append('image', file);

      const res = await customDesignAPI.uploadDesignImage(formData);
      const data = res.data?.data || res.data || {};

      // ── Replace local preview with server URL ──
      // Revoke the object URL to free memory
      URL.revokeObjectURL(localUrl);

      setDesignFile({
        url: data.url || localUrl,  // server URL for persistent display
        serverUrl: data.url || null,
        name: data.filename || file.name,
        path: data.path || null,
        file,
      });

      toast.success('Design uploaded!');
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Upload failed';

      // Keep the local preview on failure so the user can retry or proceed
      // (design will be uploaded at checkout if not already persisted)
      setError(msg);
      toast.error(msg + ' — You can try uploading again.');
      // Don't clear designFile — keep the local preview so the user can retry
    } finally {
      setUploading(false);
    }
  }, []);

  const removeFile = useCallback(() => {
    // Revoke any object URL to prevent memory leaks
    if (designFile?.url && !designFile.serverUrl) {
      URL.revokeObjectURL(designFile.url);
    }
    setDesignFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [designFile]);

  return {
    designFile,
    uploading,
    handleFileSelect,
    removeFile,
    fileInputRef,
  };
}
