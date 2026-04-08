import { useState, useCallback, useRef } from 'react';
import StatusItem from './StatusItem.jsx';
import ForecastTimeline from './ForecastTimeline.jsx';
import CoadminAlert from './CoadminAlert.jsx';
import { AGE_LABELS, RISK_LABELS, IMMUNO_RISKS, VAX_COLORS, VAX_LABELS } from '../constants/vaccineData.js';
import { fmtHistDate } from '../utils/dateUtils.js';

export default function ResultsPanel({ results, pneuHistory, meningHistory }) {
  const [menTrack, setMenTrack] = useState('std');
  const [pneuForecastOpen, setPneuForecastOpen] = useState(true);
  const [menForecastOpen, setMenForecastOpen] = useState(true);
  const [coadminAlert, setCoadminAlert] = useState(null);

  // Track planned dates for co-admin checking
  const menDatesRef = useRef({});
  const menComboDatesRef = useRef({});

  const handleMenDateChange = useCallback((prefix, idx, dateStr, allDates, meta) => {
    const datesRef = prefix === 'men-combo' ? menComboDatesRef : menDatesRef;
    datesRef.current = allDates;
    checkCoadmin(prefix === 'men-combo' ? 'men-combo' : 'men');
  }, [results]);

  function checkCoadmin(activePrefix) {
    const activeDates = activePrefix === 'men-combo' ? menComboDatesRef.current : menDatesRef.current;
    const meta = activePrefix === 'men-combo'
      ? results.menForecastCombo.map(buildMeta)
      : results.menForecast.map(buildMeta);

    const mencDates = [];
    const menbDates = [];

    meta.forEach((m, i) => {
      if (m.isDone) return;
      const dateStr = activeDates[i];
      if (!dateStr) return;
      if (m.isMencStep) mencDates.push(dateStr);
      if (m.isMenBStep) menbDates.push(dateStr);
    });

    if (mencDates.length === 0 || menbDates.length === 0) {
      const hasMenc = meta.some(m => m.isMencStep && !m.isDone);
      const hasMenb = meta.some(m => m.isMenBStep && !m.isDone);
      if ((mencDates.length > 0 || menbDates.length > 0) && hasMenc && hasMenb) {
        setCoadminAlert({ type: 'prompt', mencDates, menbDates });
      } else {
        setCoadminAlert(null);
      }
      return;
    }

    let minGapDays = Infinity;
    let closestMenc = null, closestMenb = null;
    mencDates.forEach(md => {
      menbDates.forEach(bd => {
        const gap = Math.abs(new Date(md + 'T12:00:00') - new Date(bd + 'T12:00:00')) / 86400000;
        if (gap < minGapDays) {
          minGapDays = gap;
          closestMenc = md;
          closestMenb = bd;
        }
      });
    });

    if (minGapDays === 0) {
      setCoadminAlert({ type: 'same-day', mencDates, menbDates });
    } else if (minGapDays <= 14) {
      setCoadminAlert({ type: 'close-dates', mencDates, menbDates, gapDays: minGapDays, mencDate: closestMenc, menbDate: closestMenb });
    } else {
      setCoadminAlert({ type: 'far-apart', mencDates, menbDates, gapDays: minGapDays });
    }
  }

  function buildMeta(d) {
    return {
      isMenBStep: !!(d.tags && d.tags.includes('menb')),
      isMencStep: !!(d.tags && d.tags.includes('menc')),
      isDone: d.status === 'done',
    };
  }

  if (!results) {
    return (
      <div className="results-panel">
        <div className="empty-state">
          <h2>Enter patient information to begin</h2>
          <p>
            Select the patient's age, any risk factors, and prior vaccine history.
            The advisor will evaluate each vaccine, flag errors, identify what's due,
            and generate a personalized forecast schedule.
          </p>
        </div>
      </div>
    );
  }

  const { pneuItems, pneuForecast, menItems, menForecast, menForecastCombo, isImmuno, hasRisk, riskList, age } = results;
  const hasCombo = menForecastCombo && menForecastCombo.length > 0;

  function renderVaxHistory(history) {
    if (!history || history.length === 0) {
      return <div style={{ fontSize: '0.75rem', color: 'var(--ink3)' }}>None recorded</div>;
    }
    return history.map((d, i) => (
      <div key={i} className="vax-hist-item">
        <div className="vax-hist-dot" style={{ background: VAX_COLORS[d.vax] }} />
        <span className="vax-hist-name">{VAX_LABELS[d.vax]}</span>
        <span className="vax-hist-date">{fmtHistDate(d)}</span>
      </div>
    ));
  }

  return (
    <div className="results-panel">
      {/* Patient Summary Bar */}
      <div className="patient-bar">
        <div>
          <span className="patient-bar-label">AGE</span><br />
          <span className="patient-bar-val">{AGE_LABELS[age]}</span>
        </div>
        <div className="patient-bar-sep">|</div>
        <div>
          <span className="patient-bar-label">RISK STATUS</span><br />
          <span className="patient-bar-val">
            {isImmuno ? '\ud83d\udd34 Immunocompromising' : hasRisk ? '\ud83d\udfe1 Standard Risk' : '\ud83d\udfe2 No Risk Factors'}
          </span>
        </div>
        {riskList.length > 0 && (
          <>
            <div className="patient-bar-sep">|</div>
            <div>
              <span className="patient-bar-label">CONDITIONS</span><br />
              {riskList.map(r => (
                <span
                  key={r}
                  className={`pill ${isImmuno && IMMUNO_RISKS.includes(r) ? 'pill-red' : 'pill-amber'}`}
                >
                  {RISK_LABELS[r] || r}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pneumococcal Card */}
      <div className="result-card">
        <div className="result-card-header">
          <div className="result-card-icon" style={{
            width: 36, height: 36, borderRadius: 7,
            background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'ui-monospace, monospace', fontSize: '0.72rem', fontWeight: 800,
            color: '#1e40af', flexShrink: 0, letterSpacing: '-0.03em',
          }}>PCV</div>
          <div>
            <div className="result-card-title">Pneumococcal Vaccines</div>
            <div className="result-card-sub">Vaxneuvance&reg; &middot; Prevnar 20&reg; &middot; Capvaxive&reg; &middot; Pneumovax 23&reg;</div>
          </div>
        </div>
        <div className="result-card-body">
          <div className="section-label">Prior History</div>
          <div className="vax-history-list">{renderVaxHistory(pneuHistory)}</div>
          <div className="section-label" style={{ marginTop: 10 }}>Assessment</div>
          {pneuItems.map((item, i) => <StatusItem key={i} item={item} />)}
        </div>
        {pneuForecast.length > 0 && (
          <>
            <div className="forecast-options" style={{ paddingBottom: 0 }}>
              <span className="forecast-options-label">Pneumococcal Schedule</span>
            </div>
            <button
              className={`collapsible-toggle${pneuForecastOpen ? ' open' : ''}`}
              onClick={() => setPneuForecastOpen(!pneuForecastOpen)}
            >
              Schedule Forecast &mdash; Pneumococcal
              <span style={{ fontSize: '0.85rem', fontWeight: 400, opacity: 0.55, marginLeft: 6 }}>
                Pick a planned date to calculate subsequent doses
              </span>
            </button>
            <div className={`collapsible-body${pneuForecastOpen ? ' open' : ''}`}>
              <ForecastTimeline items={pneuForecast} prefix="pneu" />
            </div>
          </>
        )}
      </div>

      {/* Meningococcal Card */}
      <div className="result-card">
        <div className="result-card-header">
          <div className="result-card-icon" style={{
            width: 36, height: 36, borderRadius: 7,
            background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'ui-monospace, monospace', fontSize: '0.72rem', fontWeight: 800,
            color: '#14532d', flexShrink: 0, letterSpacing: '-0.03em',
          }}>MEN</div>
          <div>
            <div className="result-card-title">Meningococcal Vaccines</div>
            <div className="result-card-sub">Menveo&reg;/MenQuadfi&reg; &middot; Bexsero&reg;/Trumenba&reg; &middot; Penbraya&trade;/Penmenvy&trade;</div>
          </div>
        </div>
        <div className="result-card-body">
          <div className="section-label">Prior History</div>
          <div className="vax-history-list">{renderVaxHistory(meningHistory)}</div>
          <div className="section-label" style={{ marginTop: 10 }}>Assessment &mdash; MenACWY</div>
          {menItems.filter(i => i._cat === 'acwy' || (!i._cat && !i._menb)).map((item, i) => (
            <StatusItem key={`acwy-${i}`} item={item} />
          ))}
          <div className="section-label" style={{ marginTop: 14 }}>Assessment &mdash; MenB</div>
          {menItems.filter(i => i._cat === 'menb' || i._menb).map((item, i) => (
            <StatusItem key={`menb-${i}`} item={item} />
          ))}
          {/* Items without _cat (complement inhibitor, asplenia, off-label, catch-up) */}
          {menItems.filter(i => !i._cat && !i._menb).map((item, i) => (
            <StatusItem key={`gen-${i}`} item={item} />
          ))}
        </div>
        {menForecast.length > 0 && (
          <>
            {hasCombo && (
              <div className="forecast-options">
                <span className="forecast-options-label">Schedule:</span>
                <button
                  className={`forecast-option-btn${menTrack === 'std' ? ' active-std' : ''}`}
                  onClick={() => setMenTrack('std')}
                >
                  Separate vaccines
                </button>
                <button
                  className={`forecast-option-btn${menTrack === 'combo' ? ' active-combo' : ''}`}
                  onClick={() => setMenTrack('combo')}
                >
                  &#10022; Combination (Penbraya&trade;/Penmenvy&trade;)
                </button>
              </div>
            )}
            <button
              className={`collapsible-toggle${menForecastOpen ? ' open' : ''}`}
              onClick={() => setMenForecastOpen(!menForecastOpen)}
            >
              Schedule Forecast &mdash; Meningococcal
              <span style={{ fontSize: '0.85rem', fontWeight: 400, opacity: 0.55, marginLeft: 6 }}>
                Pick a planned date to calculate subsequent doses
              </span>
            </button>
            <div className={`collapsible-body${menForecastOpen ? ' open' : ''}`}>
              {coadminAlert && (
                <CoadminAlert {...coadminAlert} />
              )}
              <div className={`forecast-track${menTrack === 'std' ? ' active' : ''}`}>
                <ForecastTimeline
                  items={menForecast}
                  prefix="men"
                  onDateChange={handleMenDateChange}
                />
              </div>
              {hasCombo && (
                <div className={`forecast-track${menTrack === 'combo' ? ' active' : ''}`}>
                  <div className="combo-note">
                    <strong>&#10022; MenABCWY Combination Schedule</strong><br />
                    Uses Penbraya&trade; (Pfizer) or Penmenvy&trade; (GSK) &mdash; both MenACWY + MenB in one injection
                    when both are due at the same visit. Pick one product and stay with it.
                    Subsequent MenB doses must use the matched standalone brand:{' '}
                    <strong>Penbraya&trade; &rarr; Trumenba&reg;</strong> &middot;{' '}
                    <strong>Penmenvy&trade; &rarr; Bexsero&reg;</strong>.
                  </div>
                  <ForecastTimeline
                    items={menForecastCombo}
                    prefix="men-combo"
                    isCombo
                    onDateChange={handleMenDateChange}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="alert-box info" style={{ fontSize: '0.71rem', opacity: 0.75 }}>
        <strong>&#9888;&#65039; For healthcare provider use only.</strong> Decision support based on
        CDC/ACIP and immunize.org recommendations (2025). Verify against current guidelines.
        Does not replace clinical judgment.
      </div>
    </div>
  );
}
