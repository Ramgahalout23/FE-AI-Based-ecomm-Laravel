import { useState } from 'react';
import { CheckSquare, Square, Copy, Trash2, Play, Pause, X, CheckCheck } from 'lucide-react';
import toast from '../../../utils/toast';

export default function BulkActions({ campaigns, onBulkStatusChange, onBulkDelete, onDuplicate }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);

  const toggleSelect = (id) => {
    const newSel = new Set(selectedIds);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelectedIds(newSel);
    setSelectAll(false);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(campaigns.map(c => c.id)));
      setSelectAll(true);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectAll(false);
  };

  const handleAction = (action) => {
    if (selectedIds.size === 0) {
      toast.error('Select campaigns first');
      return;
    }
    const ids = Array.from(selectedIds);
    switch (action) {
      case 'activate':
        onBulkStatusChange(ids, 'ACTIVE');
        break;
      case 'pause':
        onBulkStatusChange(ids, 'PAUSED');
        break;
      case 'draft':
        onBulkStatusChange(ids, 'DRAFT');
        break;
      case 'delete':
        if (window.confirm(`Delete ${ids.length} campaigns? This cannot be undone.`)) {
          ids.forEach(id => onBulkDelete(id));
        }
        break;
      case 'duplicate':
        ids.forEach(id => {
          const c = campaigns.find(c => c.id === id);
          if (c) onDuplicate(c);
        });
        break;
    }
    clearSelection();
  };

  const count = selectedIds.size;

  return (
    <div className="space-y-3">
      {/* Select All Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={toggleSelectAll} className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors">
            {selectAll ? <CheckSquare size={16} className="text-brand-black" /> : <Square size={16} />}
            Select All
          </button>
          {count > 0 && (
            <span className="text-xs font-bold text-brand-black">
              {count} selected
            </span>
          )}
        </div>
        {count > 0 && (
          <button onClick={clearSelection} className="text-[10px] text-red-500 hover:text-red-600 font-semibold flex items-center gap-1">
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Action Buttons */}
      {count > 0 && (
        <div className="flex flex-wrap gap-2 animate-fadeIn">
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
            onClick={() => handleAction('activate')}>
            <Play size={12} /> Activate
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white rounded-lg text-xs font-bold hover:bg-yellow-600 transition-colors"
            onClick={() => handleAction('pause')}>
            <Pause size={12} /> Pause
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
            onClick={() => handleAction('draft')}>
            <CheckCheck size={12} /> Draft
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-black text-white rounded-lg text-xs font-bold hover:bg-brand-black/80 transition-colors"
            onClick={() => handleAction('duplicate')}>
            <Copy size={12} /> Duplicate
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
            onClick={() => handleAction('delete')}>
            <Trash2 size={12} /> Delete
          </button>
        </div>
      )}

      {/* Campaign List with Checkboxes */}
      <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden max-h-60 overflow-y-auto">
        {campaigns.map(c => (
          <div key={c.id} className={`flex items-center gap-3 px-4 py-2.5 border-b border-border/50 last:border-b-0 hover:bg-surface/30 transition-colors cursor-pointer ${selectedIds.has(c.id) ? 'bg-brand-black/5' : ''}`}
            onClick={() => toggleSelect(c.id)}>
            <div className="flex-shrink-0">
              {selectedIds.has(c.id) ? <CheckSquare size={16} className="text-brand-black" /> : <Square size={16} className="text-gray-300" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{c.name}</div>
              <div className="text-[10px] text-text-muted">{c.platform} · {c.status}</div>
            </div>
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : c.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-600' : c.status === 'COMPLETED' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
