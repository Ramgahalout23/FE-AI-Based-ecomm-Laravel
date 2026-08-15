import { useState, useRef } from 'react';
import './PageEditor.css';

export default function PageEditor({ value, onChange, placeholder = '<h1>Your content here</h1>' }) {
  const [activeTab, setActiveTab] = useState('visual');
  const [previewDevice, setPreviewDevice] = useState('desktop');
  const [inlineMode, setInlineMode] = useState(false);
  const editorRef = useRef(null);
  const previewRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const applyFormat = (command, cmdValue = null) => {
    document.execCommand(command, false, cmdValue);
    editorRef.current?.focus();
    syncFromVisual();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) applyFormat('createLink', url);
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:', '');
    if (url) applyFormat('insertImage', url);
  };

  const getHTMLContent = () => editorRef.current?.innerHTML || '';

  const syncFromVisual = () => {
    onChangeRef.current(getHTMLContent());
  };

  const syncFromHTML = (e) => {
    onChangeRef.current(e.target.value);
  };

  const loadToVisual = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
    }
  };

  // Sync preview content back to parent
  const syncPreviewContent = () => {
    if (previewRef.current) {
      onChangeRef.current(previewRef.current.innerHTML);
    }
  };

  const enterInlineMode = () => {
    // Load current value into preview
    if (previewRef.current) {
      previewRef.current.innerHTML = value || '';
    }
    setInlineMode(true);
  };

  const exitInlineMode = () => {
    syncPreviewContent();
    setInlineMode(false);
  };

  return (
    <div className="page-editor">
      {/* ── Tabs ── */}
      <div className="editor-tabs">
        <button 
          className={`tab-btn ${activeTab === 'visual' ? 'active' : ''}`}
          onClick={() => { if (inlineMode) exitInlineMode(); syncFromVisual(); setActiveTab('visual'); setTimeout(loadToVisual, 0); }}
        >
          🎨 Visual Editor
        </button>
        <button 
          className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`}
          onClick={() => { if (inlineMode) exitInlineMode(); syncFromVisual(); setActiveTab('html'); }}
        >
          &lt;/&gt; HTML Code
        </button>
        <button 
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => { syncFromVisual(); setActiveTab('preview'); }}
        >
          👁️ Preview
        </button>
      </div>

      {/* ── Visual Editor ── */}
      {activeTab === 'visual' && (
        <div className="editor-panel">
          {/* Toolbar */}
          <div className="editor-toolbar">
            <div className="toolbar-group">
              <button title="Bold" onClick={() => applyFormat('bold')} className="toolbar-btn">
                <strong>B</strong>
              </button>
              <button title="Italic" onClick={() => applyFormat('italic')} className="toolbar-btn">
                <em>I</em>
              </button>
              <button title="Underline" onClick={() => applyFormat('underline')} className="toolbar-btn">
                <u>U</u>
              </button>
              <div className="toolbar-sep" />
            </div>

            <div className="toolbar-group">
              <select onChange={(e) => { if (e.target.value) { applyFormat('formatBlock', e.target.value); e.target.value = ''; } }} defaultValue="" className="toolbar-select">
                <option value="">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
                <option value="blockquote">Quote</option>
              </select>
              <div className="toolbar-sep" />
            </div>

            <div className="toolbar-group">
              <button title="Bullet List" onClick={() => applyFormat('insertUnorderedList')} className="toolbar-btn">
                • List
              </button>
              <button title="Numbered List" onClick={() => applyFormat('insertOrderedList')} className="toolbar-btn">
                1. List
              </button>
              <div className="toolbar-sep" />
            </div>

            <div className="toolbar-group">
              <button title="Insert Link" onClick={insertLink} className="toolbar-btn">
                🔗 Link
              </button>
              <button title="Insert Image" onClick={insertImage} className="toolbar-btn">
                🖼️ Image
              </button>
              <div className="toolbar-sep" />
            </div>

            <div className="toolbar-group">
              <button title="Left Align" onClick={() => applyFormat('justifyLeft')} className="toolbar-btn">
                ⬅️
              </button>
              <button title="Center Align" onClick={() => applyFormat('justifyCenter')} className="toolbar-btn">
                ⬇️
              </button>
              <button title="Right Align" onClick={() => applyFormat('justifyRight')} className="toolbar-btn">
                ➡️
              </button>
              <div className="toolbar-sep" />
            </div>

            <div className="toolbar-group">
              <button title="Undo" onClick={() => applyFormat('undo')} className="toolbar-btn">
                ↶ Undo
              </button>
              <button title="Redo" onClick={() => applyFormat('redo')} className="toolbar-btn">
                ↷ Redo
              </button>
            </div>
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="editor-content"
            onBlur={syncFromVisual}
            dangerouslySetInnerHTML={{ __html: value || '' }}
          />
        </div>
      )}

      {/* ── HTML Editor ── */}
      {activeTab === 'html' && (
        <div className="editor-panel">
          <textarea
            value={value}
            onChange={syncFromHTML}
            className="html-editor"
            placeholder={placeholder}
            spellCheck="false"
          />
        </div>
      )}

      {/* ── Preview ── */}
      {activeTab === 'preview' && (
        <div className="editor-panel">
          {/* Preview Toolbar */}
          <div className="editor-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px' }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button 
                className={`toolbar-btn ${inlineMode ? 'active' : ''}`}
                onClick={() => inlineMode ? exitInlineMode() : enterInlineMode()}
                title={inlineMode ? 'Exit inline editing' : 'Enable inline editing (double-click text)'}
                style={inlineMode ? { background: '#1a1a1a', color: 'white', borderColor: '#1a1a1a' } : {}}
              >
                ✏️ {inlineMode ? 'Editing...' : 'Inline Edit'}
              </button>
              <div className="toolbar-sep" />
              <span style={{ fontSize: 10, color: '#8a8a9a', fontWeight: 600 }}>View:</span>
              <button 
                className={`toolbar-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('desktop')}
                style={previewDevice === 'desktop' ? { background: '#1a1a1a', color: 'white', borderColor: '#1a1a1a' } : {}}
              >
                🖥 Desktop
              </button>
              <button 
                className={`toolbar-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('tablet')}
                style={previewDevice === 'tablet' ? { background: '#1a1a1a', color: 'white', borderColor: '#1a1a1a' } : {}}
              >
                📱 Tablet
              </button>
              <button 
                className={`toolbar-btn ${previewDevice === 'mobile' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('mobile')}
                style={previewDevice === 'mobile' ? { background: '#1a1a1a', color: 'white', borderColor: '#1a1a1a' } : {}}
              >
                📱 Mobile
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="preview-container" style={{ display: 'flex', justifyContent: 'center', background: '#f0f0f5' }}>
            <div 
              style={{
                maxWidth: previewDevice === 'mobile' ? '375px' : previewDevice === 'tablet' ? '768px' : '100%',
                width: '100%',
                background: '#ffffff',
                borderRadius: previewDevice !== 'desktop' ? '12px' : '0',
                boxShadow: previewDevice !== 'desktop' ? '0 10px 40px rgba(0,0,0,0.15)' : 'none',
                minHeight: '100%',
                transition: 'all 0.3s ease',
              }}
            >
              <div 
                ref={previewRef}
                className="preview-content"
                contentEditable={inlineMode}
                suppressContentEditableWarning
                onBlur={() => { if (inlineMode) syncPreviewContent(); }}
                dangerouslySetInnerHTML={{ __html: value || '' }}
              />
              {!value && !inlineMode && (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8a8a9a', fontSize: 14 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
                  <p>No content yet — start editing!</p>
                </div>
              )}
            </div>
          </div>

          {inlineMode && (
            <div style={{
              padding: '8px 12px',
              background: '#eef2ff',
              borderTop: '1px solid #e5e5ea',
              fontSize: 11,
              color: '#6366f1',
              fontWeight: 600,
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
            }}>
              <span>✏️ Double-click text to edit</span>
              <span>⏎ Enter to save</span>
              <span>⎋ Escape to cancel</span>
              <span>Click "Save" when done</span>
              <button 
                className="toolbar-btn"
                onClick={exitInlineMode}
                style={{ padding: '2px 12px', fontSize: 11, background: '#6366f1', color: 'white', border: 'none' }}
              >
                Done Editing ✕
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
