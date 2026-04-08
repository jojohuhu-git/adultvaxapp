import { yrDisplay } from '../utils/dateUtils.js';
import { fmtHistDate } from '../utils/dateUtils.js';
import {
  isMenuACWY, isMenB,
  B_PCV15, B_PCV20, B_PCV21, B_PPSV23, B_PCV20_21, B_PCV15_20_21,
  B_MenACWY, B_MenB_either, B_MenABCWY,
  brandedMenB, brandedMenACWY,
} from '../utils/vaccineHelpers.js';
import { getRefObjects } from '../constants/references.js';

function R(...keys) {
  return getRefObjects(...keys);
}

/**
 * Main analysis engine. Takes patient data, returns structured results.
 * @param {number} age - Patient age bracket value
 * @param {Set} risks - Set of risk factor keys
 * @param {Array} pneuHistory - Array of {vax, year, dateStr}
 * @param {Array} meningHistory - Array of {vax, year, dateStr}
 * @returns {Object} { pneuItems, pneuForecast, menItems, menForecast, menForecastCombo, isImmuno, hasRisk, riskList }
 */
export function analyzeVaccineStatus(age, risks, pneuHistory, meningHistory) {
  const isImmuno = ['hiv', 'asplenia', 'complement', 'complement_inhibitor', 'malignancy',
    'renal', 'immunosuppressed', 'transplant', 'hsct', 'cochlear', 'csf_leak'].some(r => risks.has(r));
  const hasRisk = isImmuno || ['heart', 'lung', 'diabetes', 'liver', 'alcoholism', 'smoking'].some(r => risks.has(r));

  const pneu = pneuHistory.map(d => ({ ...d }));
  const mening = meningHistory.map(d => ({ ...d }));
  const currentYear = new Date().getFullYear();

  // Helpers
  const hasPCV = (v) => pneu.some(d => d.vax === v);
  const hasPCVAny = (...vs) => vs.some(v => pneu.some(d => d.vax === v));
  const lastPCVYear = (v) => {
    const d = [...pneu].filter(x => x.vax === v).sort((a, b) => b.year - a.year)[0];
    return d ? d.year : null;
  };
  const lastPneuYear = () => pneu.length ? Math.max(...pneu.map(d => d.year)) : null;
  const hasMenACWY = () => mening.some(d => isMenuACWY(d.vax));
  const lastMenACWYYear = () => {
    const ds = mening.filter(d => isMenuACWY(d.vax));
    return ds.length ? Math.max(...ds.map(d => d.year)) : null;
  };
  const countMenACWY = () => mening.filter(d => isMenuACWY(d.vax)).length;
  const hasMenB = () => mening.some(d => isMenB(d.vax));
  const countMenB = () => mening.filter(d => isMenB(d.vax)).length;
  const lastMenBYear = () => {
    const ds = mening.filter(d => isMenB(d.vax));
    return ds.length ? Math.max(...ds.map(d => d.year)) : null;
  };
  const menBBrandFn = () => {
    const d = mening.find(x =>
      x.vax === 'menb_bexsero' || x.vax === 'menb_trumenba' ||
      x.vax === 'menabcwy_penbraya' || x.vax === 'menabcwy_penmenvy'
    );
    if (!d) return null;
    if (d.vax === 'menb_bexsero' || d.vax === 'menabcwy_penmenvy') return 'Bexsero';
    if (d.vax === 'menb_trumenba' || d.vax === 'menabcwy_penbraya') return 'Trumenba';
    return 'unknown';
  };
  const hasMixedMenB = () => {
    const brands = new Set(
      mening.filter(d => isMenB(d.vax)).map(d => {
        if (d.vax === 'menb_bexsero' || d.vax === 'menabcwy_penmenvy') return 'Bexsero';
        if (d.vax === 'menb_trumenba' || d.vax === 'menabcwy_penbraya') return 'Trumenba';
        return 'unknown';
      })
    );
    return brands.size > 1 && !brands.has('unknown');
  };

  const pneuItems = [];
  const pneuForecast = [];

  const receivedPCV20or21 = hasPCVAny('pcv20', 'pcv21');
  const receivedPCV15 = hasPCV('pcv15');
  const receivedPCV13 = hasPCV('pcv13');
  const receivedPCV7only = hasPCV('pcv7') && !hasPCVAny('pcv13', 'pcv15', 'pcv20', 'pcv21');
  const receivedPPSV23 = hasPCV('ppsv23');
  const lastPPSV23 = lastPCVYear('ppsv23');
  const hasHSCT = risks.has('hsct');
  const pneuIndicated = age >= 50 || hasRisk || hasHSCT;

  if (!pneuIndicated) {
    pneuItems.push({
      type: 'info', icon: '\u2139\ufe0f',
      title: 'Pneumococcal vaccine not routinely indicated',
      detail: 'Routine pneumococcal vaccination begins at age 50. For adults 19\u201349, vaccination is indicated only with specific risk conditions. No qualifying risk conditions selected.',
      refs: R('cdc_adult', 'immunize_pneu'),
    });
  } else {
    // HSCT
    if (hasHSCT) {
      pneuItems.push({
        type: 'special', icon: '\ud83d\udd04',
        title: 'Post-HSCT: All prior vaccination history nullified \u2014 restart required',
        chips: [
          { text: 'Prevnar 20\u00ae preferred', type: 'brand' },
          { text: '4-dose series', type: 'interval' },
          { text: 'Start 4\u20136 mo post-transplant', type: 'interval' },
          { text: 'No PPSV23 in first 12 mo', type: 'warn' },
        ],
        detail: `A complete new PCV series is required regardless of prior doses. Preferred: 4-dose ${B_PCV20} series starting 4\u20136 months post-transplant (doses at 0, 1, 2, and 8 months from series start). Do not give ${B_PPSV23} alone within the first 12 months post-HSCT.`,
        refs: R('cdc_adult', 'mmwr_pneu23'),
      });
      pneuForecast.push({ status: 'now', label: 'Dose 1 \u2014 Prevnar 20\u00ae (PCV20)', desc: 'Start 4\u20136 months post-transplant', date: 'Plan date \u2193', products: ['Prevnar 20\u00ae (PCV20)', 'Capvaxive\u00ae (PCV21)', 'Vaxneuvance\u00ae (PCV15)', 'Pneumovax 23\u00ae (PPSV23)'], tags: ['pneu'], intervalDays: 0 });
      pneuForecast.push({ status: 'future', products: ['Prevnar 20\u00ae (PCV20)'], label: 'Dose 2 \u2014 Prevnar 20\u00ae (PCV20)', desc: '1 month after Dose 1', date: '', tags: ['pneu'], intervalDays: 30, intervalFrom: 0 });
      pneuForecast.push({ status: 'future', products: ['Prevnar 20\u00ae (PCV20)'], label: 'Dose 3 \u2014 Prevnar 20\u00ae (PCV20)', desc: '1 month after Dose 2', date: '', tags: ['pneu'], intervalDays: 30, intervalFrom: 1 });
      pneuForecast.push({ status: 'future', products: ['Prevnar 20\u00ae (PCV20)'], label: 'Dose 4 \u2014 Prevnar 20\u00ae (PCV20)', desc: '6 months after Dose 3 \u2014 series complete', date: '', tags: ['pneu'], intervalDays: 180, intervalFrom: 2 });
    }
    // PCV20 or PCV21 received
    else if (receivedPCV20or21) {
      const whichHigher = pneu.find(d => d.vax === 'pcv20' || d.vax === 'pcv21');
      const brandName = whichHigher.vax === 'pcv20' ? B_PCV20 : B_PCV21;
      pneuItems.push({
        type: 'ok', icon: '\u2705',
        title: `Pneumococcal series complete \u2014 ${whichHigher.vax === 'pcv20' ? 'PCV20 (Prevnar 20)' : 'PCV21 (Capvaxive)'} (${whichHigher.year})`,
        chips: [{ text: '\u2713 Series complete \u2014 no further doses', type: 'ok' }],
        detail: `${brandName} provides broad conjugate coverage. No additional pneumococcal vaccine is recommended.`,
        refs: R('immunize_pneu', 'cdc_adult'),
      });
      if (age >= 50) {
        pneuForecast.push({
          status: 'done',
          label: whichHigher.vax === 'pcv20' ? 'PCV20 (Prevnar 20)' : 'PCV21 (Capvaxive)',
          desc: 'Series complete \u2014 no further doses needed',
          date: `${whichHigher.year}`,
          tags: ['pneu'],
        });
      }
    }
    // PCV15 received
    else if (receivedPCV15 && !receivedPCV20or21) {
      const pcv15Year = lastPCVYear('pcv15');
      const intervalLabel = isImmuno ? '\u22658 weeks' : '\u22651 year';
      const ppsv23Due = pcv15Year + (isImmuno ? 0.17 : 1);

      if (receivedPPSV23 && lastPPSV23 >= ppsv23Due) {
        pneuItems.push({
          type: 'ok', icon: '\u2705',
          title: `Pneumococcal series complete \u2014 Vaxneuvance\u00ae PCV15 (${yrDisplay(pcv15Year)}) + Pneumovax 23\u00ae PPSV23 (${yrDisplay(lastPPSV23)})`,
          detail: `${B_PCV15} followed by ${B_PPSV23} at the correct interval. Series is complete.`,
          refs: R('immunize_pneu', 'ate_pneu_sched', 'cdc_adult'),
        });
        pneuForecast.push({ status: 'done', label: 'Vaxneuvance\u00ae (PCV15)', desc: '', date: `${yrDisplay(pcv15Year)}`, tags: ['pneu'] });
        pneuForecast.push({ status: 'done', label: 'Pneumovax 23\u00ae (PPSV23)', desc: 'Series complete \u2713', date: `${yrDisplay(lastPPSV23)}`, tags: ['pneu'] });
      } else if (receivedPPSV23 && lastPPSV23 < ppsv23Due) {
        pneuItems.push({
          type: 'error', icon: '\u26a0\ufe0f',
          title: 'Timing error: Pneumovax 23\u00ae given too soon after Vaxneuvance\u00ae (PCV15)',
          chips: [
            { text: `PCV15: ${yrDisplay(pcv15Year)}`, type: 'brand' },
            { text: `PPSV23: ${yrDisplay(lastPPSV23)}`, type: 'warn' },
            { text: `Min interval: ${isImmuno ? '\u22658 weeks' : '\u22651 year'}`, type: 'interval' },
            { text: 'Repeat PPSV23 at correct interval', type: 'warn' },
          ],
          detail: `${B_PCV15} was given in ${yrDisplay(pcv15Year)}. ${B_PPSV23} was given in ${yrDisplay(lastPPSV23)}, but the minimum interval is ${intervalLabel}. The PPSV23 dose may need to be repeated at the correct interval. Consult with clinical pharmacist or immunization specialist.`,
          refs: R('immunize_pneu', 'ate_pneu_sched', 'cdc_adult'),
        });
        pneuForecast.push({ status: 'done', label: 'Vaxneuvance\u00ae (PCV15)', desc: '', date: `${yrDisplay(pcv15Year)}`, tags: ['pneu'] });
        pneuForecast.push({ status: 'warn', label: 'Pneumovax 23\u00ae given early \u2014 may need repeat', desc: `Given ${yrDisplay(lastPPSV23)}, minimum interval not met`, date: `${yrDisplay(lastPPSV23)}`, tags: ['pneu'] });
        pneuForecast.push({ status: 'now', label: 'Repeat Pneumovax 23\u00ae or substitute Prevnar 20\u00ae/Capvaxive\u00ae', desc: `Administer ${intervalLabel} after Vaxneuvance\u00ae`, date: 'Plan date \u2193', tags: ['pneu'], intervalDays: 0 });
      } else {
        // PPSV23 not yet given
        const dueYear = pcv15Year + (isImmuno ? 0.17 : 1);
        const isDue = currentYear >= Math.floor(dueYear);
        pneuItems.push({
          type: isDue ? 'due' : 'warn', icon: isDue ? '\ud83d\udc89' : '\u23f3',
          title: 'Vaxneuvance\u00ae (PCV15) received \u2014 Pneumovax 23\u00ae (PPSV23) pending',
          chips: [
            { text: `Given ${yrDisplay(pcv15Year)}`, type: 'brand' },
            { text: `Min interval: ${isImmuno ? '\u22658 weeks' : '\u22651 year'}`, type: 'interval' },
            { text: 'Series incomplete', type: 'warn' },
          ],
          detail: `Series is INCOMPLETE. ${B_PPSV23} is due ${intervalLabel} after ${B_PCV15}. ${isDue ? 'This dose is overdue \u2014 give now.' : `Earliest eligible date: ${Math.ceil(dueYear)}.`} If Pneumovax 23\u00ae is unavailable, substitute ${B_PCV20} or ${B_PCV21}. Do not repeat the PCV15 dose.`,
          refs: R('immunize_pneu', 'ate_pneu_sched', 'cdc_adult'),
        });
        pneuForecast.push({ status: 'done', label: 'Vaxneuvance\u00ae (PCV15)', desc: '', date: `${yrDisplay(pcv15Year)}`, tags: ['pneu'] });
        pneuForecast.push({
          status: isDue ? 'now' : 'soon',
          products: ['Pneumovax 23\u00ae (PPSV23)', 'Prevnar 20\u00ae (PCV20)', 'Capvaxive\u00ae (PCV21)'],
          label: 'Pneumovax 23\u00ae (PPSV23)',
          desc: isDue ? 'Overdue \u2014 give now, do not repeat PCV15' : `Min ${intervalLabel} after Vaxneuvance\u00ae. If unavailable: Prevnar 20\u00ae or Capvaxive\u00ae`,
          date: 'Plan date \u2193', tags: ['pneu'], intervalDays: isImmuno ? 56 : 365,
        });
      }
    }
    // PCV13 received only
    else if (receivedPCV13 && !receivedPCV20or21 && !receivedPCV15) {
      const pcv13Year = lastPCVYear('pcv13');
      if (isImmuno) {
        if (receivedPPSV23) {
          const fiveYrsAfterLast = (lastPneuYear() || pcv13Year) + 5;
          const due = currentYear >= fiveYrsAfterLast;
          pneuItems.push({
            type: due ? 'due' : 'warn', icon: due ? '\ud83d\udc89' : '\u23f3',
            title: 'PCV13 + PPSV23 on record \u2014 Prevnar 20\u00ae or Capvaxive\u00ae recommended',
            chips: [
              { text: 'Prevnar 20\u00ae or Capvaxive\u00ae', type: 'brand' },
              { text: '\u22655 yrs after last pneumococcal vaccine', type: 'interval' },
            ],
            detail: `Patient has immunocompromising condition with PCV13 and PPSV23 history. Give 1 dose ${B_PCV20_21} \u22655 years after last pneumococcal vaccine (last was ${lastPneuYear()}; due \u2265${fiveYrsAfterLast}).`,
            refs: R('immunize_pneu', 'ate_pneu_pcv13', 'cdc_adult'),
          });
          pneuForecast.push({ status: 'done', label: 'Prevnar 13\u00ae (PCV13)', desc: '', date: `${yrDisplay(pcv13Year)}`, tags: ['pneu'] });
          pneuForecast.push({ status: 'done', label: 'Pneumovax 23\u00ae (PPSV23)', desc: '', date: `${yrDisplay(lastPPSV23)}`, tags: ['pneu'] });
          pneuForecast.push({ status: due ? 'now' : 'soon', products: ['Prevnar 20\u00ae (PCV20)', 'Capvaxive\u00ae (PCV21)'], label: 'Prevnar 20\u00ae (PCV20) or Capvaxive\u00ae (PCV21)', desc: '\u22655 yrs after last pneumococcal vaccine \u2192 series complete', date: 'Plan date \u2193', tags: ['pneu'], intervalDays: 0 });
        } else {
          const dueYear = pcv13Year + 1;
          pneuItems.push({
            type: 'due', icon: '\ud83d\udc89',
            title: 'Prevnar 13\u00ae only \u2014 Prevnar 20\u00ae or Capvaxive\u00ae is due',
            chips: [
              { text: 'Prevnar 20\u00ae or Capvaxive\u00ae', type: 'brand' },
              { text: '\u22651 yr after PCV13', type: 'interval' },
            ],
            detail: `Administer 1 dose ${B_PCV20_21} \u22651 year after Prevnar 13\u00ae (PCV13) (${yrDisplay(pcv13Year)}). This replaces the need for separate ${B_PPSV23}. Note: PPSV23 is no longer recommended after PCV13 (Oct 2024 update).`,
            refs: R('immunize_pneu', 'ate_pneu_pcv13', 'cdc_adult'),
          });
          pneuForecast.push({ status: 'done', label: 'Prevnar 13\u00ae (PCV13)', desc: '', date: `${yrDisplay(pcv13Year)}`, tags: ['pneu'] });
          pneuForecast.push({ status: currentYear >= dueYear ? 'now' : 'soon', products: ['Prevnar 20\u00ae (PCV20)', 'Capvaxive\u00ae (PCV21)'], label: 'Prevnar 20\u00ae (PCV20) or Capvaxive\u00ae (PCV21)', desc: 'Min \u22651 yr after Prevnar 13\u00ae \u2192 series complete', date: 'Plan date \u2193', tags: ['pneu'], intervalDays: 0 });
        }
      } else {
        const dueYear = pcv13Year + 1;
        pneuItems.push({
          type: 'due', icon: '\ud83d\udc89',
          title: 'Prevnar 13\u00ae only \u2014 Prevnar 20\u00ae or Capvaxive\u00ae now needed',
          chips: [
            { text: 'Prevnar 20\u00ae or Capvaxive\u00ae', type: 'brand' },
            { text: '\u22651 yr after PCV13', type: 'interval' },
          ],
          detail: `Give 1 dose ${B_PCV20_21} \u22651 year after Prevnar 13\u00ae (PCV13) (${yrDisplay(pcv13Year)}). Series will then be complete \u2014 no ${B_PPSV23} needed.`,
          refs: R('immunize_pneu', 'ate_pneu_pcv13', 'cdc_adult', 'mmwr_50plus'),
        });
        pneuForecast.push({ status: 'done', label: 'Prevnar 13\u00ae (PCV13)', desc: '', date: `${yrDisplay(pcv13Year)}`, tags: ['pneu'] });
        pneuForecast.push({ status: currentYear >= dueYear ? 'now' : 'soon', products: ['Prevnar 20\u00ae (PCV20)', 'Capvaxive\u00ae (PCV21)'], label: 'Prevnar 20\u00ae (PCV20) or Capvaxive\u00ae (PCV21)', desc: 'Min \u22651 yr after Prevnar 13\u00ae \u2192 series complete', date: 'Plan date \u2193', tags: ['pneu'], intervalDays: 0 });
      }
    }
    // PPSV23 only
    else if (receivedPPSV23 && !hasPCVAny('pcv13', 'pcv15', 'pcv20', 'pcv21', 'pcv7')) {
      const dueYear = lastPPSV23 + 1;
      pneuItems.push({
        type: 'due', icon: '\ud83d\udc89',
        title: 'Pneumovax 23\u00ae only \u2014 conjugate PCV still needed',
        chips: [
          { text: `Given ${yrDisplay(lastPPSV23)}`, type: 'brand' },
          { text: 'PCV conjugate still needed', type: 'interval' },
          { text: '\u22651 yr since PPSV23', type: 'interval' },
        ],
        detail: `Give 1 dose ${B_PCV15_20_21} \u22651 year after ${B_PPSV23}. If Prevnar 20\u00ae (PCV20) or Capvaxive\u00ae (PCV21) is given, the series is complete. If Vaxneuvance\u00ae (PCV15) is given, no additional Pneumovax 23\u00ae is needed.`,
        refs: R('immunize_pneu', 'cdc_adult'),
      });
      pneuForecast.push({ status: 'done', label: 'Pneumovax 23\u00ae (PPSV23)', desc: '', date: `${yrDisplay(lastPPSV23)}`, tags: ['pneu'] });
      pneuForecast.push({ status: currentYear >= dueYear ? 'now' : 'soon', products: ['Prevnar 20\u00ae (PCV20)', 'Capvaxive\u00ae (PCV21)', 'Vaxneuvance\u00ae (PCV15)'], label: 'Select conjugate vaccine', desc: 'Choose product \u2014 if Vaxneuvance\u00ae selected, no additional PPSV23 needed (already received). If Prevnar 20\u00ae or Capvaxive\u00ae: series complete.', date: 'Plan date \u2193', tags: ['pneu'], intervalDays: 0, smartPneuAfterPPSV23: true });
    }
    // PCV7 only
    else if (receivedPCV7only) {
      pneuItems.push({
        type: 'due', icon: '\ud83d\udc89',
        title: 'Prevnar\u00ae (PCV7) only \u2014 treat as unvaccinated',
        chips: [
          { text: 'PCV7 does not count toward current series', type: 'warn' },
          { text: 'Give Prevnar 20\u00ae or Capvaxive\u00ae today', type: 'brand' },
        ],
        detail: `Prevnar\u00ae (PCV7) is no longer recommended and does not count toward the current series. Administer 1 dose ${B_PCV15_20_21} today.`,
        refs: R('immunize_pneu', 'cdc_adult'),
      });
      pneuForecast.push({ status: 'now', products: ['Prevnar 20\u00ae (PCV20)', 'Capvaxive\u00ae (PCV21)', 'Vaxneuvance\u00ae (PCV15)'], label: 'Select vaccine to initiate series', desc: 'Choose product \u2014 schedule will update based on your selection', date: 'Plan date \u2193', tags: ['pneu'], intervalDays: 0, smartPneuDose1: true });
      pneuForecast.push({ status: 'future', products: ['Pneumovax 23\u00ae (PPSV23)'], label: 'Pneumovax 23\u00ae (PPSV23)', desc: '\u22651 year after Vaxneuvance\u00ae \u2014 required to complete PCV15 series', date: '', tags: ['pneu'], intervalDays: isImmuno ? 56 : 365, intervalFrom: 0, smartPneuDose2: true });
    }
    // Unknown PCV
    else if (hasPCV('unknown_pcv') && !receivedPCV20or21) {
      pneuItems.push({
        type: 'warn', icon: '\u2753',
        title: 'Prior PCV brand unknown \u2014 obtain records',
        chips: [{ text: '\u2753 Cannot confirm series completion', type: 'warn' }],
        detail: `If the PCV given was Prevnar 20\u00ae (PCV20) or Capvaxive\u00ae (PCV21), the series is complete. If Vaxneuvance\u00ae (PCV15), ${B_PPSV23} follow-up is needed. If Prevnar 13\u00ae (PCV13) or Prevnar\u00ae (PCV7), 1 dose ${B_PCV20_21} is needed \u22651 year later. Recommend obtaining records or treating as unvaccinated.`,
        refs: R('immunize_pneu', 'cdc_adult'),
      });
    }
    // Never vaccinated
    else if (pneu.length === 0) {
      pneuItems.push({
        type: 'due', icon: '\ud83d\udc89',
        title: 'No prior pneumococcal vaccines \u2014 initiate series',
        chips: [
          { text: 'Vaxneuvance\u00ae PCV15', type: 'brand' },
          { text: 'Prevnar 20\u00ae PCV20', type: 'brand' },
          { text: 'Capvaxive\u00ae PCV21', type: 'brand' },
        ],
        detail: `Give 1 dose ${B_PCV15_20_21}. If Vaxneuvance\u00ae (PCV15): follow with ${B_PPSV23} \u22651 year later (\u22658 weeks if immunocompromising). If Prevnar 20\u00ae (PCV20) or Capvaxive\u00ae (PCV21): series complete.`,
        refs: R('immunize_pneu', 'ate_pneu', 'ate_pneu_sched', 'cdc_adult', 'mmwr_50plus'),
      });
      pneuForecast.push({ status: 'now', products: ['Prevnar 20\u00ae (PCV20)', 'Capvaxive\u00ae (PCV21)', 'Vaxneuvance\u00ae (PCV15)'], label: 'Select vaccine to initiate series', desc: 'Choose product \u2014 schedule will update based on your selection', date: 'Plan date \u2193', tags: ['pneu'], intervalDays: 0, smartPneuDose1: true });
      pneuForecast.push({ status: 'future', products: ['Pneumovax 23\u00ae (PPSV23)'], label: 'Pneumovax 23\u00ae (PPSV23)', desc: '\u22651 year after Vaxneuvance\u00ae \u2014 required to complete PCV15 series', date: '', tags: ['pneu'], intervalDays: isImmuno ? 56 : 365, intervalFrom: 0, smartPneuDose2: true });
    }

    // Geographic note
    pneuItems.push({
      type: 'info', icon: '\ud83d\uddfa\ufe0f',
      title: 'Western US: prefer Prevnar 20\u00ae (PCV20) \u2014 serotype 4 not in Capvaxive\u00ae (PCV21)',
      detail: `In Alaska, Colorado, New Mexico, Oregon, and Navajo Nation: serotype 4 causes \u226530% of invasive pneumococcal disease. ${B_PCV21} does NOT cover serotype 4. Prefer ${B_PCV20} in these regions.`,
      refs: R('cdc_risk', 'immunize_pneu'),
    });

    // Catch-up rule
    const hasIncompletePneu = pneuItems.some(i => i.type === 'due' || i.type === 'warn');
    if (hasIncompletePneu) {
      pneuItems.push({
        type: 'info', icon: '\ud83d\udccb',
        title: 'Catch-up rule: never restart a series for late doses',
        chips: [{ text: 'Pick up where you left off', type: 'ok' }],
        detail: 'Per CDC: do NOT restart or add extra doses to a vaccine series if there are extended intervals between doses. If a dose is late \u2014 even months or years overdue \u2014 simply administer the next dose in the series as soon as possible. The only exception is MenB with an unknown brand (restart required) or post-HSCT (full re-vaccination required).',
        refs: R('cdc_adult', 'immunize_pneu'),
      });
    }

    // Immunosuppression timing
    if (risks.has('immunosuppressed') || risks.has('transplant') || risks.has('malignancy')) {
      pneuItems.push({
        type: 'warn', icon: '\u23f0',
        title: 'Immunosuppression timing: give vaccines \u22652 weeks before therapy',
        chips: [{ text: '\u26d4 Not during active chemo/radiation', type: 'warn' }],
        detail: `Administer pneumococcal vaccines (${B_PCV15_20_21}) \u22652 weeks BEFORE starting chemotherapy, radiation, or transplant conditioning. Do NOT give during active chemotherapy or radiation. After completing therapy, wait \u22653 months for immune recovery (non-transplant patients).`,
        refs: R('mmwr_pneu23', 'cdc_adult'),
      });
    }
  }

  // ══════════════════════════════════════
  // MENINGOCOCCAL ANALYSIS
  // ══════════════════════════════════════
  const menItems = [];
  const menForecast = [];

  const menACWYMedicalRisk = risks.has('hiv') || risks.has('asplenia') || risks.has('complement') || risks.has('complement_inhibitor');
  const menACWYExposureRisk = risks.has('travel') || risks.has('microbiologist') || risks.has('military');
  const menACWYCollege = risks.has('college');
  const menACWYIndicated = menACWYMedicalRisk || menACWYExposureRisk || menACWYCollege || (age >= 11 && age <= 21);
  const nMenACWY = countMenACWY();
  const lastACWY = lastMenACWYYear();

  if (menACWYIndicated || hasMenACWY()) {
    if (menACWYMedicalRisk) {
      if (nMenACWY === 0) {
        menItems.push({
          _cat: 'acwy', type: 'due', icon: '\ud83d\udc89',
          title: 'MenACWY: 2-dose primary series needed (high-risk)',
          chips: [
            { text: 'Menveo\u00ae or MenQuadfi\u00ae', type: 'brand' },
            { text: '2 doses \u22658 wks apart', type: 'interval' },
            { text: 'Booster q5yr', type: 'interval' },
          ],
          detail: `High-risk condition (asplenia, HIV, complement deficiency/inhibitor) requires a 2-dose ${B_MenACWY} primary series \u22658 weeks apart, then booster every 5 years while risk remains.`,
          refs: R('immunize_menc', 'ate_menc_risk', 'mmwr_men20', 'cdc_adult'),
        });
        menForecast.push({ status: 'now', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Dose 1 \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: 'Either brand; interchangeable', date: 'Plan date \u2193', tags: ['menc'], intervalDays: 0 });
        menForecast.push({ status: 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Dose 2 \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: '\u22658 weeks after Dose 1 \u2014 primary series complete', date: '', tags: ['menc'], intervalDays: 56, intervalFrom: 0 });
        menForecast.push({ status: 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Booster \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: 'Every 5 years while high-risk condition persists', date: '', tags: ['menc'], intervalDays: 1825, intervalFrom: 1 });
      } else if (nMenACWY === 1) {
        const firstACWYDose = mening.filter(d => isMenuACWY(d.vax)).sort((a, b) => a.year - b.year)[0];
        const firstACWY = firstACWYDose.year;
        const firstBrand = brandedMenACWY(firstACWYDose.vax);
        const dose2Due = firstACWY + 0.17;
        menItems.push({
          _cat: 'acwy',
          type: currentYear >= Math.floor(dose2Due) ? 'due' : 'soon', icon: '\ud83d\udc89',
          title: `MenACWY: 1 dose received (${yrDisplay(firstACWY)}) \u2014 Dose 2 needed`,
          chips: [
            { text: `Dose 1: ${yrDisplay(firstACWY)}`, type: 'brand' },
            { text: 'Dose 2 \u22658 wks after Dose 1', type: 'interval' },
          ],
          detail: `Medical high-risk patients require a 2-dose primary series. Dose 2 (${B_MenACWY}) is due \u22658 weeks after Dose 1. ${currentYear >= Math.floor(dose2Due) ? 'This dose is overdue \u2014 give now. Do not restart the series.' : 'Administer as soon as possible.'} After completing the 2-dose primary, booster every 5 years.`,
          refs: R('immunize_menc', 'mmwr_men20'),
        });
        menForecast.push({ status: 'done', label: `MenACWY Dose 1 \u2014 ${firstBrand.replace(/<[^>]+>/g, '')}`, desc: '', date: `${yrDisplay(firstACWY)}`, tags: ['menc'] });
        menForecast.push({ status: 'now', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Dose 2 \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: currentYear >= Math.floor(dose2Due) ? 'Overdue \u2014 give now, no restart needed' : '\u22658 weeks after Dose 1', date: 'Plan date \u2193', tags: ['menc'], intervalDays: 0 });
        menForecast.push({ status: 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Booster \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: 'Every 5 years while high-risk condition persists', date: '', tags: ['menc'], intervalDays: 1825, intervalFrom: 1 });
      } else {
        const boosterDue = lastACWY + 5;
        const isDue = currentYear >= boosterDue;
        menItems.push({
          _cat: 'acwy',
          type: isDue ? 'due' : 'ok', icon: isDue ? '\ud83d\udc89' : '\u2705',
          title: isDue ? `MenACWY booster overdue (last: ${yrDisplay(lastACWY)})` : `MenACWY primary complete \u2014 booster due ${boosterDue}`,
          chips: [
            { text: 'Menveo\u00ae or MenQuadfi\u00ae', type: 'brand' },
            { text: isDue ? 'Overdue \u2014 give now' : 'q5 years', type: isDue ? 'warn' : 'interval' },
          ],
          detail: `High-risk patients need ${B_MenACWY} boosters every 5 years while risk persists. Last dose: ${yrDisplay(lastACWY)}. ${isDue ? 'Booster is overdue \u2014 give now. Do not restart the primary series.' : ''}`,
          refs: R('immunize_menc', 'mmwr_men20', 'cdc_adult'),
        });
        menForecast.push({ status: 'done', label: 'MenACWY primary series', desc: `${nMenACWY} doses`, date: `${yrDisplay(lastACWY)}`, tags: ['menc'] });
        menForecast.push({ status: isDue ? 'now' : 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Booster \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: isDue ? 'Overdue \u2014 give now, no restart needed' : 'Due every 5 yrs while high-risk', date: 'Plan date \u2193', tags: ['menc'], intervalDays: 0 });
        menForecast.push({ status: 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Next Booster \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: 'Every 5 years thereafter', date: '', tags: ['menc'], intervalDays: 1825, intervalFrom: 3 });
      }

      if (risks.has('hiv')) {
        menItems.push({
          _cat: 'acwy', type: 'info', icon: '\u2139\ufe0f',
          title: 'HIV: 2-dose MenACWY primary at any age',
          chips: [
            { text: 'Menveo\u00ae or MenQuadfi\u00ae', type: 'brand' },
            { text: '\u22658 wks apart + q5yr booster', type: 'interval' },
          ],
          detail: `Unlike the standard adolescent schedule, HIV patients always receive a 2-dose ${B_MenACWY} primary series (\u22658 weeks apart), then booster every 5 years. This applies to adults of all ages.`,
          refs: R('mmwr_men20', 'cdc_adult'),
        });
      }
    } else if (menACWYExposureRisk || menACWYCollege || risks.has('military')) {
      if (!hasMenACWY()) {
        const indication = risks.has('military')
          ? `Military recruits require 1 dose ${B_MenACWY} regardless of prior history.`
          : menACWYCollege
            ? `First-year college students in residential housing need 1 dose ${B_MenACWY} if unvaccinated or last dose >5 years ago.`
            : risks.has('travel')
              ? `Travel to meningococcal-endemic regions (meningitis belt, Hajj/Umrah) requires 1 dose ${B_MenACWY}.`
              : `Microbiologists with routine N. meningitidis exposure require 1 dose ${B_MenACWY} + booster every 5 years.`;
        menItems.push({
          _cat: 'acwy', type: 'due', icon: '\ud83d\udc89',
          title: 'MenACWY: 1 dose needed',
          chips: [{ text: 'Menveo\u00ae or MenQuadfi\u00ae', type: 'brand' }],
          detail: indication,
          refs: R('immunize_menc', 'ate_menc', 'cdc_adult'),
        });
        menForecast.push({ status: 'now', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Dose 1 \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: risks.has('microbiologist') ? 'Booster every 5 yrs' : 'No booster unless ongoing risk', date: 'Plan date \u2193', tags: ['menc'], intervalDays: 0 });
        if (risks.has('microbiologist')) {
          menForecast.push({ status: 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Booster \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: 'Every 5 years while occupational exposure continues', date: '', tags: ['menc'], intervalDays: 1825, intervalFrom: 0 });
        }
      } else {
        const boosterDue = lastACWY + 5;
        const isDue = currentYear >= boosterDue;
        const isMilitary = risks.has('military');
        const detail = isMilitary
          ? `Military recruits require ${B_MenACWY} regardless of prior history \u2014 if the existing dose was not given in a military context, another dose may be required per military policy.`
          : `Last dose: ${yrDisplay(lastACWY)}. ${isDue ? `Booster is overdue \u2014 give now. Do not restart the primary series. Administer ${B_MenACWY}.` : `Booster due ~${boosterDue} if ongoing risk remains.`}`;
        menItems.push({
          _cat: 'acwy',
          type: isDue ? 'due' : 'ok', icon: isDue ? '\ud83d\udc89' : '\u2705',
          title: isDue ? `MenACWY booster due (last: ${yrDisplay(lastACWY)})` : `MenACWY up to date (${yrDisplay(lastACWY)})`,
          chips: [
            { text: 'Menveo\u00ae or MenQuadfi\u00ae', type: 'brand' },
            { text: isDue ? 'Booster due now' : 'Up to date \u2713', type: isDue ? 'warn' : 'ok' },
          ],
          detail,
          refs: R('immunize_menc', 'cdc_adult'),
        });
        if (!isDue) menForecast.push({ status: 'done', label: 'MenACWY \u2014 up to date', desc: '', date: `${yrDisplay(lastACWY)}`, tags: ['menc'] });
        if (isDue || risks.has('microbiologist')) menForecast.push({ status: isDue ? 'now' : 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Booster \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: 'Every 5 years for ongoing exposure risk', date: 'Plan date \u2193', tags: ['menc'], intervalDays: 0 });
      }
    } else if (age >= 11 && age <= 21) {
      if (!hasMenACWY()) {
        const noBoosterNeeded = age >= 16;
        menItems.push({
          _cat: 'acwy', type: 'due', icon: '\ud83d\udc89',
          title: `MenACWY: routine dose needed${noBoosterNeeded ? ' \u2014 no booster required' : ''}`,
          chips: [
            { text: 'Menveo\u00ae or MenQuadfi\u00ae', type: 'brand' },
            { text: noBoosterNeeded ? '1 dose only (age \u226516)' : 'Booster at age 16\u201318', type: 'interval' },
          ],
          detail: noBoosterNeeded
            ? `Administer 1 dose ${B_MenACWY}. Initial dose at age \u226516 \u2192 no booster recommended.`
            : `Administer 1 dose ${B_MenACWY} now; booster at age 16\u201318.`,
          refs: R('immunize_menc', 'cdc_adult'),
        });
        menForecast.push({ status: 'now', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Dose 1 \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: noBoosterNeeded ? 'No booster needed \u2014 initial dose at \u226516 yrs' : 'Booster due at age 16\u201318', date: 'Plan date \u2193', tags: ['menc'], intervalDays: 0 });
        if (!noBoosterNeeded) menForecast.push({ status: 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Booster \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: 'At age 16\u201318', date: '', tags: ['menc'], intervalDays: 1095, intervalFrom: 0 });
      } else {
        const firstACWY = Math.min(...mening.filter(d => isMenuACWY(d.vax)).map(d => d.year));
        const firstACWYAge = age - (currentYear - firstACWY);
        const needsBooster = firstACWYAge < 16 && age < 21;
        if (needsBooster && nMenACWY < 2) {
          menItems.push({
            _cat: 'acwy', type: 'due', icon: '\ud83d\udc89',
            title: `MenACWY booster needed \u2014 Dose 1 given at age ~${firstACWYAge}`,
            chips: [
              { text: 'Menveo\u00ae or MenQuadfi\u00ae', type: 'brand' },
              { text: 'Give at age 16\u201318', type: 'interval' },
            ],
            detail: `Dose 1 was given before age 16. A booster of ${B_MenACWY} is needed at age 16\u201318.`,
            refs: R('immunize_menc', 'cdc_adult'),
          });
          menForecast.push({ status: 'done', label: 'MenACWY Dose 1', desc: '', date: `${yrDisplay(firstACWY)}`, tags: ['menc'] });
          menForecast.push({ status: 'now', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Booster (Dose 2) \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: 'At age 16\u201318', date: 'Plan date \u2193', tags: ['menc'], intervalDays: 0 });
        } else {
          menItems.push({
            _cat: 'acwy', type: 'ok', icon: '\u2705',
            title: `MenACWY up to date (${yrDisplay(lastACWY)})`,
            chips: [{ text: '\u2713 No further doses', type: 'ok' }],
            detail: 'No further routine MenACWY recommended at this time.',
            refs: R('immunize_menc', 'cdc_adult'),
          });
          menForecast.push({ status: 'done', label: 'MenACWY \u2014 up to date', desc: '', date: `${yrDisplay(lastACWY)}`, tags: ['menc'] });
        }
      }
    } else if (hasMenACWY()) {
      menItems.push({
        _cat: 'acwy', type: 'ok', icon: '\u2705',
        title: `MenACWY on record (${yrDisplay(lastACWY)}) \u2014 no booster needed`,
        detail: 'No qualifying risk condition or routine indication for booster at this time.',
        refs: R('immunize_menc', 'cdc_adult'),
      });
    }
  } else {
    menItems.push({
      _cat: 'acwy', type: 'info', icon: '\u2139\ufe0f',
      title: 'MenACWY: not currently indicated',
      detail: `Routine MenACWY (${B_MenACWY}) is recommended for adolescents (11\u201318) and specific high-risk adults. No qualifying indication selected. If traveling to endemic region or outbreak exposure occurs, MenACWY would be indicated.`,
      refs: R('immunize_menc', 'cdc_adult'),
    });
  }

  // ── MenB ──
  const menBMedicalRisk = risks.has('asplenia') || risks.has('complement') || risks.has('complement_inhibitor') || risks.has('microbiologist');
  const menBSCDM = age >= 16 && age <= 23 && !menBMedicalRisk;
  const nMenB = countMenB();
  const lastMenB = lastMenBYear();
  const brand = menBBrandFn();
  const mixedBrand = hasMixedMenB();
  const brandedB = brandedMenB(brand);

  if (mixedBrand) {
    menItems.push({
      _cat: 'menb', type: 'error', icon: '\ud83d\udeab',
      title: 'MenB brand mixing error \u2014 series must be restarted',
      chips: [
        { text: 'Bexsero\u00ae \u2260 Trumenba\u00ae', type: 'warn' },
        { text: 'Mixed brands detected', type: 'warn' },
        { text: 'Restart with one brand', type: 'interval' },
      ],
      detail: 'Bexsero\u00ae (MenB-4C) and Trumenba\u00ae (MenB-FHbp) are NOT interchangeable. Mixed brands detected in vaccine history. The MenB series must be restarted using a single product. Choose either Bexsero\u00ae or Trumenba\u00ae and administer the full required series with that brand only.',
      refs: R('immunize_menb', 'cdc_menrecs', 'mmwr_men20'),
    });
  }

  if (menBMedicalRisk) {
    if (nMenB === 0) {
      menItems.push({
        _cat: 'menb', type: 'due', icon: '\ud83d\udc89',
        title: 'MenB: 3-dose high-risk series needed',
        chips: [
          { text: 'Bexsero\u00ae or Trumenba\u00ae', type: 'brand' },
          { text: 'DO NOT mix brands', type: 'warn' },
        ],
        detail: `High-risk conditions (asplenia, complement deficiency/inhibitor, microbiologist) require a 3-dose ${B_MenB_either} primary series: Dose 1 now, Dose 2 at 1\u20132 months, Dose 3 at 6 months from Dose 1. Choose one brand and do NOT switch between doses.`,
        refs: R('immunize_menb', 'cdc_menrecs', 'acip_menb'),
      });
      menForecast.push({ status: 'now', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Dose 1 \u2014 Bexsero\u00ae OR Trumenba\u00ae (choose one)', desc: 'Choose one brand \u2014 all subsequent doses will auto-lock to this brand', date: 'Plan date \u2193', tags: ['menb'], intervalDays: 0, smartMenBDose1: true });
      menForecast.push({ status: 'future', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Dose 2 \u2014 same brand', desc: '1\u20132 months after Dose 1', date: '', tags: ['menb'], intervalDays: 42, intervalFrom: 0 });
      menForecast.push({ status: 'future', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Dose 3 \u2014 same brand', desc: '6 months after Dose 1 \u2014 primary series complete', date: '', tags: ['menb'], intervalDays: 180, intervalFrom: 0 });
      menForecast.push({ status: 'future', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Booster \u2014 same brand', desc: '\u22651 year after Dose 3', date: '', tags: ['menb'], intervalDays: 365, intervalFrom: 2 });
      menForecast.push({ status: 'future', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Subsequent Boosters', desc: 'Every 2\u20133 years while high-risk', date: '', tags: ['menb'], intervalDays: 912, intervalFrom: 3 });
    } else if (nMenB === 1) {
      const d1Dose = mening.filter(d => isMenB(d.vax)).sort((a, b) => a.year - b.year)[0];
      const d1Year = d1Dose.year;
      menItems.push({
        _cat: 'menb', type: 'due', icon: '\ud83d\udc89',
        title: 'MenB: Doses 2 and 3 still needed',
        chips: [
          { text: brand ? brand + '\u00ae \u2014 same brand required' : 'Confirm brand first', type: brand ? 'brand' : 'warn' },
          { text: 'Dose 2 at 1\u20132 mo, Dose 3 at 6 mo', type: 'interval' },
        ],
        detail: `High-risk 3-dose primary series is incomplete. Give the next dose now \u2014 do not restart the series for a late dose. ${brand ? `Continue with ${brand}\u00ae.` : 'Brand unknown: confirm from records; if truly unknown, restart with either Bexsero\u00ae or Trumenba\u00ae.'} Dose 3 is due 6 months after Dose 1 regardless of when Dose 2 was given.`,
        refs: R('immunize_menb', 'cdc_menrecs'),
      });
      menForecast.push({ status: 'done', label: `MenB Dose 1 \u2014 ${brand ? brand + '\u00ae' : 'brand unknown'}`, desc: '', date: `${yrDisplay(d1Year)}`, tags: ['menb'] });
      menForecast.push({ status: 'now', products: brand ? [brand + '\u00ae (' + (brand === 'Bexsero' ? 'MenB-4C' : 'MenB-FHbp') + ')'] : ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: `MenB Dose 2 \u2014 ${brand ? brand + '\u00ae (same brand)' : 'select brand'}`, desc: brand ? 'Continue with same brand as Dose 1' : 'Choose same brand as Dose 1 \u2014 all subsequent doses will auto-lock', date: 'Plan date \u2193', tags: ['menb'], intervalDays: 0, smartMenBDose1: !brand });
      menForecast.push({ status: 'future', products: brand ? [brand + '\u00ae (' + (brand === 'Bexsero' ? 'MenB-4C' : 'MenB-FHbp') + ')'] : ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: `MenB Dose 3 \u2014 ${brand ? brand + '\u00ae (same brand)' : 'same brand as Dose 1'}`, desc: '6 months after Dose 1 \u2014 primary series complete', date: '', tags: ['menb'], intervalDays: 180, intervalFrom: 1 });
      menForecast.push({ status: 'future', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Booster \u2014 same brand', desc: '\u22651 year after Dose 3, then every 2\u20133 yrs', date: '', tags: ['menb'], intervalDays: 365, intervalFrom: 2 });
    } else if (nMenB === 2) {
      const doses = mening.filter(d => isMenB(d.vax)).sort((a, b) => a.year - b.year);
      const d1Year = doses[0].year;
      const d2Year = doses[1].year;
      const gap = d2Year - d1Year;
      if (gap >= 0.4) {
        menItems.push({
          _cat: 'menb', type: 'ok', icon: '\u2705',
          title: 'MenB primary series complete (2 doses \u22656 months apart)',
          chips: [
            { text: brand ? brand + '\u00ae' : 'Brand on record', type: 'brand' },
            { text: '\u2713 Booster \u22651 yr', type: 'ok' },
          ],
          detail: `When Dose 2 is given \u22656 months after Dose 1 in the 3-dose schedule, it serves as the final primary dose. Series is complete with ${brand ? brand + '\u00ae' : 'documented brand'}. Booster due \u22651 year after last dose, then every 2\u20133 years (use same brand).`,
          refs: R('immunize_menb', 'cdc_menrecs'),
        });
        const boosterDue = d2Year + 1;
        menForecast.push({ status: 'done', label: `MenB Primary Series \u2014 ${brand ? brand + '\u00ae' : 'brand on record'}`, desc: 'Complete (Dose 2 \u22656 months after Dose 1)', date: `${yrDisplay(d2Year)}`, tags: ['menb'] });
        menForecast.push({ status: currentYear >= boosterDue ? 'now' : 'future', products: brand ? [brand + '\u00ae (' + (brand === 'Bexsero' ? 'MenB-4C' : 'MenB-FHbp') + ')'] : ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: `MenB Booster \u2014 ${brand ? brand + '\u00ae' : 'same brand'}`, desc: '\u22651 year after primary series, then every 2\u20133 yrs', date: 'Plan date \u2193', tags: ['menb'], intervalDays: 0 });
      } else {
        menItems.push({
          _cat: 'menb', type: 'due', icon: '\ud83d\udc89',
          title: 'MenB: Dose 3 still needed',
          chips: [
            { text: brand ? brand + '\u00ae \u2014 same brand required' : 'Confirm brand first', type: brand ? 'brand' : 'warn' },
            { text: 'Dose 3 at 6 mo from Dose 1', type: 'interval' },
          ],
          detail: `Dose 3 is due 6 months after Dose 1 (${yrDisplay(d1Year)}). ${currentYear > d1Year + 1 ? 'This dose is overdue \u2014 give now. Do not restart the series.' : `Earliest eligible date: \u2265${d1Year + 1}.`} ${brand ? `Continue with ${brand}\u00ae.` : 'Confirm brand before administering.'}`,
          refs: R('immunize_menb', 'cdc_menrecs'),
        });
        menForecast.push({ status: 'done', label: `MenB Doses 1\u20132 \u2014 ${brand ? brand + '\u00ae' : 'brand on record'}`, desc: '', date: `${yrDisplay(d1Year)}\u2013${yrDisplay(d2Year)}`, tags: ['menb'] });
        menForecast.push({ status: 'now', products: brand ? [brand + '\u00ae (' + (brand === 'Bexsero' ? 'MenB-4C' : 'MenB-FHbp') + ')'] : ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: `MenB Dose 3 \u2014 ${brand ? brand + '\u00ae (same brand)' : 'select brand'}`, desc: brand ? 'Continue with same brand as prior doses' : 'Choose same brand as prior doses \u2014 booster will auto-lock', date: 'Plan date \u2193', tags: ['menb'], intervalDays: 0, smartMenBDose1: !brand });
        menForecast.push({ status: 'future', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Booster \u2014 same brand', desc: '\u22651 year after Dose 3', date: '', tags: ['menb'], intervalDays: 365, intervalFrom: 2 });
      }
    } else {
      const boosterDue = (lastMenB || currentYear) + 1;
      const isDue = currentYear >= boosterDue;
      menItems.push({
        _cat: 'menb',
        type: isDue ? 'due' : 'ok', icon: isDue ? '\ud83d\udc89' : '\u2705',
        title: isDue ? `MenB booster overdue (last: ${yrDisplay(lastMenB)})` : `MenB series complete \u2014 booster due ${boosterDue}`,
        chips: [
          { text: brand ? brand + '\u00ae' : 'Brand on record', type: 'brand' },
          { text: isDue ? 'Booster overdue' : 'q2\u20133 yrs', type: isDue ? 'warn' : 'interval' },
        ],
        detail: `Last MenB dose: ${yrDisplay(lastMenB)}. ${isDue ? 'Booster is overdue \u2014 give now. ' : ''}${brand ? `Continue with ${brand}\u00ae.` : 'Use same brand as prior doses.'} Boosters every 2\u20133 years while high-risk condition persists.`,
        refs: R('immunize_menb', 'cdc_menrecs'),
      });
      menForecast.push({ status: 'done', label: `MenB Primary Series (${nMenB} doses) \u2014 ${brand ? brand + '\u00ae' : 'brand on record'}`, desc: '', date: `thru ${yrDisplay(lastMenB)}`, tags: ['menb'] });
      menForecast.push({ status: isDue ? 'now' : 'future', products: brand ? [brand + '\u00ae (' + (brand === 'Bexsero' ? 'MenB-4C' : 'MenB-FHbp') + ')'] : ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: `MenB Booster \u2014 ${brand ? brand + '\u00ae' : 'same brand'}`, desc: 'Every 2\u20133 years while high-risk', date: 'Plan date \u2193', tags: ['menb'], intervalDays: 0 });
    }
  } else if (menBSCDM) {
    menItems.push({
      _cat: 'menb', type: 'info', icon: '\ud83d\udde3\ufe0f',
      title: 'MenB (SCDM): ages 16\u201323 \u2014 shared clinical decision-making',
      chips: [
        { text: 'SCDM \u2014 not routine', type: 'interval' },
        { text: 'Bexsero\u00ae or Trumenba\u00ae', type: 'brand' },
        { text: '2 doses \u22656 months apart', type: 'interval' },
        { text: 'No routine booster', type: 'ok' },
      ],
      detail: `MenB for healthy adolescents/young adults 16\u201323 is NOT a routine recommendation \u2014 based on shared clinical decision-making (provider+patient). Preferred age: 16\u201318. If patient elects vaccination: 2-dose series of ${B_MenB_either} \u22656 months apart. Do not mix brands. No routine booster after SCDM series.`,
      refs: R('immunize_menb', 'cdc_menrecs', 'acip_menb'),
    });

    if (nMenB === 0) {
      menForecast.push({ status: 'future', label: 'MenB Dose 1 (if SCDM elected) \u2014 Bexsero\u00ae OR Trumenba\u00ae', desc: 'Choose one brand \u2014 Dose 2 will auto-lock to match', date: 'Plan date \u2193', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], tags: ['menb'], intervalDays: 0, smartMenBDose1: true });
      menForecast.push({ status: 'future', label: 'MenB Dose 2 \u2014 same brand as Dose 1', desc: '\u22656 months after Dose 1 \u2192 series complete', date: '', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], tags: ['menb'], intervalDays: 182, intervalFrom: 0 });
    } else if (nMenB === 1) {
      const d1Year = lastMenB;
      const d2Due = d1Year + 0.5;
      menItems.push({
        _cat: 'menb',
        type: currentYear >= Math.ceil(d2Due) ? 'due' : 'soon', icon: '\ud83d\udc89',
        title: `MenB: Dose 2 needed \u2014 Dose 1 received ${yrDisplay(d1Year)}`,
        chips: [
          { text: brand ? brand + '\u00ae \u2014 same brand required' : 'Confirm brand first', type: brand ? 'brand' : 'warn' },
          { text: '\u22656 months after Dose 1', type: 'interval' },
        ],
        detail: `Dose 2 is due \u22656 months after Dose 1. ${currentYear >= Math.ceil(d2Due) ? 'This dose is overdue \u2014 give now. Do not restart the series.' : `Earliest eligible: ~${Math.ceil(d2Due)}.`} ${brand ? `Use ${brand}\u00ae \u2014 do not switch brands.` : 'Confirm brand from Dose 1 records; if truly unknown, restart series with one brand.'}`,
        refs: R('immunize_menb', 'cdc_menrecs', 'acip_menb'),
      });
      menForecast.push({ status: 'done', label: `MenB Dose 1 \u2014 ${brand ? brand + '\u00ae' : 'brand unknown'}`, desc: '', date: `${yrDisplay(d1Year)}`, tags: ['menb'] });
      menForecast.push({ status: currentYear >= Math.ceil(d2Due) ? 'now' : 'soon', products: brand ? [brand + '\u00ae (' + (brand === 'Bexsero' ? 'MenB-4C' : 'MenB-FHbp') + ')'] : ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: `MenB Dose 2 \u2014 ${brand ? brand + '\u00ae (same brand)' : 'select same brand as Dose 1'}`, desc: currentYear >= Math.ceil(d2Due) ? 'Overdue \u2014 give now, do not restart series' : '\u22656 months after Dose 1 \u2192 series complete', date: 'Plan date \u2193', tags: ['menb'], intervalDays: 0 });
    } else {
      menItems.push({
        _cat: 'menb', type: 'ok', icon: '\u2705',
        title: `MenB SCDM series complete (${nMenB} doses, last ${yrDisplay(lastMenB)})`,
        chips: [
          { text: brand ? brand + '\u00ae' : 'Brand on record', type: 'brand' },
          { text: '\u2713 No routine booster', type: 'ok' },
        ],
        detail: 'No routine booster recommended for healthy individuals after SCDM series. If a high-risk condition develops later, a 3rd dose (same brand) and booster schedule would be needed.',
        refs: R('immunize_menb', 'cdc_menrecs'),
      });
      menForecast.push({ status: 'done', label: `MenB SCDM Series \u2014 ${brand ? brand + '\u00ae' : 'brand on record'}`, desc: 'Complete \u2014 no routine booster', date: `thru ${yrDisplay(lastMenB)}`, tags: ['menb'] });
    }
  } else if (hasMenB()) {
    menItems.push({
      _cat: 'menb', type: 'info', icon: '\u2139\ufe0f',
      title: `MenB on record (${nMenB} dose${nMenB > 1 ? 's' : ''}, last ${yrDisplay(lastMenB)}) \u2014 no further doses indicated`,
      chips: [{ text: brand ? brand + '\u00ae' : 'Brand on record', type: 'brand' }],
      detail: 'Patient age is outside the SCDM window (16\u201323) and no high-risk condition for MenB is selected. If a high-risk condition develops, a booster or completion of primary series (same brand) may be needed.',
      refs: R('immunize_menb', 'cdc_menrecs'),
    });
  } else {
    menItems.push({
      _cat: 'menb', type: 'info', icon: '\u2139\ufe0f',
      title: 'MenB: not currently indicated',
      detail: `MenB (${B_MenB_either}) is indicated for: (1) high-risk conditions (asplenia, complement deficiency/inhibitor, microbiologist), or (2) ages 16\u201323 via shared clinical decision-making. No qualifying indication selected.`,
      refs: R('immunize_menb', 'cdc_menrecs'),
    });
  }

  // MenABCWY combination tracks
  const menACWYNeeded = menACWYMedicalRisk || menACWYExposureRisk || menACWYCollege || (age >= 11 && age <= 21);
  const menBNeeded = menBMedicalRisk || menBSCDM;
  const comboOnLabel = menACWYNeeded && menBNeeded && age >= 10 && age <= 25;
  const comboOffLabel = menACWYNeeded && menBNeeded && (age < 10 || age > 25) && menBMedicalRisk;
  const bothMenDue = comboOnLabel || comboOffLabel;

  let menForecastCombo = [];

  if (bothMenDue) {
    menItems.push({
      _cat: 'menb', type: 'info', icon: '\ud83d\udca1',
      title: comboOffLabel
        ? 'MenABCWY combination \u2014 off-label use permitted for high-risk adults (ACIP-supported)'
        : 'MenABCWY combination option \u2014 may replace 2 injections with 1',
      chips: comboOffLabel
        ? [{ text: 'Penbraya\u2122 (Pfizer)', type: 'brand' }, { text: 'Penmenvy\u2122 (GSK)', type: 'brand' }, { text: 'Off-label: high-risk adults', type: 'interval' }]
        : [{ text: 'Penbraya\u2122 (Pfizer)', type: 'brand' }, { text: 'Penmenvy\u2122 (GSK)', type: 'brand' }, { text: 'Both MenACWY + MenB indicated', type: 'ok' }],
      detail: comboOffLabel
        ? `Both MenACWY and MenB are indicated. Although ${B_MenABCWY} is FDA-approved for ages 10\u201325, ACIP supports off-label use in high-risk adults outside this range. Per immunize.org Ask the Experts (MenB): "*May be given to adults at increased risk older than the FDA-approved upper age limit" (ACIP recommendations, Table 11, MMWR 2020;69(RR-9)). Rules: Use only when BOTH vaccines are due at the same visit. \u22656 months between combo doses. Subsequent MenB doses must match brand: Penbraya\u2122 \u2192 Trumenba\u00ae; Penmenvy\u2122 \u2192 Bexsero\u00ae. Products NOT interchangeable.`
        : `Since both MenACWY and MenB are indicated, ${B_MenABCWY} can be used when both are due at the same visit \u2014 1 injection instead of 2. Rules: Use when both MenACWY + MenB are indicated at same visit. \u22656 months between doses. Subsequent MenB doses must match brand: Penbraya\u2122 \u2192 Trumenba\u00ae; Penmenvy\u2122 \u2192 Bexsero\u00ae. Products NOT interchangeable.`,
      refs: R('cdc_menrecs', 'mmwr_penbraya', 'ate_menb_recs', 'acip_menb_offlabel', 'acip_bestprac'),
    });

    const isHighRiskBoth = menACWYMedicalRisk && menBMedicalRisk;
    const isSCDM = menBSCDM && !menBMedicalRisk;

    if (isHighRiskBoth) {
      menForecastCombo.push({ status: 'now', products: ['Penbraya\u2122 (MenABCWY-Pfizer)', 'Penmenvy\u2122 (MenABCWY-GSK)'], label: 'Dose 1 \u2014 Penbraya\u2122 or Penmenvy\u2122 (MenABCWY)', desc: 'Counts as MenACWY Dose 1 + MenB Dose 1. Choose one product and commit.', date: 'Plan date \u2193', tags: ['menc', 'menb', 'combo'], intervalDays: 0 });
      menForecastCombo.push({ status: 'future', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Dose 2 standalone \u2014 Trumenba\u00ae (if Penbraya\u2122) or Bexsero\u00ae (if Penmenvy\u2122)', desc: '1\u20132 months after Dose 1. Must use matched standalone MenB brand.', date: '', tags: ['menb'], intervalDays: 42, intervalFrom: 0 });
      menForecastCombo.push({ status: 'future', products: ['Penbraya\u2122 (MenABCWY-Pfizer)', 'Penmenvy\u2122 (MenABCWY-GSK)'], label: 'Dose 2 \u2014 Penbraya\u2122 or Penmenvy\u2122 (MenABCWY)', desc: '\u22656 months after Dose 1. Counts as MenACWY Dose 2 + MenB Dose 3 \u2014 completes both primary series.', date: '', tags: ['menc', 'menb', 'combo'], intervalDays: 182, intervalFrom: 0 });
      menForecastCombo.push({ status: 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Booster \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: '\u22655 years after last MenACWY dose while high-risk', date: '', tags: ['menc'], intervalDays: 1825, intervalFrom: 2 });
      menForecastCombo.push({ status: 'future', products: ['Trumenba\u00ae (MenB-FHbp)', 'Bexsero\u00ae (MenB-4C)'], label: 'MenB Booster \u2014 match prior brand', desc: '\u22651 year after MenB primary series complete, then every 2\u20133 years', date: '', tags: ['menb'], intervalDays: 365, intervalFrom: 2 });
    } else if (isSCDM) {
      menForecastCombo.push({ status: 'future', products: ['Penbraya\u2122 (MenABCWY-Pfizer)', 'Penmenvy\u2122 (MenABCWY-GSK)'], label: 'Dose 1 \u2014 Penbraya\u2122 or Penmenvy\u2122 (MenABCWY)', desc: 'If SCDM elected: counts as MenACWY dose + MenB Dose 1. Choose one product.', date: 'Plan date \u2193', tags: ['menc', 'menb', 'combo'], intervalDays: 0 });
      menForecastCombo.push({ status: 'future', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Dose 2 standalone \u2014 Trumenba\u00ae (if Penbraya\u2122) or Bexsero\u00ae (if Penmenvy\u2122)', desc: '\u22656 months after Dose 1 \u2192 both MenACWY and MenB series complete. No routine booster for SCDM.', date: '', tags: ['menb'], intervalDays: 182, intervalFrom: 0 });
      if (menACWYMedicalRisk) {
        menForecastCombo.push({ status: 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Booster \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: 'Every 5 years while high-risk condition persists', date: '', tags: ['menc'], intervalDays: 1825, intervalFrom: 1 });
      }
    } else {
      menForecastCombo.push({ status: 'future', products: ['Penbraya\u2122 (MenABCWY-Pfizer)', 'Penmenvy\u2122 (MenABCWY-GSK)'], label: 'Dose 1 \u2014 Penbraya\u2122 or Penmenvy\u2122 (MenABCWY)', desc: 'Counts as MenACWY dose + MenB Dose 1. Both vaccines in one injection.', date: 'Plan date \u2193', tags: ['menc', 'menb', 'combo'], intervalDays: 0 });
      menForecastCombo.push({ status: 'future', products: ['Bexsero\u00ae (MenB-4C)', 'Trumenba\u00ae (MenB-FHbp)'], label: 'MenB Dose 2 standalone \u2014 Trumenba\u00ae (if Penbraya\u2122) or Bexsero\u00ae (if Penmenvy\u2122)', desc: '\u22656 months after Dose 1 \u2192 MenB series complete.', date: '', tags: ['menb'], intervalDays: 182, intervalFrom: 0 });
      if (menACWYMedicalRisk) {
        menForecastCombo.push({ status: 'future', products: ['MenQuadfi\u00ae (MenACWY-TT)', 'Menveo\u00ae (MenACWY-CRM)'], label: 'MenACWY Dose 2 \u2014 Menveo\u00ae or MenQuadfi\u00ae', desc: '\u22658 weeks after Dose 1 (high-risk 2-dose primary)', date: '', tags: ['menc'], intervalDays: 56, intervalFrom: 0 });
        menForecastCombo.push({ status: 'future', label: 'MenACWY Booster', desc: 'Every 5 years while high-risk', date: '', tags: ['menc'], intervalDays: 1825, intervalFrom: 2 });
      }
    }
  }

  // Complement inhibitor warning
  if (risks.has('complement_inhibitor')) {
    menItems.push({
      type: 'warn', icon: '\u26a0\ufe0f',
      title: 'Complement inhibitor: vaccinate \u22652 weeks before starting therapy',
      chips: [{ text: 'Eculizumab / Ravulizumab / Sutimlimab', type: 'warn' }],
      detail: `Eculizumab (Soliris\u00ae), ravulizumab (Ultomiris\u00ae), and sutimlimab (Enjaymo\u00ae) block complement \u2014 ${B_MenACWY} and ${B_MenB_either} do NOT provide complete protection in this setting. Still strongly recommended. Vaccinate \u22652 weeks before first dose if possible. Counsel patient on meningococcal symptoms regardless of vaccination status.`,
      refs: R('mmwr_men20', 'ate_menc_risk', 'cdc_menrecs'),
    });
  }

  // Pre-splenectomy
  if (risks.has('asplenia')) {
    menItems.push({
      type: 'info', icon: '\ud83d\udd2a',
      title: 'Planned splenectomy: vaccinate \u22652 weeks before surgery',
      chips: [
        { text: 'Menveo\u00ae/MenQuadfi\u00ae + Bexsero\u00ae/Trumenba\u00ae', type: 'brand' },
        { text: 'Also: pneumococcal vaccines', type: 'interval' },
      ],
      detail: `For planned splenectomy: administer both ${B_MenACWY} (2-dose primary) and ${B_MenB_either} (3-dose primary) starting \u22652 weeks before surgery. Post-splenectomy immune response is impaired. Also ensure pneumococcal vaccination (${B_PCV15_20_21}) is completed before surgery.`,
      refs: R('mmwr_men20', 'cdc_adult'),
    });
  }

  // Off-label notes
  const menBHighRisk = menBMedicalRisk;
  if (menBHighRisk && age >= 19) {
    menItems.push({
      type: 'info', icon: '\ud83d\udccb',
      title: 'MenB off-label use: ACIP recommends for high-risk adults regardless of age',
      chips: [
        { text: 'ACIP off-label: any age with indication', type: 'ok' },
        { text: 'Licensed: 10\u201325 yrs', type: 'interval' },
      ],
      detail: 'Bexsero\u00ae (MenB-4C) and Trumenba\u00ae (MenB-FHbp) are FDA-licensed for ages 10\u201325 years. However, per ACIP best practice guidance, ACIP recommendations supersede FDA package insert age restrictions. ACIP explicitly recommends MenB vaccination for high-risk persons (asplenia, complement deficiency, complement inhibitor use, microbiologists with occupational exposure) of any age, including adults \u226526 years. Healthcare providers should document clinical indication and that ACIP guidance supports this use.',
      refs: R('mmwr_men20', 'ate_menb_recs', 'acip_menb_offlabel', 'acip_bestprac', 'acip_offlabel'),
    });
  }

  if (age >= 65 && (menACWYMedicalRisk || menACWYExposureRisk || menACWYCollege)) {
    menItems.push({
      type: 'info', icon: '\ud83d\udccb',
      title: 'MenACWY product note for older adults: Menveo\u00ae off-label \u226556 yrs if MenQuadfi\u00ae unavailable',
      chips: [
        { text: 'Menveo\u00ae licensed: 2 mo\u201355 yrs', type: 'interval' },
        { text: 'MenQuadfi\u00ae preferred \u226556 yrs', type: 'ok' },
      ],
      detail: 'MenQuadfi\u00ae (MenACWY-TT, Sanofi) is licensed for persons \u22656 weeks of age and is the preferred MenACWY product for adults \u226556 years. Menveo\u00ae (MenACWY-CRM, GSK) is FDA-licensed for ages 2 months through 55 years. Per ACIP, Menveo\u00ae may be used off-label in adults \u226556 years when MenQuadfi\u00ae is not available. ACIP recommendations supersede FDA package insert age restrictions for medically indicated vaccination.',
      refs: R('mmwr_men20', 'acip_menveo_adults', 'acip_bestprac'),
    });
  }

  if (age === 11 || age === 16) {
    menItems.push({
      type: 'info', icon: '\ud83d\udccb',
      title: 'Adolescent note: MenB licensed ages 10\u201325 \u2014 no off-label needed for this age group',
      chips: [
        { text: 'MenB: on-label 10\u201325 yrs', type: 'ok' },
        { text: 'MenACWY: on-label all ages', type: 'ok' },
      ],
      detail: 'For patients aged 10\u201325 years, MenB (Bexsero\u00ae and Trumenba\u00ae) is within the FDA-approved age range \u2014 no off-label use required. MenACWY products (Menveo\u00ae licensed 2 mo\u201355 yrs; MenQuadfi\u00ae licensed \u22656 wks) are also on-label for this age group. ACIP routine MenACWY schedule: first dose at age 11\u201312, booster at age 16. MenB SCDM: ages 16\u201323 (preferred 16\u201318). High-risk patients in this age group receive MenACWY and MenB on-label per standard schedules.',
      refs: R('immunize_menc', 'immunize_menb', 'cdc_adult'),
    });
  }

  // Catch-up rule for meningococcal
  const hasIncompleteMen = menItems.some(i => i.type === 'due' || i.type === 'warn' || i.type === 'soon');
  if (hasIncompleteMen) {
    menItems.push({
      type: 'info', icon: '\ud83d\udccb',
      title: 'Catch-up rule: never restart a series for late doses',
      chips: [{ text: 'Pick up where you left off', type: 'ok' }],
      detail: 'Per CDC: do NOT restart or add extra doses to a vaccine series due to extended intervals between doses. If a MenACWY or MenB dose is late \u2014 even months or years \u2014 administer the next dose as soon as possible and continue from there. Exception: if MenB brand is unknown, restart with one brand. A late MenACWY booster does not require a new primary series.',
      refs: R('cdc_adult', 'immunize_menc'),
    });
  }

  return {
    pneuItems,
    pneuForecast,
    menItems,
    menForecast,
    menForecastCombo,
    isImmuno,
    hasRisk,
    riskList: [...risks],
  };
}
