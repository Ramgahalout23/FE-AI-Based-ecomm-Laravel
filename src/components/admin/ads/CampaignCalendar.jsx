import { useState, useMemo } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Clock, Target, MessageCircle, Play } from 'lucide-react';

const STATUS_DOT_COLORS = {
  ACTIVE: 'bg-green-500',
  DRAFT: 'bg-gray-400',
  PAUSED: 'bg-yellow-500',
  COMPLETED: 'bg-blue-500',
  SCHEDULED: 'bg-purple-500',
  FAILED: 'bg-red-500',
};

const PLATFORM_ICONS = { INSTAGRAM: Target, FACEBOOK: Target, WHATSAPP: MessageCircle, GOOGLE: Play };
const PLATFORM_COLORS = {
  INSTAGRAM: 'from-pink-500 to-purple-600',
  FACEBOOK: 'bg-blue-600',
  WHATSAPP: 'bg-green-500',
  GOOGLE: 'from-blue-500 to-green-500',
};

export default function CampaignCalendar({ campaigns, openNew, openEdit, onUpdateDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('ALL');
  const [draggedCampaign, setDraggedCampaign] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const [dropFeedback, setDropFeedback] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleDragStart = (e, campaign) => {
    setDraggedCampaign(campaign);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', campaign.id);
    // Add subtle opacity to drag image
    if (e.target) e.target.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    setDraggedCampaign(null);
    setDragOverDay(null);
    if (e.target) e.target.style.opacity = '';
  };

  const handleDragOver = (e, day) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDay(day);
  };

  const handleDragEnter = (e, day) => {
    e.preventDefault();
    setDragOverDay(day);
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the cell itself, not a child
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverDay(null);
    }
  };

  const handleDrop = async (e, day) => {
    e.preventDefault();
    setDragOverDay(null);
    const campaign = draggedCampaign;
    if (!campaign || !onUpdateDate) return;

    const newDate = new Date(year, month, day);
    const oldDate = campaign.startDate ? new Date(campaign.startDate) : null;

    // Skip if dropped on the same day
    if (oldDate &&
        oldDate.getFullYear() === newDate.getFullYear() &&
        oldDate.getMonth() === newDate.getMonth() &&
        oldDate.getDate() === newDate.getDate()) {
      setDropFeedback({ type: 'info', message: 'Same day — no change needed' });
      setTimeout(() => setDropFeedback(null), 2000);
      setDraggedCampaign(null);
      return;
    }

    const newStartDate = new Date(year, month, day);
    // Keep original time if it had one
    if (campaign.startDate) {
      const orig = new Date(campaign.startDate);
      newStartDate.setHours(orig.getHours(), orig.getMinutes(), orig.getSeconds());
    }

    // Adjust end date by the same day offset if it exists
    let newEndDate = campaign.endDate ? new Date(campaign.endDate) : null;
    if (oldDate && newEndDate) {
      const dayDiff = Math.round((newStartDate - oldDate) / (1000 * 60 * 60 * 24));
      newEndDate.setDate(newEndDate.getDate() + dayDiff);
    }

    setDropFeedback({ type: 'info', message: `Moving "${campaign.name}"...` });
    try {
      await onUpdateDate(campaign.id, newStartDate.toISOString(), newEndDate?.toISOString() || null);
      setDropFeedback({ type: 'success', message: `Moved "${campaign.name}" to ${newDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` });
    } catch {
      setDropFeedback({ type: 'info', message: 'Failed to reschedule — try again' });
    }
    setTimeout(() => setDropFeedback(null), 3000);
    setDraggedCampaign(null);
  };

  // Map campaigns to dates
  const campaignsByDate = useMemo(() => {
    const map = {};
    const filtered = platformFilter === 'ALL' ? campaigns : campaigns.filter(c => c.platform === platformFilter);

    filtered.forEach(c => {
      const start = c.startDate ? new Date(c.startDate) : null;
      const end = c.endDate ? new Date(c.endDate) : null;
      if (!start) return;

      // Add start date
      const startKey = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
      if (!map[startKey]) map[startKey] = [];
      map[startKey].push({ ...c, _type: 'start' });

      // If it spans multiple days, mark all days between
      if (end && end > start) {
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          if (!map[key]) map[key] = [];
          if (d.getTime() === start.getTime()) continue; // already added
          if (d.getTime() === end.getTime()) {
            map[key].push({ ...c, _type: 'end' });
          } else {
            map[key].push({ ...c, _type: 'active' });
          }
        }
      }
    });
    return map;
  }, [campaigns, platformFilter]);

  const getDayCampaigns = (day) => {
    const key = `${year}-${month}-${day}`;
    return campaignsByDate[key] || [];
  };

  const selectedDayCampaigns = selectedDate ? getDayCampaigns(selectedDate) : [];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon size={20} className="text-brand-black" />
          <h3 className="text-lg font-bold font-display">Campaign Calendar</h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white border border-border rounded-lg p-1">
            {['ALL', 'INSTAGRAM', 'FACEBOOK', 'WHATSAPP', 'GOOGLE'].map(p => {
              const isActive = platformFilter === p;
              return (
                <button key={p} className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${isActive ? 'bg-brand-black text-white' : 'text-text-muted hover:bg-surface'}`}
                  onClick={() => setPlatformFilter(p)}>
                  {p === 'ALL' ? 'All' : p === 'INSTAGRAM' ? 'IG' : p === 'FACEBOOK' ? 'FB' : p === 'WHATSAPP' ? 'WA' : 'G/Y'}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Drop Feedback Banner */}
      {dropFeedback && (
        <div className={`px-4 py-3 rounded-xl border text-sm font-semibold animate-fadeIn flex items-center gap-2 ${
          dropFeedback.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {dropFeedback.type === 'success' ? '✓' : 'ℹ'} {dropFeedback.message}
        </div>
      )}

      {/* Drag Active Indicator */}
      {draggedCampaign && (
        <div className="px-4 py-2.5 rounded-xl border border-dashed border-brand-black bg-brand-black/5 text-sm font-semibold text-brand-black animate-fadeIn flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Dragging: <strong>{draggedCampaign.name}</strong> — drop on a day to reschedule
          <button className="ml-auto text-[10px] px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 transition-colors"
            onClick={() => { setDraggedCampaign(null); setDragOverDay(null); }}>
            Cancel
          </button>
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-border p-3">
        <button onClick={prevMonth} className="p-2 hover:bg-surface rounded-lg transition-colors">
          <ChevronLeft size={18} />
        </button>
        <span className="font-bold text-lg font-display">{monthName}</span>
        <button onClick={nextMonth} className="p-2 hover:bg-surface rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl border border-border shadow-soft overflow-hidden">
        {/* Day names */}
        <div className="grid grid-cols-7 border-b border-border">
          {weekDays.map(d => (
            <div key={d} className="p-2 text-center text-[10px] font-bold text-text-muted uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {/* Empty cells before first day */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[90px] p-1.5 border-b border-r border-border/50 bg-gray-50/30" />
          ))}

          {/* Day cells */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayCampaigns = getDayCampaigns(day);
            const isToday = new Date().getDate() === day && new Date().getMonth() === month && new Date().getFullYear() === year;
            const isSelected = selectedDate === day;

            const isDragOver = dragOverDay === day;
            return (
              <div key={day}
                className={`min-h-[90px] p-1.5 border-b border-r border-border/50 cursor-pointer transition-all
                  ${isSelected ? 'bg-brand-black/5 ring-2 ring-brand-black/20 ring-inset' : ''}
                  ${isToday ? 'bg-blue-50/50' : ''}
                  ${isDragOver && draggedCampaign ? 'bg-green-50 border-green-300 shadow-inner scale-[1.02] ring-2 ring-green-200' : ''}`}
                onClick={() => setSelectedDate(selectedDate === day ? null : day)}
                onDragOver={(e) => handleDragOver(e, day)}
                onDragEnter={(e) => handleDragEnter(e, day)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day)}>
                <div className={`text-xs font-bold mb-1 ${isToday ? 'text-blue-600' : 'text-text-muted'}`}>
                  {isToday && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block mr-1" />}
                  {day}
                </div>
                <div className="space-y-0.5">
                  {isDragOver && draggedCampaign && (
                    <div className="flex items-center justify-center h-full text-[8px] font-bold text-green-600 bg-green-50 rounded-lg border border-green-200 p-1">
                      Drop to reschedule
                    </div>
                  )}
                  {!isDragOver && dayCampaigns.slice(0, 3).map((c, idx) => {
                    const Icon = PLATFORM_ICONS[c.platform] || Target;
                    const isDragging = draggedCampaign?.id === c.id;
                    return (
                      <div key={`${c.id}-${idx}`}
                        draggable={!isDragging}
                        onDragStart={(e) => handleDragStart(e, c)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold transition-all cursor-grab active:cursor-grabbing
                          ${isDragging ? 'opacity-30 scale-90' : 'bg-white border border-border/50 hover:shadow-sm hover:border-brand-black/30'}
                          ${!isDragging && draggedCampaign ? 'border-dashed border-green-300 bg-green-50/50' : ''}`}
                        onClick={(e) => { if (!draggedCampaign) { e.stopPropagation(); openEdit(c); } }}>
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT_COLORS[c.status] || 'bg-gray-400'}`} />
                        <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-white flex-shrink-0 ${PLATFORM_COLORS[c.platform] || 'bg-gray-500'}`}>
                          {Icon && <Icon size={7} />}
                        </span>
                        <span className="truncate">{c.name}</span>
                        {!isDragging && draggedCampaign && <span className="ml-auto text-green-500 text-[8px]">📦</span>}
                      </div>
                    );
                  })}
                  {!isDragOver && dayCampaigns.length > 3 && (
                    <div className="text-[8px] text-text-muted font-semibold pl-1">+{dayCampaigns.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Details */}
      {selectedDate && (
        <div className="bg-white rounded-2xl border border-border shadow-soft p-4 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm flex items-center gap-2">
              <Clock size={14} className="text-text-muted" />
              Campaigns for {new Date(year, month, selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {draggedCampaign && <span className="text-[10px] text-green-600 font-semibold ml-2">(drop here to reschedule)</span>}
            </h4>
            <button className="btn-dark btn-sm flex items-center gap-1.5" onClick={openNew}>
              <Plus size={12} /> Add
            </button>
          </div>
          {selectedDayCampaigns.length === 0 ? (
            <div className="text-center py-6 text-text-muted text-sm">
              <CalendarIcon size={24} className="mx-auto mb-2 opacity-30" />
              <p>No campaigns scheduled for this day</p>
              <button className="mt-2 text-xs font-semibold text-brand-black hover:underline" onClick={openNew}>
                Create one now →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayCampaigns.map((c, idx) => {
                const Icon = PLATFORM_ICONS[c.platform] || Target;
                const colorClass = PLATFORM_COLORS[c.platform] || 'bg-gray-500';
                const isDragging = draggedCampaign?.id === c.id;
                return (
                  <div key={`${c.id}-${idx}`}
                    draggable={!isDragging}
                    onDragStart={(e) => handleDragStart(e, c)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing
                      ${isDragging ? 'opacity-40 scale-95 bg-gray-200' : 'bg-gray-50 border-border hover:bg-gray-100/50 hover:shadow-sm'}
                      ${!isDragging && draggedCampaign ? 'border-dashed border-green-300 bg-green-50/50' : ''}`}
                    onClick={() => { if (!draggedCampaign) openEdit(c); }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-[9px] ${colorClass}`}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{c.name}</div>
                        <div className="text-[10px] text-text-muted">
                          {c.platform} · ₹{Number(c.budget || 0).toLocaleString()}
                          {c._type === 'start' && ' · Starts'}
                          {c._type === 'end' && ' · Ends'}
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase ${c.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : c.status === 'PAUSED' ? 'bg-yellow-100 text-yellow-600' : c.status === 'COMPLETED' ? 'bg-blue-100 text-blue-600' : c.status === 'SCHEDULED' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
