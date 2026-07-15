
export default function SeoTab({ seo, setSeo, loading, handleSaveSEO }) {
  return (
    <div className="detail-panel">
      <div className="detail-header"><h3>SEO Configuration</h3></div>
      <div className="form-grid">
        <div className="form-group form-full"><label>Site Title</label><input value={seo.title} onChange={e => setSeo({ ...seo, title: e.target.value })} placeholder="LUXE — Premium Fashion Store" autoComplete="off" /></div>
        <div className="form-group form-full"><label>Meta Description</label><textarea rows={3} value={seo.description} onChange={e => setSeo({ ...seo, description: e.target.value })} placeholder="Discover curated luxury fashion, accessories, and more..." /></div>
        <div className="form-group form-full"><label>Keywords</label><input value={seo.keywords} onChange={e => setSeo({ ...seo, keywords: e.target.value })} placeholder="luxury, fashion, accessories" autoComplete="off" /></div>
      </div>
      <div className="form-actions"><button className="btn-dark btn-sm" onClick={handleSaveSEO} disabled={loading}>{loading ? 'Saving...' : 'Save SEO Settings'}</button></div>
    </div>
  );
}
