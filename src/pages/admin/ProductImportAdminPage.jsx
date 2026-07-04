import { useState, useRef, useCallback, useEffect } from 'react';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';

export default function ProductImportAdminPage() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState(null);
  const [showColumns, setShowColumns] = useState(false);
  const fileInputRef = useRef(null);

  // Preview state (from backend)
  const [previewData, setPreviewData] = useState(null);

  // Column mapping state
  const [columnMapping, setColumnMapping] = useState(null);
  const [showMapping, setShowMapping] = useState(false);

  // Store the original CSV headers (before any mapping) for the mapping UI
  const [originalCSVHeaders, setOriginalCSVHeaders] = useState([]);
  // Persist the initial suggested mapping separately for reliable reset
  const [initialSuggestedMapping, setInitialSuggestedMapping] = useState(null);

  // Available target fields for product import
  const availableFields = [
    'name', 'description', 'short_description', 'price', 'old_price', 'cost',
    'quantity', 'sku', 'barcode', 'category', 'brand', 'images', 'tags', 'status',
    'badge', 'is_featured', 'seo_title', 'seo_description', 'seo_keywords',
    'variant_sku', 'variant_color', 'variant_size', 'variant_price', 'variant_quantity',
  ];

  // Fetch server-side preview when file changes
  const fetchPreview = useCallback((mapping) => {
    if (!file) {
      setPreviewData(null);
      return;
    }
    setPreviewing(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (mapping && Object.keys(mapping).length > 0) {
      formData.append('column_mapping', JSON.stringify(mapping));
    }

    adminAPI.previewImport(formData)
      .then((res) => {
        const data = res.data?.data;
        if (data) {
          setPreviewData(data);
          // If this is the first preview (no mapping applied yet), initialize mapping
          if (!mapping && data.suggested_mapping) {
            setColumnMapping(data.suggested_mapping);
            // Persist the initial suggested mapping separately for reliable reset
            // (after re-preview with custom mapping, suggested_mapping changes)
            setInitialSuggestedMapping({ ...data.suggested_mapping });
            // Gather original headers from the suggested_mapping keys (original CSV column names)
            setOriginalCSVHeaders(Object.keys(data.suggested_mapping));
          }
          // Notify about validation issues
          if (data.validation?.errors > 0 || data.validation?.warnings > 0) {
            const issues = [];
            if (data.validation.errors > 0) issues.push(`${data.validation.errors} error(s)`);
            if (data.validation.warnings > 0) issues.push(`${data.validation.warnings} warning(s)`);
            toast.error(`⚠️ Server validation found ${issues.join(', ')}`);
          }
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || err.message || 'Preview failed';
        toast.error(msg);
      })
      .finally(() => setPreviewing(false));
  }, [file]);

  useEffect(() => {
    if (!file) {
      setPreviewData(null);
      setColumnMapping(null);
      setOriginalCSVHeaders([]);
      return;
    }
    fetchPreview(null);
  }, [file, fetchPreview]);

  // Handle column mapping change
  const handleMappingChange = (csvHeader, field) => {
    const updated = { ...columnMapping, [csvHeader]: field };
    setColumnMapping(updated);
  };

  // Apply the current mapping and re-fetch preview
  const applyMapping = () => {
    fetchPreview(columnMapping);
  };

  // Reset mapping to the original suggested defaults
  const resetMapping = () => {
    if (initialSuggestedMapping) {
      setColumnMapping(initialSuggestedMapping);
      fetchPreview(initialSuggestedMapping);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.type === 'text/csv' || dropped.name.endsWith('.csv'))) {
      setFile(dropped);
    } else {
      toast.error('Please drop a CSV file');
    }
  }, []);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreviewData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Select a CSV file first');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await adminAPI.importProducts(formData);
      const data = res.data?.data || res.data || {};
      setResult(data);
      if (data.imported > 0) {
        toast.success(`✅ ${data.imported} products imported!`);
      }
      if (data.errors > 0 || data.skipped > 0) {
        toast.error(`⚠️ ${data.skipped} skipped, ${data.errors} errors`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Import failed';
      toast.error(msg);
      setResult({ imported: 0, skipped: 0, errors: 1, errorDetails: [{ row: 0, message: msg }], importedProducts: [] });
    } finally {
      setLoading(false);
    }
  };

  const handleImportWithMapping = async () => {
    if (!file) {
      toast.error('Select a CSV file first');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (columnMapping && Object.keys(columnMapping).length > 0) {
        formData.append('column_mapping', JSON.stringify(columnMapping));
      }
      const res = await adminAPI.importProducts(formData);
      const data = res.data?.data || res.data || {};
      setResult(data);
      if (data.imported > 0) {
        toast.success(`✅ ${data.imported} products imported!`);
      }
      if (data.errors > 0 || data.skipped > 0) {
        toast.error(`⚠️ ${data.skipped} skipped, ${data.errors} errors`);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Import failed';
      toast.error(msg);
      setResult({ imported: 0, skipped: 0, errors: 1, errorDetails: [{ row: 0, message: msg }], importedProducts: [] });
    } finally {
      setLoading(false);
    }
  };

  // Download sample CSV template
  const downloadTemplate = () => {
    const headers = [
      'name', 'description', 'shortDescription', 'price', 'oldPrice', 'cost',
      'quantity', 'sku', 'barcode', 'category', 'brand', 'images', 'tags', 'status',
      'badge', 'isFeatured', 'seoTitle', 'seoDescription', 'seoKeywords',
      'variantSku', 'variantColor', 'variantSize', 'variantPrice', 'variantQuantity',
    ];
    const sampleRow = [
      'Classic T-Shirt', 'Premium cotton t-shirt with modern fit', 'Soft cotton tee',
      '29.99', '39.99', '12.00', '100', 'TSH-001', '8901234567890', 'T-Shirts', 'Nike',
      'https://example.com/tshirt-front.jpg,https://example.com/tshirt-back.jpg',
      'summer,cotton,basics', 'PUBLISHED', 'New', 'true',
      'Classic T-Shirt | Threvolt', 'Shop our premium classic t-shirt', 't-shirt, cotton, premium',
      'TSH-001-BLK-M', 'Black', 'M', '29.99', '25',
    ];
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-import-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  // Color/style for a cell value based on header
  const cellStyle = (val, header) => {
    if (!val || val === '') return { opacity: 0.4, fontStyle: 'italic' };
    if (header === 'price' || header === 'old_price' || header === 'cost') return { fontWeight: 600, color: '#059669' };
    if (header === 'quantity' || header === 'variant_quantity') return { fontWeight: 600, color: '#2563eb' };
    if (header === 'status') {
      const upper = String(val).toUpperCase();
      if (upper === 'PUBLISHED') return { color: '#16a34a', fontWeight: 600 };
      if (upper === 'DRAFT') return { color: '#f59e0b', fontWeight: 600 };
      if (upper === 'ARCHIVED') return { color: '#6b7280', fontWeight: 600 };
    }
    return {};
  };

  // Row status indicator
  const rowStatusBadge = (status) => {
    if (status === 'valid') return { label: '✓', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
    if (status === 'warning') return { label: '⚠', color: '#d97706', bg: '#fffbeb', border: '#fde68a' };
    if (status === 'error') return { label: '✗', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
    return { label: '?', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' };
  };

  return (
    <div>
      <div className="admin-header admin-header-row">
        <div>
          <h2>📦 Bulk Product Import</h2>
          <p>Import products from a CSV file — supports categories, brands, variants, and images</p>
        </div>
        <button className="btn-ghost btn-sm" onClick={downloadTemplate} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          📄 Download CSV Template
        </button>
      </div>

      {/* ── CSV Upload Zone ── */}
      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--primary)' : file ? '#22c55e' : 'var(--border)'}`,
            borderRadius: '12px',
            padding: '2.5rem',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragOver ? '#f0f7ff' : file ? '#f0fdf4' : '#fafafa',
            transition: 'all 0.2s ease',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            {previewing ? '⏳' : file ? '📄' : (dragOver ? '📂' : '📁')}
          </div>
          {file ? (
            <div>
              <p style={{ fontWeight: 600, color: '#16a34a', margin: '0 0 0.25rem' }}>
                {file.name}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
                {(file.size / 1024).toFixed(1)} KB — Click or drag to change file
              </p>
              {previewing && (
                <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem' }}>
                  Analyzing on server...
                </p>
              )}
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 500, margin: '0 0 0.25rem' }}>
                {dragOver ? 'Drop CSV file here' : 'Drag & drop a CSV file here, or click to browse'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
                Supports: name, description, price, quantity, category, images, variants, and more
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Server-Side Data Preview ── */}
      {previewData && !previewing && (
        <div className="table-card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.9rem' }}>
                👁️ Server-Validated Preview
              </h4>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                <strong>{previewData.total_rows}</strong> row{previewData.total_rows !== 1 ? 's' : ''} ·
                <strong> {previewData.headers.length}</strong> column{previewData.headers.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              {previewData.validation && (
                <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem' }}>
                  {previewData.validation.valid > 0 && (
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>✓ {previewData.validation.valid} valid</span>
                  )}
                  {previewData.validation.warnings > 0 && (
                    <span style={{ color: '#d97706', fontWeight: 600 }}>⚠ {previewData.validation.warnings} warnings</span>
                  )}
                  {previewData.validation.errors > 0 && (
                    <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ {previewData.validation.errors} errors</span>
                  )}
                </div>
              )}
              <button className="btn-ghost btn-sm" onClick={clearFile} style={{ fontSize: '0.75rem' }}>
                🗑️ Change file
              </button>
            </div>
          </div>

          {previewData.headers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
              No headers found. Make sure your CSV has a header row.
            </div>
          ) : previewData.rows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)', fontSize: '0.85rem' }}>
              No data rows found in CSV (header row only).
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <table style={{ width: '100%', fontSize: '0.72rem', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ background: '#f8f9fc', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{
                      padding: '0.5rem 0.6rem',
                      textAlign: 'left',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--muted)',
                      fontSize: '0.65rem',
                      borderRight: '1px solid #e5e7eb',
                      position: 'sticky',
                      left: 0,
                      background: '#f8f9fc',
                      zIndex: 2,
                      minWidth: 24,
                    }}>#</th>
                    <th style={{
                      padding: '0.5rem 0.6rem',
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '0.65rem',
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      borderRight: '1px solid #e5e7eb',
                      background: '#f8f9fc',
                      minWidth: 48,
                    }}>Status</th>
                    {previewData.headers.map((h) => {
                      const isRequired = ['name', 'price', 'quantity'].includes(h.toLowerCase());
                      return (
                        <th key={h} style={{
                          padding: '0.5rem 0.6rem',
                          textAlign: 'left',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: isRequired ? '#059669' : 'var(--muted)',
                          fontSize: '0.65rem',
                          borderRight: '1px solid #e5e7eb',
                          background: isRequired ? '#f0fdf4' : '#f8f9fc',
                        }} title={isRequired ? 'Required column' : undefined}>
                          {h}{isRequired ? ' *' : ''}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {previewData.rows.map((row, rowIdx) => {
                    const badge = rowStatusBadge(row.status);
                    return (
                      <tr key={rowIdx} style={{
                        borderBottom: '1px solid #f3f4f6',
                        background: rowIdx % 2 === 0 ? '#ffffff' : '#fafbfc',
                      }}>
                        <td style={{
                          padding: '0.4rem 0.6rem',
                          borderRight: '1px solid #f3f4f6',
                          color: '#9ca3af',
                          fontWeight: 600,
                          fontSize: '0.65rem',
                          background: rowIdx % 2 === 0 ? '#ffffff' : '#fafbfc',
                          position: 'sticky',
                          left: 0,
                          zIndex: 1,
                        }}>
                          {row.row_number}
                        </td>
                        <td style={{
                          padding: '0.35rem 0.5rem',
                          textAlign: 'center',
                          borderRight: '1px solid #f3f4f6',
                        }}>
                          <span title={row.issues?.map((i) => i.message).join('; ')} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            cursor: row.issues?.length ? 'help' : 'default',
                          }}>
                            {badge.label}
                          </span>
                        </td>
                        {previewData.headers.map((h) => {
                          const val = row.data?.[h];
                          return (
                            <td key={h} style={{
                              padding: '0.4rem 0.6rem',
                              borderRight: '1px solid #f3f4f6',
                              maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              ...cellStyle(val, h),
                            }} title={val || ''}>
                              {val ?? <span style={{ color: '#d1d5db', fontStyle: 'italic' }}>empty</span>}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Per-row issues summary */}
          {previewData.rows.some((r) => r.issues?.length > 0) && (
            <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: '#f9fafb', borderRadius: '8px', fontSize: '0.72rem', maxHeight: 180, overflowY: 'auto' }}>
              <strong style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Validation Details:</strong>
              {previewData.rows.filter((r) => r.issues?.length > 0).map((r) => (
                <div key={r.row_number} style={{ marginTop: '0.25rem', paddingLeft: '0.5rem' }}>
                  <span style={{ fontWeight: 600, color: '#374151' }}>Row {r.row_number}:</span>{' '}
                  {r.issues.map((iss, ii) => (
                    <span key={ii} style={{
                      marginRight: '0.5rem',
                      color: iss.type === 'error' ? '#dc2626' : '#d97706',
                    }}>
                      {iss.type === 'error' ? '✗' : '⚠'} {iss.message}
                    </span>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Column Mapping Section ── */}
      {previewData && !previewing && columnMapping && originalCSVHeaders.length > 0 && (
        <div className="table-card" style={{ marginBottom: '1rem' }}>
          <div
            onClick={() => setShowMapping(!showMapping)}
            style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem' }}>🔗 Column Mapping</h4>
              {!showMapping && (
                <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
                  ({originalCSVHeaders.length} columns mapped)
                </span>
              )}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)', transition: 'transform 0.2s', transform: showMapping ? 'rotate(180deg)' : 'none' }}>▼</span>
          </div>
          {showMapping && (
            <div style={{ marginTop: '0.75rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.5rem' }}>
                Map your CSV columns to product fields. Click "Apply Mapping" to re-preview with the new mapping.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {originalCSVHeaders.map((csvHeader) => {
                  const currentField = columnMapping[csvHeader] || '';
                  return (
                    <div key={csvHeader} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem' }}>
                      <span style={{ fontWeight: 600, minWidth: 160, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis' }} title={csvHeader}>
                        {csvHeader}
                      </span>
                      <span style={{ color: '#9ca3af' }}>→</span>
                      <select
                        value={currentField}
                        onChange={(e) => handleMappingChange(csvHeader, e.target.value)}
                        style={{
                          flex: 1, maxWidth: 260, padding: '0.3rem 0.5rem',
                          borderRadius: '6px', border: '1px solid #d1d5db',
                          fontSize: '0.75rem', background: '#fff',
                          fontWeight: currentField ? 600 : 400,
                          color: currentField ? '#059669' : '#9ca3af',
                        }}
                      >
                        <option value="" style={{ color: '#9ca3af' }}>— Skip this column —</option>
                        {availableFields.map((f) => (
                          <option key={f} value={f} style={{ fontWeight: f === currentField ? 600 : 400 }}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button
                  className="btn-ghost btn-sm"
                  onClick={resetMapping}
                  style={{ fontSize: '0.72rem' }}
                >
                  ↩ Reset to suggested
                </button>
                <button
                  className="btn-dark btn-sm"
                  onClick={applyMapping}
                  disabled={previewing}
                  style={{ fontSize: '0.72rem', padding: '0.3rem 1rem', opacity: previewing ? 0.6 : 1 }}
                >
                  {previewing ? 'Re-previewing...' : 'Apply Mapping ↻'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Import Actions ── */}
      {previewData && !previewing && previewData.headers.length > 0 && previewData.rows.length > 0 && !result && (
        <div className="table-card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <button className="btn-ghost" onClick={clearFile} style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem' }}>
              ← Choose different file
            </button>
            <button
              className="btn-dark"
              onClick={handleImportWithMapping}
              disabled={loading}
              style={{
                padding: '0.6rem 2rem',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <><span className="spinner" style={{ width: 16, height: 16 }} /> Importing... (queued)</>
              ) : (
                <>⬆️ Import {previewData.total_rows} Product{previewData.total_rows !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Fallback: show Import button if preview unavailable but file selected ── */}
      {!previewData && !previewing && file && (
        <div className="table-card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button
              className="btn-dark"
              onClick={handleImportWithMapping}
              disabled={loading}
              style={{ padding: '0.6rem 2rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: loading ? 0.6 : 1 }}
            >
              {loading ? <><span className="spinner" style={{ width: 16, height: 16 }} /> Importing...</> : <>⬆️ Import Products</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Supported Columns Reference ── */}
      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div onClick={() => setShowColumns(!showColumns)} style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h4 style={{ margin: 0, fontSize: '0.85rem' }}>📋 Supported CSV Columns</h4>
          <span style={{ fontSize: '0.75rem', color: 'var(--muted)', transition: 'transform 0.2s', transform: showColumns ? 'rotate(180deg)' : 'none' }}>▼</span>
        </div>
        <div style={{ display: showColumns ? 'block' : 'none', marginTop: '0.75rem', fontSize: '0.8rem', lineHeight: 1.8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            <div><strong style={{ color: 'var(--primary)' }}>name</strong> * — Product name</div>
            <div><strong style={{ color: 'var(--primary)' }}>price</strong> * — Selling price</div>
            <div><strong style={{ color: 'var(--primary)' }}>quantity</strong> * — Stock count</div>
            <div><span style={{ fontWeight: 600 }}>description</span> — Full description</div>
            <div><span style={{ fontWeight: 600 }}>shortDescription</span> — Brief summary</div>
            <div><span style={{ fontWeight: 600 }}>sku</span> — Unique SKU (auto-generated if empty)</div>
            <div><span style={{ fontWeight: 600 }}>barcode</span> — Barcode / EAN / UPC</div>
            <div><span style={{ fontWeight: 600 }}>oldPrice</span> — Original/compare price</div>
            <div><span style={{ fontWeight: 600 }}>cost</span> — Product cost</div>
            <div><span style={{ fontWeight: 600 }}>category</span> — Category name (auto-created)</div>
            <div><span style={{ fontWeight: 600 }}>brand</span> — Brand name (auto-created)</div>
            <div><span style={{ fontWeight: 600 }}>images</span> — Comma-separated URLs</div>
            <div><span style={{ fontWeight: 600 }}>tags</span> — Comma-separated tags</div>
            <div><span style={{ fontWeight: 600 }}>status</span> — DRAFT / PUBLISHED / ARCHIVED</div>
            <div><span style={{ fontWeight: 600 }}>badge</span> — New / Sale / Bestseller / etc.</div>
            <div><span style={{ fontWeight: 600 }}>isFeatured</span> — true / false</div>
            <div><span style={{ fontWeight: 600 }}>variantSku</span> — Variant SKU</div>
            <div><span style={{ fontWeight: 600 }}>variantColor</span> — Variant color</div>
            <div><span style={{ fontWeight: 600 }}>variantSize</span> — Variant size</div>
            <div><span style={{ fontWeight: 600 }}>variantPrice</span> — Variant price</div>
            <div><span style={{ fontWeight: 600 }}>variantQuantity</span> — Variant stock</div>
            <div><span style={{ fontWeight: 600 }}>seoTitle</span> — SEO meta title</div>
            <div><span style={{ fontWeight: 600 }}>seoDescription</span> — SEO meta description</div>
            <div><span style={{ fontWeight: 600 }}>seoKeywords</span> — SEO meta keywords</div>
          </div>
          <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--muted)' }}>
            * Required columns. Categories and brands are auto-created if they don't exist.
          </p>
        </div>
      </div>

      {/* ── Import Results ── */}
      {result && (
        <div className="table-card">
          <h4 style={{ margin: '0 0 1rem', fontSize: '0.9rem' }}>📊 Import Results</h4>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-label">Imported</div>
              <div className="stat-val" style={{ color: '#16a34a', fontSize: '1.5rem' }}>{result.imported ?? 0}</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-label">Skipped</div>
              <div className="stat-val" style={{ color: '#f59e0b', fontSize: '1.5rem' }}>{result.skipped ?? 0}</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-label">Errors</div>
              <div className="stat-val" style={{ color: '#ef4444', fontSize: '1.5rem' }}>{result.errors ?? 0}</div>
            </div>
          </div>

          {result.importedProducts?.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h5 style={{ fontSize: '0.82rem', margin: '0 0 0.5rem', color: '#16a34a' }}>✅ Successfully Imported ({result.importedProducts.length})</h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {result.importedProducts.map((p, i) => (
                  <span key={i} style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', background: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0', color: '#166534' }}>
                    {p.name} ({p.sku})
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.errorDetails?.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h5 style={{ fontSize: '0.82rem', margin: '0 0 0.5rem', color: '#ef4444' }}>⚠️ Issues ({result.errorDetails.length})</h5>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {result.errorDetails.map((e, i) => (
                  <div key={i} style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', background: '#fef2f2', borderRadius: '4px', marginBottom: '0.25rem', border: '1px solid #fecaca' }}>
                    <strong style={{ color: '#991b1b' }}>Row {e.row}:</strong> <span style={{ color: '#7f1d1d' }}>{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.imported > 0 && result.errors === 0 && result.skipped === 0 && (
            <div style={{ marginTop: '1rem', textAlign: 'center', color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>
              ✨ All products imported successfully!
            </div>
          )}

          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <button className="btn-ghost" onClick={() => { setResult(null); setFile(null); setPreviewData(null); }} style={{ padding: '0.5rem 1.5rem', fontSize: '0.85rem' }}>
              ↩️ Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
