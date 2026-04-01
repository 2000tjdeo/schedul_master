import React, { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';

const ITEM_H  = 34;           // smaller item height
const VISIBLE = 5;
const H       = ITEM_H * VISIBLE;   // 170px
const PAD     = ITEM_H * 2;         // 68px — top/bottom spacer

// ─── Single scrollable drum column ────────────────────────────────────────────
export function DrumColumn({ items, value, onChange, width = 60 }) {
  const ref      = useRef(null);
  const timerRef = useRef(null);
  const scrollingRef = useRef(false);

  const getIdx = useCallback(
    (v) => Math.max(0, items.findIndex((x) => String(x.value) === String(v))),
    [items],
  );

  const [dispIdx, setDispIdx] = useState(() => getIdx(value));

  // ── Initial scroll (mount only) ──────────────────────────────────────────
  useEffect(() => {
    const idx = getIdx(value);
    setDispIdx(idx);
    // setTimeout(0) lets the browser finish layout before scrollTop assignment
    const t = setTimeout(() => {
      if (ref.current) ref.current.scrollTop = idx * ITEM_H;
    }, 0);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync when value changes from outside (e.g. day-clamp) ───────────────
  useEffect(() => {
    if (scrollingRef.current) return;
    const idx = getIdx(value);
    if (idx === dispIdx) return;
    setDispIdx(idx);
    requestAnimationFrame(() => {
      ref.current?.scrollTo({ top: idx * ITEM_H, behavior: 'smooth' });
    });
  }, [value, items]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleScroll = useCallback(() => {
    if (!ref.current) return;
    scrollingRef.current = true;

    const snapIdx  = Math.round(ref.current.scrollTop / ITEM_H);
    const clamped  = Math.max(0, Math.min(snapIdx, items.length - 1));
    setDispIdx(clamped);

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      scrollingRef.current = false;
      if (items[clamped] && String(items[clamped].value) !== String(value)) {
        onChange(items[clamped].value);
      }
    }, 100);
  }, [items, value, onChange]);

  const onWheel = (e) => {
    if (!ref.current) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? 1 : -1;
    const newIdx = Math.max(0, Math.min(items.length - 1, dispIdx + dir));
    if (newIdx !== dispIdx) {
      ref.current.scrollTo({ top: newIdx * ITEM_H, behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{ position: 'relative', width, flexShrink: 0, userSelect: 'none' }}
      onWheel={onWheel}
    >
      {/* Center selection highlight */}
      <div style={{
        position: 'absolute', top: PAD, height: ITEM_H,
        left: 3, right: 3, borderRadius: 8,
        background: 'rgba(99,102,241,0.09)',
        border: '1px solid rgba(99,102,241,0.18)',
        pointerEvents: 'none', zIndex: 2,
      }} />
      {/* Top fade */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: PAD,
        background: 'linear-gradient(to bottom, #fff 50%, transparent)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      {/* Bottom fade */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: PAD,
        background: 'linear-gradient(to top, #fff 50%, transparent)',
        pointerEvents: 'none', zIndex: 3,
      }} />

      {/* Scrollable list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        className="drum-scroll"
        style={{
          height: H,
          overflowY: 'scroll',
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div style={{ height: PAD, flexShrink: 0 }} />
        {items.map((item, i) => {
          const isActive = i === dispIdx;
          const dist     = Math.abs(i - dispIdx);
          return (
            <div
              key={item.value}
              style={{
                height: ITEM_H,
                scrollSnapAlign: 'center',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize:   isActive ? 15 : dist === 1 ? 13 : 11,
                fontWeight: isActive ? 700 : dist === 1 ? 400 : 300,
                color:      isActive ? '#111' : dist === 1 ? '#777' : '#ccc',
                cursor: 'pointer',
                transition: 'font-size 0.1s, color 0.1s',
                letterSpacing: isActive ? '-0.2px' : '0',
              }}
              onClick={() => ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })}
            >
              {item.label}
            </div>
          );
        })}
        <div style={{ height: PAD, flexShrink: 0 }} />
      </div>
    </div>
  );
}

// ─── Date drum: Year / Month / Day ────────────────────────────────────────────
export function DateDrum({ value, onChange }) {
  const base   = new Date();
  const parsed = value
    ? value.split('-').map(Number)
    : [base.getFullYear(), base.getMonth() + 1, base.getDate()];
  const [y, m, d] = parsed;

  const years = Array.from({ length: 8 }, (_, i) => {
    const yr = base.getFullYear() - 1 + i;
    return { value: yr, label: `${yr}년` };
  });
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1, label: `${i + 1}월`,
  }));
  const daysInMonth = new Date(y, m, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => ({
    value: i + 1, label: `${i + 1}일`,
  }));

  const emit = (ny, nm, nd) => {
    const maxD  = new Date(ny, nm, 0).getDate();
    const safeD = Math.min(nd, maxD);
    onChange(`${ny}-${String(nm).padStart(2, '0')}-${String(safeD).padStart(2, '0')}`);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 0 }}>
      <DrumColumn items={years}  value={y} onChange={(ny) => emit(ny, m, d)} width={72} />
      <DrumColumn items={months} value={m} onChange={(nm) => emit(y, nm, d)} width={50} />
      <DrumColumn items={days}   value={d} onChange={(nd) => emit(y, m, nd)} width={44} />
    </div>
  );
}

// ─── Time drum: Hour / Minute ─────────────────────────────────────────────────
export function TimeDrum({ value, onChange, step = 5 }) {
  const [hStr, mStr] = (value || '09:00').split(':');
  const h      = parseInt(hStr, 10) || 0;
  const rawM   = parseInt(mStr, 10) || 0;
  const snapM  = Math.round(rawM / step) * step % 60;

  const hours = Array.from({ length: 24 }, (_, i) => ({
    value: i, label: `${String(i).padStart(2, '0')}시`,
  }));
  const minutes = Array.from({ length: Math.floor(60 / step) }, (_, i) => ({
    value: i * step, label: `${String(i * step).padStart(2, '0')}분`,
  }));

  const emit = (nh, nm) =>
    onChange(`${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 0 }}>
      <DrumColumn items={hours}   value={h}     onChange={(nh) => emit(nh, snapM)} width={62} />
      <DrumColumn items={minutes} value={snapM} onChange={(nm) => emit(h, nm)}     width={62} />
    </div>
  );
}

// ─── Global CSS for hiding scrollbars ─────────────────────────────────────────
export function DrumPickerStyles() {
  return (
    <style>{`
      .drum-scroll::-webkit-scrollbar { display: none; }
      .drum-scroll { -ms-overflow-style: none; scrollbar-width: none; }
    `}</style>
  );
}
