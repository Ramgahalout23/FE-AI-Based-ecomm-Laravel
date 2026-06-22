import { useState, useRef, useCallback } from 'react';
import { adminAPI } from '../../api/admin';
import toast from '../../utils/toast';

export default function ProductImportAdminPage() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [showColumns, setShowColumns] = useState(false);
  const fileInputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.type === 'text/csv' || dropped.name.endsWith('.csv'))) {
      setFile(dropped);
      setResult(null);
    } else {
      toast.error('Please drop a CSV file');
    }
  }, []);

  const handleFileSelect = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setResult(null);
    }
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

  // Download sample CSV template
  const downloadTemplate = () => {
    const headers = [
      'name', 'description', 'shortDescription', 'price', 'oldPrice', 'cost',
      'quantity', 'sku', 'category', 'brand', 'images', 'tags', 'status',
      'badge', 'isFeatured', 'seoTitle', 'seoDescription', 'seoKeywords',
      'variantSku', 'variantColor', 'variantSize', 'variantPrice', 'variantQuantity',
    ];
    const sampleRow = [
      'Classic T-Shirt', 'Premium cotton t-shirt with modern fit', 'Soft cotton tee',
      '29.99', '39.99', '12.00', '100', 'TSH-001', 'T-Shirts', 'Nike',
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
            {file ? '📄' : (dragOver ? '📂' : '📁')}
          </div>
          {file ? (
            <div>
              <p style={{ fontWeight: 600, color: '#16a34a', margin: '0 0 0.25rem' }}>
                {file.name}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0 }}>
                {(file.size / 1024).toFixed(1)} KB — Click or drag to change file
              </p>
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

        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
          <button
            className="btn-dark"
            onClick={handleUpload}
            disabled={!file || loading}
            style={{
              padding: '0.6rem 2rem',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              opacity: !file || loading ? 0.6 : 1,
            }}
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                Importing...
              </>
            ) : (
              <>
                ⬆️ Import Products
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Supported Columns Reference ── */}
      <div className="table-card" style={{ marginBottom: '1rem' }}>
        <div
          onClick={() => setShowColumns(!showColumns)}
          style={{ cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
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
            Variant columns create one variant per product row.
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
              <div className="stat-val" style={{ color: '#16a34a', fontSize: '1.5rem' }}>
                {result.imported ?? 0}
              </div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-label">Skipped</div>
              <div className="stat-val" style={{ color: '#f59e0b', fontSize: '1.5rem' }}>
                {result.skipped ?? 0}
              </div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-label">Errors</div>
              <div className="stat-val" style={{ color: '#ef4444', fontSize: '1.5rem' }}>
                {result.errors ?? 0}
              </div>
            </div>
          </div>

          {/* Imported products list */}
          {result.importedProducts?.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h5 style={{ fontSize: '0.82rem', margin: '0 0 0.5rem', color: '#16a34a' }}>
                ✅ Successfully Imported ({result.importedProducts.length})
              </h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {result.importedProducts.map((p, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      background: '#f0fdf4',
                      borderRadius: '4px',
                      border: '1px solid #bbf7d0',
                      color: '#166534',
                    }}
                  >
                    {p.name} ({p.sku})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error details */}
          {result.errorDetails?.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h5 style={{ fontSize: '0.82rem', margin: '0 0 0.5rem', color: '#ef4444' }}>
                ⚠️ Issues ({result.errorDetails.length})
              </h5>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {result.errorDetails.map((e, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.3rem 0.5rem',
                      background: '#fef2f2',
                      borderRadius: '4px',
                      marginBottom: '0.25rem',
                      border: '1px solid #fecaca',
                    }}
                  >
                    <strong style={{ color: '#991b1b' }}>Row {e.row}:</strong>{' '}
                    <span style={{ color: '#7f1d1d' }}>{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No issues */}
          {result.imported > 0 && result.errors === 0 && result.skipped === 0 && (
            <div style={{ marginTop: '1rem', textAlign: 'center', color: '#16a34a', fontSize: '0.85rem', fontWeight: 600 }}>
              ✨ All products imported successfully!
            </div>
          )}
        </div>
      )}
    </div>
  );
}
