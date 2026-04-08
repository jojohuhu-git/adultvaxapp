import { useState, useCallback, useEffect, useRef } from 'react';
import { fmtDate, addDays } from '../utils/dateUtils.js';

const DOT_MAP = {
  done: { cls: 'done', icon: '\u2713' },
  now: { cls: 'now', icon: '\u2192' },
  soon: { cls: 'soon', icon: '!' },
  calc: { cls: 'calc', icon: '~' },
};

const TAG_MAP = {
  pneu: { cls: 'tag-pneu', label: 'Pneumo' },
  menc: { cls: 'tag-menc', label: 'MenACWY' },
  menb: { cls: 'tag-menb', label: 'MenB' },
  combo: { cls: 'tag-combo', label: 'MenABCWY' },
};

export default function ForecastTimeline({
  items,
  prefix,
  onDateChange,
  isCombo = false,
}) {
  const [dates, setDates] = useState({});
  const [products, setProducts] = useState({});
  const [lockedProducts, setLockedProducts] = useState({});
  const [computedDates, setComputedDates] = useState({});
  const [dotOverrides, setDotOverrides] = useState({});
  const [labelOverrides, setLabelOverrides] = useState({});
  const [descOverrides, setDescOverrides] = useState({});
  const [hiddenPickers, setHiddenPickers] = useState({});

  // Build metadata for each item (same structure as original)
  const meta = items.map((d) => ({
    intervalDays: d.intervalDays !== undefined ? d.intervalDays : null,
    intervalFrom: d.intervalFrom !== undefined ? d.intervalFrom : null,
    smartPneuDose1: !!d.smartPneuDose1,
    smartPneuDose2: !!d.smartPneuDose2,
    smartPneuAfterPPSV23: !!d.smartPneuAfterPPSV23,
    smartMenBDose1: !!d.smartMenBDose1,
    isMenBStep: !!(d.tags && d.tags.includes('menb')),
    isMencStep: !!(d.tags && d.tags.includes('menc')),
    isDone: d.status === 'done',
  }));

  // BFS date propagation
  const propagateDates = useCallback((sourceIdx, sourceDate, currentDates) => {
    const newDates = { ...currentDates };
    const newComputed = {};
    const newDots = {};
    const queue = [sourceIdx];
    const visited = new Set();

    while (queue.length) {
      const cur = queue.shift();
      if (visited.has(cur)) continue;
      visited.add(cur);

      const curDate = cur === sourceIdx ? sourceDate : (newDates[cur] || null);
      if (!curDate) continue;

      meta.forEach((m, j) => {
        if (m.intervalFrom !== cur || !m.intervalDays) return;
        const computed = addDays(curDate, m.intervalDays);
        const isoStr = computed.toISOString().slice(0, 10);
        newComputed[j] = fmtDate(computed);
        newDots[j] = 'calc';
        if (newDates[j] !== isoStr) {
          newDates[j] = isoStr;
          queue.push(j);
        }
      });
    }

    return { newDates, newComputed, newDots };
  }, [meta]);

  function handleDateChange(idx, dateStr) {
    const { newDates, newComputed, newDots } = propagateDates(idx, dateStr, { ...dates, [idx]: dateStr });
    setDates(newDates);
    setComputedDates(prev => ({ ...prev, ...newComputed }));
    setDotOverrides(prev => ({
      ...prev,
      [idx]: 'now',
      ...newDots,
    }));
    if (onDateChange) {
      onDateChange(prefix, idx, dateStr, newDates, meta);
    }
  }

  function handleProductSelect(idx, value) {
    setProducts(prev => ({ ...prev, [idx]: value }));
    const item = items[idx];

    // Smart Pneumococcal Dose 1 selection
    if (item.smartPneuDose1 && value) {
      const isPCV15 = value.includes('PCV15') || value.includes('Vaxneuvance');
      const isPCV2021 = value.includes('PCV20') || value.includes('PCV21') || value.includes('Prevnar 20') || value.includes('Capvaxive');

      setLabelOverrides(prev => ({ ...prev, [idx]: value }));

      if (isPCV15) {
        // Step 2 must be PPSV23
        setLabelOverrides(prev => ({ ...prev, [idx + 1]: 'Pneumovax 23\u00ae (PPSV23)' }));
        setDescOverrides(prev => ({
          ...prev,
          [idx + 1]: `Required to complete PCV15 series \u2014 ${meta[idx + 1]?.intervalDays === 56 ? '\u22658 weeks' : '\u22651 year'} after Vaxneuvance\u00ae`,
        }));
        setDotOverrides(prev => ({ ...prev, [idx + 1]: 'future' }));
        setLockedProducts(prev => ({ ...prev, [idx + 1]: 'Pneumovax 23\u00ae (PPSV23)' }));
        setHiddenPickers(prev => ({ ...prev, [idx + 1]: false }));
      } else if (isPCV2021) {
        setLabelOverrides(prev => ({ ...prev, [idx + 1]: '\u2713 Series complete \u2014 no further pneumococcal doses needed' }));
        setDescOverrides(prev => ({ ...prev, [idx + 1]: `${value} provides broad coverage. No PPSV23 required.` }));
        setDotOverrides(prev => ({ ...prev, [idx + 1]: 'done' }));
        setHiddenPickers(prev => ({ ...prev, [idx + 1]: true }));
      }
    }

    // Smart PPSV23-first path
    if (item.smartPneuAfterPPSV23 && value) {
      setLabelOverrides(prev => ({ ...prev, [idx]: value }));
      const isPCV15 = value.includes('PCV15') || value.includes('Vaxneuvance');
      if (isPCV15) {
        setDescOverrides(prev => ({
          ...prev,
          [idx]: 'Vaxneuvance\u00ae chosen \u2014 note: PPSV23 was already received, no additional PPSV23 needed. Series complete.',
        }));
      } else {
        setDescOverrides(prev => ({
          ...prev,
          [idx]: `${value} chosen \u2014 series complete. No further pneumococcal doses needed.`,
        }));
      }
    }

    // Smart MenB brand locking
    if (item.smartMenBDose1 && value) {
      const isBexsero = value.toLowerCase().includes('bexsero');
      const isTrumenba = value.toLowerCase().includes('trumenba');
      if (!isBexsero && !isTrumenba) return;

      const lockedBrand = isBexsero ? 'Bexsero\u00ae (MenB-4C)' : 'Trumenba\u00ae (MenB-FHbp)';
      const lockedBrandShort = isBexsero ? 'Bexsero\u00ae' : 'Trumenba\u00ae';

      // Update own label
      setLabelOverrides(prev => {
        const txt = prev[idx] || items[idx].label;
        return {
          ...prev,
          [idx]: txt
            .replace(/Bexsero® OR Trumenba®/gi, lockedBrandShort)
            .replace(/select brand/gi, lockedBrandShort)
            .replace(/confirm brand first/gi, lockedBrandShort)
            .replace(/confirm brand/gi, lockedBrandShort)
            .replace(/select same brand as Dose 1/gi, lockedBrandShort)
            .replace(/same brand/gi, lockedBrandShort),
        };
      });

      // Lock downstream MenB steps
      meta.forEach((m, j) => {
        if (j <= idx || !m.isMenBStep) return;
        setLockedProducts(prev => ({ ...prev, [j]: lockedBrand }));
        setLabelOverrides(prev => {
          const txt = prev[j] || items[j].label;
          return {
            ...prev,
            [j]: txt
              .replace(/Bexsero® OR Trumenba®/gi, lockedBrandShort)
              .replace(/Bexsero® \(MenB-4C\) or Trumenba® \(MenB-FHbp\)/gi, lockedBrandShort)
              .replace(/same brand as Dose 1/gi, lockedBrandShort)
              .replace(/select brand/gi, lockedBrandShort)
              .replace(/confirm brand first/gi, lockedBrandShort)
              .replace(/confirm brand/gi, lockedBrandShort)
              .replace(/same brand/gi, lockedBrandShort)
              .replace(/match prior brand/gi, lockedBrandShort),
          };
        });
      });
    }

    // Combo track Dose 1 brand locking
    if (isCombo && idx === 0 && value) {
      const isPenbraya = value.toLowerCase().includes('penbraya');
      const isPenmenvy = value.toLowerCase().includes('penmenvy');
      if (!isPenbraya && !isPenmenvy) return;

      const matchedMenBBrand = isPenbraya ? 'Trumenba\u00ae (MenB-FHbp)' : 'Bexsero\u00ae (MenB-4C)';
      const comboProductValue = value;

      meta.forEach((m, j) => {
        if (j === 0) return;
        const labelText = (labelOverrides[j] || items[j]?.label || '').toLowerCase();
        const isComboStep = labelText.includes('menabcwy') || (items[j]?.products?.some(p => p.includes('Penbraya')) && items[j]?.products?.some(p => p.includes('Penmenvy')));
        const isMenBStandalone = labelText.includes('standalone') || (m.isMenBStep && !isComboStep);
        const isMenBBooster = (labelText.includes('booster') || labelText.includes('subsequent')) && m.isMenBStep && !isComboStep;

        if (isComboStep && !isMenBStandalone) {
          setLockedProducts(prev => ({ ...prev, [j]: comboProductValue }));
        } else if (isMenBStandalone || isMenBBooster) {
          setLockedProducts(prev => ({ ...prev, [j]: matchedMenBBrand }));
        }
      });
    }
  }

  return (
    <div className="forecast-timeline">
      {items.map((f, i) => {
        const dotStatus = dotOverrides[i] || f.status;
        const dot = DOT_MAP[dotStatus] || { cls: 'future', icon: '\u25cb' };
        const tags = f.tags || [];
        const needPicker = f.status !== 'done' && f.intervalDays !== undefined && !hiddenPickers[i];
        const itemProducts = lockedProducts[i] ? [lockedProducts[i]] : (f.products || []);
        const isLocked = !!lockedProducts[i];
        const displayLabel = labelOverrides[i] || f.label;
        const displayDesc = descOverrides[i] || f.desc;
        const displayDate = computedDates[i] || f.date || '';
        const isComputed = !!computedDates[i];

        return (
          <div key={i} className="timeline-item">
            <div className="timeline-dot-col">
              <div className={`timeline-dot ${dot.cls}`}>{dot.icon}</div>
              <div className={`timeline-date-badge${isComputed ? ' computed' : ''}`}>
                {dates[i] ? fmtDate(new Date(dates[i] + 'T12:00:00')) : displayDate}
              </div>
            </div>
            <div className="timeline-content">
              <div className="timeline-row-top">
                <div className="timeline-label">{displayLabel}</div>
                <div>
                  {tags.map(t => {
                    const tag = TAG_MAP[t] || { cls: '', label: t };
                    return <span key={t} className={`timeline-tag ${tag.cls}`}>{tag.label}</span>;
                  })}
                </div>
              </div>
              {displayDesc && <div className="timeline-desc">{displayDesc}</div>}
              {needPicker && (
                <div className="timeline-date-picker">
                  {itemProducts.length > 0 && (
                    <>
                      <select
                        className={`forecast-product-select${(products[i] || isLocked) ? ' selected' : ''}`}
                        value={products[i] || (isLocked ? lockedProducts[i] : '')}
                        onChange={e => handleProductSelect(i, e.target.value)}
                        disabled={isLocked}
                        style={isLocked ? { opacity: 0.85 } : undefined}
                        title={isLocked ? `Locked: must use ${lockedProducts[i]}` : undefined}
                        onClick={e => e.stopPropagation()}
                      >
                        {!isLocked && <option value="">Select product&hellip;</option>}
                        {itemProducts.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      {isLocked && (
                        <span style={{
                          fontSize: '0.78rem', color: 'var(--green)',
                          fontWeight: 600, whiteSpace: 'nowrap', marginLeft: 4,
                        }}>
                          &larr; locked
                        </span>
                      )}
                    </>
                  )}
                  <label>Date:</label>
                  <input
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={dates[i] || ''}
                    onChange={e => handleDateChange(i, e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
