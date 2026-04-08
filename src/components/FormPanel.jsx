import { useState } from 'react';
import MultiSelect from './MultiSelect.jsx';
import {
  IMMUNO_OPTIONS, OTHER_RISK_OPTIONS,
  PNEU_VAX_OPTIONS, MENING_VAX_OPTIONS,
  VAX_COLORS, VAX_LABELS,
} from '../constants/vaccineData.js';
import { fmtHistDate, toDecimalYear } from '../utils/dateUtils.js';

export default function FormPanel({
  age, setAge,
  immunoRisks, setImmunoRisks,
  otherRisks, setOtherRisks,
  pneuHistory, setPneuHistory,
  meningHistory, setMeningHistory,
  onAnalyze,
  formError,
}) {
  const [pneuVax, setPneuVax] = useState('');
  const [pneuDate, setPneuDate] = useState('');
  const [pneuYear, setPneuYear] = useState('');
  const [meningVax, setMeningVax] = useState('');
  const [meningDate, setMeningDate] = useState('');
  const [meningYear, setMeningYear] = useState('');

  function addVax(type) {
    const vax = type === 'pneu' ? pneuVax : meningVax;
    const dateVal = type === 'pneu' ? pneuDate : meningDate;
    const yearVal = type === 'pneu' ? pneuYear : meningYear;

    if (!vax) return;

    let dateStr = null;
    let yearDecimal = null;

    if (dateVal) {
      const d = new Date(dateVal + 'T12:00:00');
      if (isNaN(d.getTime())) return;
      const yr = d.getFullYear();
      if (yr < 1980 || yr > new Date().getFullYear() + 1) return;
      dateStr = dateVal;
      yearDecimal = toDecimalYear(dateVal);
    } else if (yearVal) {
      const yr = parseInt(yearVal);
      if (!yr || yr < 1980 || yr > 2030) return;
      yearDecimal = yr;
    } else {
      return;
    }

    const entry = { vax, year: yearDecimal, dateStr };
    if (type === 'pneu') {
      const newHistory = [...pneuHistory, entry].sort((a, b) => a.year - b.year);
      setPneuHistory(newHistory);
      setPneuVax('');
      setPneuDate('');
      setPneuYear('');
    } else {
      const newHistory = [...meningHistory, entry].sort((a, b) => a.year - b.year);
      setMeningHistory(newHistory);
      setMeningVax('');
      setMeningDate('');
      setMeningYear('');
    }
  }

  function removeVax(type, idx) {
    if (type === 'pneu') {
      setPneuHistory(pneuHistory.filter((_, i) => i !== idx));
    } else {
      setMeningHistory(meningHistory.filter((_, i) => i !== idx));
    }
  }

  function renderHistory(type) {
    const arr = type === 'pneu' ? pneuHistory : meningHistory;
    return arr.map((d, i) => (
      <div key={i} className="vax-hist-item">
        <div className="vax-hist-dot" style={{ background: VAX_COLORS[d.vax] || '#6a7a9a' }} />
        <span className="vax-hist-name">{VAX_LABELS[d.vax]}</span>
        <span className="vax-hist-date">{fmtHistDate(d)}</span>
        <button className="remove-btn" onClick={() => removeVax(type, i)}>&times;</button>
      </div>
    ));
  }

  return (
    <div className="form-panel">
      <div className="form-panel-header">Patient Profile</div>
      <div className="form-body">

        {/* Age */}
        <div className="field-group">
          <label className="field-label" htmlFor="age">Patient Age</label>
          <select id="age" value={age} onChange={e => setAge(e.target.value)}>
            <option value="">&mdash; Select age &mdash;</option>
            <optgroup label="Adolescents (off-label ACIP use may apply)">
              <option value="11">11&ndash;15 years</option>
              <option value="16">16&ndash;17 years</option>
            </optgroup>
            <optgroup label="Adults">
              <option value="19">19&ndash;29 years</option>
              <option value="30">30&ndash;39 years</option>
              <option value="40">40&ndash;49 years</option>
              <option value="50">50&ndash;64 years</option>
              <option value="65">65+ years</option>
            </optgroup>
          </select>
        </div>

        {/* Immunocompromising Conditions */}
        <div className="field-group">
          <div className="field-label">Immunocompromising Conditions</div>
          <div className="field-sub">Select all that apply &mdash; triggers accelerated/extended schedules</div>
          <MultiSelect
            id="ms-immuno"
            options={IMMUNO_OPTIONS}
            selected={immunoRisks}
            onChange={setImmunoRisks}
            placeholder="Tap to select conditions\u2026"
          />
        </div>

        {/* Other Risk Conditions */}
        <div className="field-group">
          <div className="field-label">Other Risk Conditions</div>
          <div className="field-sub">Select all that apply</div>
          <MultiSelect
            id="ms-other"
            options={OTHER_RISK_OPTIONS}
            selected={otherRisks}
            onChange={setOtherRisks}
            placeholder="Tap to select conditions\u2026"
          />
        </div>

        <div className="divider" />

        {/* Pneumococcal History */}
        <div className="field-group">
          <div className="field-label">Prior Pneumococcal Vaccines</div>
          <div className="field-sub">Enter date received &mdash; use full date if known, or year only</div>
          <div className="vax-history-list" style={{ marginBottom: 8 }}>
            {renderHistory('pneu')}
          </div>
          <div className="add-vax-row">
            <select value={pneuVax} onChange={e => setPneuVax(e.target.value)}>
              <option value="">Select vaccine&hellip;</option>
              {PNEU_VAX_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="add-vax-bottom">
              <input
                type="date"
                className="date-input-full"
                title="Full date (more precise)"
                value={pneuDate}
                onChange={e => setPneuDate(e.target.value)}
              />
              <span className="date-or">or</span>
              <input
                type="number"
                className="date-input-year"
                placeholder="Year"
                min="1980" max="2030"
                title="Year only"
                value={pneuYear}
                onChange={e => setPneuYear(e.target.value)}
              />
              <button className="add-btn" onClick={() => addVax('pneu')}>+ Add</button>
            </div>
          </div>
        </div>

        {/* Meningococcal History */}
        <div className="field-group">
          <div className="field-label">Prior Meningococcal Vaccines</div>
          <div className="field-sub">Enter date received &mdash; use full date if known, or year only</div>
          <div className="vax-history-list" style={{ marginBottom: 8 }}>
            {renderHistory('mening')}
          </div>
          <div className="add-vax-row">
            <select value={meningVax} onChange={e => setMeningVax(e.target.value)}>
              <option value="">Select vaccine&hellip;</option>
              {MENING_VAX_OPTIONS.map(group => (
                <optgroup key={group.label} label={group.label}>
                  {group.options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="add-vax-bottom">
              <input
                type="date"
                className="date-input-full"
                title="Full date (more precise)"
                value={meningDate}
                onChange={e => setMeningDate(e.target.value)}
              />
              <span className="date-or">or</span>
              <input
                type="number"
                className="date-input-year"
                placeholder="Year"
                min="1980" max="2030"
                title="Year only"
                value={meningYear}
                onChange={e => setMeningYear(e.target.value)}
              />
              <button className="add-btn" onClick={() => addVax('mening')}>+ Add</button>
            </div>
          </div>
        </div>

        {formError && (
          <div style={{
            background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b',
            borderRadius: 7, padding: '10px 14px', fontSize: '0.92rem', fontWeight: 600,
          }}>
            {'\u26a0'} {formError}
          </div>
        )}

        <button className="analyze-btn" onClick={onAnalyze}>
          Analyze Vaccine Status &rarr;
        </button>
      </div>
    </div>
  );
}
