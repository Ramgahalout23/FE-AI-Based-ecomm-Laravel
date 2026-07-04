import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';
import { inventoryAPI } from '../../api/inventory';

/* CSS animation is in components.css (@keyframes scanLine + .scan-line class) */

/**
 * Barcode scanner modal with camera + manual SKU input + keyboard wedge support.
 * Supports EAN, UPC, Code128, Code39, QR, and all ZXing-supported formats.
 */
export default function BarcodeScannerModal({ isOpen, onClose, onVariantFound }) {
  const [mode, setMode] = useState('camera'); // 'camera' | 'manual'
  const [skuInput, setSkuInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);

  const videoRef = useRef(null);
  const codeReaderRef = useRef(null);
  const inputRef = useRef(null);
  const resultClickRef = useRef(false);
  const mountedRef = useRef(false);

  // Keyboard wedge: capture barcode scanner input (types very fast + Enter)
  const wedgeBuffer = useRef('');
  const wedgeTimer = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen || mode !== 'manual') return;
    // Hardware scanners send characters rapidly followed by Enter
    // Detect this by checking if the key is printable and input is not focused
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === 'Enter' && wedgeBuffer.current.length > 3) {
      const barcode = wedgeBuffer.current;
      wedgeBuffer.current = '';
      setSkuInput(barcode);
      handleLookup(barcode);
      return;
    }

    if (e.key.length === 1) {
      wedgeBuffer.current += e.key;
      clearTimeout(wedgeTimer.current);
      wedgeTimer.current = setTimeout(() => {
        wedgeBuffer.current = '';
      }, 100);
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(wedgeTimer.current);
    };
  }, [isOpen, handleKeyDown]);

  // ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // Mounted ref for async safety
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setMode('camera');
      setSkuInput('');
      setResult(null);
      setError(null);
      setSelectedVariant(null);
      resultClickRef.current = false;
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    if (!mountedRef.current) return;
    stopCamera();
    setScanning(true);
    setError(null);

    try {
      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      if (!mountedRef.current) { stopCamera(); return; }

      // Use the video element directly
      const videoInputDevices = await codeReader.listVideoInputDevices();
      if (!mountedRef.current) { stopCamera(); return; }

      if (videoInputDevices.length === 0) {
        setError('No camera found. Switch to Manual Entry or use a barcode scanner.');
        setScanning(false);
        setMode('manual');
        return;
      }

      // Prefer back camera for mobile
      const backCamera = videoInputDevices.find(d =>
        d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
      );
      const deviceId = backCamera?.deviceId || videoInputDevices[0].deviceId;

      await codeReader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
        if (result && mountedRef.current) {
          const barcode = result.getText();
          handleLookup(barcode);
          // Pause scanning while looking up
          codeReader.reset();
          setScanning(false);
        }
      });
    } catch (err) {
      if (!mountedRef.current) return;
      console.warn('Camera scan init failed:', err);
      setError('Could not access camera. Switch to Manual Entry or use a barcode scanner.');
      setScanning(false);
    }
  };

  const stopCamera = () => {
    if (codeReaderRef.current) {
      try {
        codeReaderRef.current.reset();
      } catch (e) { /* ignore */ }
      codeReaderRef.current = null;
    }
    // Also stop any remaining video tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleLookup = async (sku) => {
    if (!sku || sku.trim().length === 0) return;

    const cleanSku = sku.trim();
    setLookingUp(true);
    setError(null);
    setResult(null);
    setSelectedVariant(null);

    try {
      const res = await inventoryAPI.lookupVariantBySku(cleanSku);
      const data = res.data?.data;
      if (data) {
        setResult(data);
        // If it's a direct variant or simple product, pre-select it
        if (data.type === 'variant') {
          setSelectedVariant(data);
        } else if (data.type === 'product') {
          setSelectedVariant(data);
        }
        // For product_with_variants, user selects manually
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || `No item found with SKU: ${cleanSku}`;
      setError(msg);
    } finally {
      setLookingUp(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleLookup(skuInput);
  };

  const handleAdjustStock = () => {
    if (!selectedVariant) return;
    resultClickRef.current = true;

    // Convert the result to the format InventoryAdminPage expects
    const variantData = {
      id: selectedVariant.id,
      name: selectedVariant.name || selectedVariant.product_name || 'Product',
      sku: selectedVariant.sku,
      quantity: selectedVariant.quantity || 0,
      product_id: selectedVariant.product_id || selectedVariant.id,
      product_name: selectedVariant.product_name || selectedVariant.name,
    };

    onVariantFound(variantData);
    handleClose();
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const switchToManual = () => {
    stopCamera();
    setMode('manual');
    setScanning(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const retryCamera = () => {
    if (!mountedRef.current) return;
    setError(null);
    setResult(null);
    startCamera();
  };

  if (!isOpen) return null;

  const isMultiVariant = result?.type === 'product_with_variants';

  return (
    <div className="modal-overlay open" onClick={e => e.target === e.currentTarget && handleClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h3>📷 Scan Barcode</h3>
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <button
              className="btn-ghost btn-sm"
              onClick={switchToManual}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: mode === 'manual' ? 'var(--charcoal)' : 'var(--muted)' }}
            >
              ⌨️ Manual
            </button>
            <button
              className="btn-ghost btn-sm"
              onClick={retryCamera}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: mode === 'camera' ? 'var(--charcoal)' : 'var(--muted)' }}
            >
              📷 Camera
            </button>
            <button className="modal-close" onClick={handleClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Camera viewfinder */}
          {mode === 'camera' && (
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', marginBottom: '0.75rem', background: '#000' }}>
              <video
                ref={videoRef}
                style={{ width: '100%', display: 'block', minHeight: 200, maxHeight: 280, objectFit: 'cover' }}
                muted
                playsInline
              />
              {/* Scanning overlay */}
              {scanning && !result && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                }}>
                  <div style={{
                    width: 180, height: 180,
                    border: '3px solid rgba(255,255,255,0.7)',
                    borderRadius: 12,
                    position: 'relative',
                  }}>
                    <div className="scan-line" />
                  </div>
                </div>
              )}
              {/* Error overlay */}
              {error && mode === 'camera' && !result && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#fff', padding: '1rem', textAlign: 'center',
                }}>
                  <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                  <div style={{ fontSize: '0.82rem' }}>{error}</div>
                  <button className="btn-dark btn-sm" onClick={switchToManual} style={{ fontSize: '0.75rem' }}>
                    Switch to Manual Entry
                  </button>
                </div>
              )}
              {!scanning && !result && !error && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(0,0,0,0.3)',
                }}>
                  <div className="spinner" style={{ borderColor: '#fff', borderTopColor: 'transparent' }} />
                </div>
              )}
            </div>
          )}

          {/* Manual SKU input */}
          {mode === 'manual' && (
            <form onSubmit={handleManualSubmit} style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'stretch' }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={skuInput}
                  onChange={e => setSkuInput(e.target.value)}
                  placeholder="Scan or type barcode / SKU..."
                  autoFocus
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.75rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: '1rem',
                    fontWeight: 600,
                    fontFamily: 'monospace',
                    outline: 'none',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                  }}
                />
                <button
                  type="submit"
                  disabled={!skuInput.trim() || lookingUp}
                  className="btn-dark btn-sm"
                  style={{ padding: '0.65rem 1.2rem', borderRadius: 8, fontSize: '0.82rem' }}
                >
                  {lookingUp ? (
                    <><span className="spinner" style={{ width: 12, height: 12, marginRight: 4 }} /> Lookup</>
                  ) : 'Search'}
                </button>
              </div>
              <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                Tip: Hardware barcode scanners work here — just scan and the result appears automatically
              </p>
            </form>
          )}

          {/* Loading indicator */}
          {lookingUp && (
            <div className="loading-page" style={{ padding: '1.5rem' }}>
              <div className="spinner" />
              <p style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--muted)' }}>Looking up SKU...</p>
            </div>
          )}

          {/* Error message */}
          {error && !lookingUp && (
            <div className="admin-alert danger" style={{ marginBottom: '0.5rem' }}>
              <span className="admin-alert-icon">⚠️</span>
              <div className="admin-alert-body">
                <div className="admin-alert-title">Not Found</div>
                <div style={{ fontSize: '0.82rem' }}>{error}</div>
              </div>
            </div>
          )}

          {/* Scan result */}
          {result && !lookingUp && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4, #ecfdf5)',
              borderRadius: 10,
              padding: '1rem',
              border: '1px solid rgba(34,197,94,0.3)',
            }}>
              {/* Header with success */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                }}>✓</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#15803d' }}>
                    {result.type === 'variant' ? 'Variant Found' : result.type === 'product' ? 'Product Found' : 'Product with Variants'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', fontFamily: 'monospace' }}>
                    SKU: {result.sku}
                  </div>
                </div>
              </div>

              {/* Product/Variant details */}
              <div style={{
                background: '#fff', borderRadius: 8, padding: '0.65rem 0.85rem',
                border: '1px solid #e2e5ec',
              }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                  {result.product_name || result.name}
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.78rem', color: '#6b7280' }}>
                  <span>Stock: <strong style={{ color: (result.quantity || 0) < 5 ? '#ef4444' : '#1a1a1a' }}>{result.quantity ?? 0}</strong></span>
                  {result.type === 'variant' && result.attributes && (
                    <>
                      {result.attributes.color && <span>Color: {result.attributes.color}</span>}
                      {result.attributes.size && <span>Size: {result.attributes.size}</span>}
                    </>
                  )}
                </div>
              </div>

              {/* Multi-variant: show variant list for selection */}
              {isMultiVariant && result.variants && (
                <div style={{ marginTop: '0.65rem' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#6b7280', marginBottom: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Select a variant:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {result.variants.map(v => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVariant(v)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          padding: '0.45rem 0.65rem', borderRadius: 6,
                          border: `1px solid ${selectedVariant?.id === v.id ? '#22c55e' : '#e2e5ec'}`,
                          background: selectedVariant?.id === v.id ? '#f0fdf4' : '#fff',
                          cursor: 'pointer', textAlign: 'left', width: '100%',
                          fontSize: '0.8rem', transition: 'all 0.1s',
                        }}
                      >
                        <span style={{
                          width: 22, height: 22, borderRadius: '50%',
                          border: `2px solid ${selectedVariant?.id === v.id ? '#22c55e' : '#d1d5db'}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          {selectedVariant?.id === v.id && (
                            <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e' }} />
                          )}
                        </span>
                        <span style={{ flex: 1, fontWeight: 500 }}>{v.name}</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#6b7280' }}>{v.sku}</span>
                        <span style={{ fontWeight: 600, color: (v.quantity || 0) < 5 ? '#ef4444' : '#1a1a1a' }}>
                          {v.quantity ?? 0}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button className="btn-ghost btn-sm" onClick={handleClose}>
            Cancel
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {result && !isMultiVariant && selectedVariant && (
              <button
                className="btn-dark btn-sm"
                onClick={handleAdjustStock}
                style={{ background: '#22c55e', border: 'none', color: '#fff' }}
              >
                📦 Adjust Stock
              </button>
            )}
            {isMultiVariant && selectedVariant && (
              <button
                className="btn-dark btn-sm"
                onClick={handleAdjustStock}
                style={{ background: '#22c55e', border: 'none', color: '#fff' }}
              >
                📦 Adjust Stock: {selectedVariant.name}
              </button>
            )}
            {mode === 'camera' && !result && (
              <button className="btn-ghost btn-sm" onClick={retryCamera} disabled={scanning}>
                {scanning ? 'Scanning...' : 'Retry Camera'}
              </button>
            )}
            {mode === 'camera' && (
              <button className="btn-ghost btn-sm" onClick={switchToManual}>
                ⌨️ Manual Entry
              </button>
            )}
            {mode === 'manual' && !result && (
              <button className="btn-ghost btn-sm" onClick={() => { stopCamera(); setMode('camera'); startCamera(); }}>
                📷 Open Camera
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
