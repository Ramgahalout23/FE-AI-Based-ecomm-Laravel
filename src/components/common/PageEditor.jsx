import { useState, useRef } from 'react';
import './PageEditor.css';

export default function PageEditor({ value, onChange, placeholder = '<h1>Your content here</h1>' }) {
  const [activeTab, setActiveTab] = useState('visual');
  const editorRef = useRef(null);

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) applyFormat('createLink', url);
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:', '');
    if (url) applyFormat('insertImage', url);
  };

  const getHTMLContent = () => {
    return editorRef.current?.innerHTML || '';
  };

  const syncFromVisual = () => {
    onChange(getHTMLContent());
  };

  const syncFromHTML = (e) => {
    onChange(e.target.value);
  };

  const loadToVisual = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = value || '';
    }
  };

  return (
    <div className="page-editor">
      {/* Tabs */}
      <div className="editor-tabs">
        <button 
          className={`tab-btn ${activeTab === 'visual' ? 'active' : ''}`}
          onClick={() => { syncFromVisual(); setActiveTab('visual'); loadToVisual(); }}
        >
          🎨 Visual Editor
        </button>
        <button 
          className={`tab-btn ${activeTab === 'html' ? 'active' : ''}`}
          onClick={() => { syncFromVisual(); setActiveTab('html'); }}
        >
          &lt;/&gt; HTML Code
        </button>
        <button 
          className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
          onClick={() => setActiveTab('preview')}
        >
          👁️ Preview
        </button>
      </div>

      {/* Visual Editor */}
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
              <select onChange={(e) => applyFormat('formatBlock', e.target.value)} defaultValue="p" className="toolbar-select">
                <option value="p">Paragraph</option>
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
            defaultValue={value}
            dangerouslySetInnerHTML={{ __html: value || '' }}
          />
        </div>
      )}

      {/* HTML Editor */}
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

      {/* Preview */}
      {activeTab === 'preview' && (
        <div className="editor-panel">
          <div className="preview-container">
            <div className="preview-content" dangerouslySetInnerHTML={{ __html: value || '<p>No content</p>' }} />
          </div>
        </div>
      )}
    </div>
  );
}
