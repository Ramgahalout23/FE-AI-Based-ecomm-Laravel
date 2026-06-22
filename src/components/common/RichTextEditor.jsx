import { useRef, useEffect } from 'react';
import './RichTextToolbar.css';

export default function RichTextEditor({ value, onChange }) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (editorRef.current && value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const applyFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    syncContent();
  };

  const insertLink = () => {
    const url = prompt('Enter URL:', 'https://');
    if (url) applyFormat('createLink', url);
  };

  const insertImage = () => {
    const url = prompt('Enter image URL:', '');
    if (url) applyFormat('insertImage', url);
  };

  const syncContent = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="rich-text-editor">
      {/* Toolbar */}
      <div className="rich-toolbar">
        <div className="toolbar-group">
          <button 
            title="Bold (Ctrl+B)" 
            onClick={() => applyFormat('bold')} 
            className="toolbar-icon-btn"
          >
            <strong>B</strong>
          </button>
          <button 
            title="Italic (Ctrl+I)" 
            onClick={() => applyFormat('italic')} 
            className="toolbar-icon-btn"
          >
            <em>I</em>
          </button>
          <button 
            title="Underline (Ctrl+U)" 
            onClick={() => applyFormat('underline')} 
            className="toolbar-icon-btn"
          >
            <u>U</u>
          </button>
          <div className="toolbar-divider" />
        </div>

        <div className="toolbar-group">
          <select 
            onChange={(e) => {
              if (e.target.value) {
                applyFormat('formatBlock', e.target.value);
              }
            }} 
            defaultValue=""
            className="toolbar-select"
            title="Block style"
          >
            <option value="">Text Style</option>
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="blockquote">Quote</option>
          </select>
          <div className="toolbar-divider" />
        </div>

        <div className="toolbar-group">
          <button 
            title="Bullet List" 
            onClick={() => applyFormat('insertUnorderedList')} 
            className="toolbar-icon-btn"
          >
            • List
          </button>
          <button 
            title="Numbered List" 
            onClick={() => applyFormat('insertOrderedList')} 
            className="toolbar-icon-btn"
          >
            1. List
          </button>
          <div className="toolbar-divider" />
        </div>

        <div className="toolbar-group">
          <button 
            title="Left Align" 
            onClick={() => applyFormat('justifyLeft')} 
            className="toolbar-icon-btn"
          >
            ⬅️
          </button>
          <button 
            title="Center Align" 
            onClick={() => applyFormat('justifyCenter')} 
            className="toolbar-icon-btn"
          >
            ⬇️
          </button>
          <button 
            title="Right Align" 
            onClick={() => applyFormat('justifyRight')} 
            className="toolbar-icon-btn"
          >
            ➡️
          </button>
          <button 
            title="Justify" 
            onClick={() => applyFormat('justifyFull')} 
            className="toolbar-icon-btn"
          >
            ↔️
          </button>
          <div className="toolbar-divider" />
        </div>

        <div className="toolbar-group">
          <button 
            title="Insert Link" 
            onClick={insertLink} 
            className="toolbar-icon-btn"
          >
            🔗
          </button>
          <button 
            title="Insert Image" 
            onClick={insertImage} 
            className="toolbar-icon-btn"
          >
            🖼️
          </button>
          <div className="toolbar-divider" />
        </div>

        <div className="toolbar-group">
          <button 
            title="Undo" 
            onClick={() => applyFormat('undo')} 
            className="toolbar-icon-btn"
          >
            ↶
          </button>
          <button 
            title="Redo" 
            onClick={() => applyFormat('redo')} 
            className="toolbar-icon-btn"
          >
            ↷
          </button>
          <button 
            title="Clear Formatting" 
            onClick={() => applyFormat('removeFormat')} 
            className="toolbar-icon-btn"
          >
            🧹
          </button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        className="rich-editor-content"
        onBlur={syncContent}
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    </div>
  );
}
