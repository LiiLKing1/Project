import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DateRangePicker = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(startDate ? new Date(startDate) : new Date());
  const [selecting, setSelecting] = useState('start'); // 'start' or 'end'
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const parseDate = (d) => {
    if (!d) return null;
    const dt = new Date(d);
    return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  };

  const sDate = parseDate(startDate);
  const eDate = parseDate(endDate);

  const handleDayClick = (date) => {
    if (selecting === 'start') {
      onChange({ start: date, end: null });
      setSelecting('end');
    } else {
      if (sDate && date < sDate) {
        onChange({ start: date, end: null });
        setSelecting('end');
      } else {
        onChange({ start: sDate, end: date });
        setSelecting('start');
        setIsOpen(false);
      }
    }
  };

  const renderCalendar = (monthOffset) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + monthOffset, 1);
    const month = date.getMonth();
    const year = date.getFullYear();

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Make Monday = 0

    const days = [];
    for (let i = 0; i < startOffset; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const monthNames = ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"];
    const dayNames = ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"];

    return (
      <div style={{ flex: 1, minWidth: '250px' }}>
        <div style={{ textAlign: 'center', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-main)' }}>
          {monthNames[month]} {year}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', marginBottom: '0.5rem' }}>
          {dayNames.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{d}</div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem 0' }}>
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;

            let isStart = sDate && sDate.getTime() === day.getTime();
            let isEnd = eDate && eDate.getTime() === day.getTime();
            let inRange = sDate && eDate && day > sDate && day < eDate;

            let style = {
              padding: '0.5rem',
              textAlign: 'center',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: (isStart || isEnd) ? 600 : 400,
              userSelect: 'none',
              color: 'var(--text-main)',
              backgroundColor: 'transparent',
              borderTop: '2px solid transparent',
              borderBottom: '2px solid transparent',
              borderLeft: '2px solid transparent',
              borderRight: '2px solid transparent',
              transition: 'background-color 0.2s',
            };

            if (isStart && !endDate) {
              style.borderTopColor = 'var(--primary)';
              style.borderBottomColor = 'var(--primary)';
              style.borderLeftColor = 'var(--primary)';
              style.borderRightColor = 'var(--primary)';
              style.borderRadius = 'var(--radius-md)';
              style.color = 'var(--primary)';
            } else if (isStart && endDate) {
              style.borderTopColor = 'var(--primary)';
              style.borderBottomColor = 'var(--primary)';
              style.borderLeftColor = 'var(--primary)';
              style.borderRightWidth = '0';
              style.borderRadius = 'var(--radius-md) 0 0 var(--radius-md)';
              style.color = 'var(--text-main)';
              style.backgroundColor = 'var(--bg-main)';
            } else if (isEnd) {
              style.borderTopColor = 'var(--success)';
              style.borderBottomColor = 'var(--success)';
              style.borderRightColor = 'var(--success)';
              style.borderLeftWidth = '0';
              style.borderRadius = '0 var(--radius-md) var(--radius-md) 0';
              style.color = 'var(--text-main)';
              style.backgroundColor = 'var(--bg-main)';
            } else if (inRange) {
              style.borderTopColor = 'var(--primary)';
              style.borderBottomColor = 'var(--primary)';
              style.borderLeftWidth = '0';
              style.borderRightWidth = '0';
              style.borderRadius = '0';
              style.color = 'var(--text-main)';
              style.backgroundColor = 'var(--bg-main)';
            }

            return (
              <div 
                key={idx} 
                onClick={() => handleDayClick(day)}
                style={style}
                onMouseEnter={(e) => {
                  if (!isStart && !isEnd && !inRange) e.currentTarget.style.backgroundColor = 'var(--bg-main)';
                }}
                onMouseLeave={(e) => {
                  if (!isStart && !isEnd && !inRange) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem', 
          backgroundColor: 'var(--bg-surface)', 
          padding: '0.5rem 1rem', 
          borderRadius: 'var(--radius-md)', 
          border: '1px solid var(--border-color)',
          cursor: 'pointer'
        }}
      >
        <CalendarIcon size={18} color="var(--text-secondary)" />
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ 
            color: startDate ? 'var(--primary)' : 'var(--text-secondary)', 
            fontWeight: startDate ? 600 : 400,
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            backgroundColor: selecting === 'start' && isOpen ? 'var(--bg-main)' : 'transparent'
          }} onClick={(e) => { e.stopPropagation(); setIsOpen(true); setSelecting('start'); }}>
            {startDate ? formatDate(startDate) : 'Boshlanish'}
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>-</span>
          <span style={{ 
            color: endDate ? 'var(--success)' : 'var(--text-secondary)', 
            fontWeight: endDate ? 600 : 400,
            cursor: 'pointer',
            padding: '0.25rem 0.5rem',
            borderRadius: '4px',
            backgroundColor: selecting === 'end' && isOpen ? 'var(--bg-main)' : 'transparent'
          }} onClick={(e) => { e.stopPropagation(); setIsOpen(true); setSelecting('end'); }}>
            {endDate ? formatDate(endDate) : 'Tugashi'}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '0.5rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-xl)',
              padding: '1.5rem',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-ghost" onClick={prevMonth} style={{ padding: '0.5rem' }}><ChevronLeft size={20} /></button>
              <div style={{ display: 'flex', gap: '2rem' }}>
                {renderCalendar(0)}
                {renderCalendar(1)}
              </div>
              <button className="btn btn-ghost" onClick={nextMonth} style={{ padding: '0.5rem' }}><ChevronRight size={20} /></button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selecting === 'start' ? "Boshlanish sanasini tanlang" : "Tugash sanasini tanlang"}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-outline" onClick={() => { onChange({start: null, end: null}); setIsOpen(false); }}>Tozalash</button>
                <button className="btn btn-primary" onClick={() => setIsOpen(false)}>Tayyor</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DateRangePicker;
