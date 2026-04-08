export function isMenuACWY(v) {
  return v.startsWith('menacwy') || v.startsWith('menabcwy');
}

export function isMenB(v) {
  return v.startsWith('menb') || v.startsWith('menabcwy');
}

export function isPCV(v) {
  return ['pcv7', 'pcv13', 'pcv15', 'pcv20', 'pcv21', 'unknown_pcv'].includes(v);
}

export function isPCVHigher(v) {
  return ['pcv15', 'pcv20', 'pcv21'].includes(v);
}

export function isPCV20or21(v) {
  return v === 'pcv20' || v === 'pcv21';
}

// Branded name strings (plain text versions for React)
export const B_PCV15 = 'Vaxneuvance\u00ae (PCV15)';
export const B_PCV20 = 'Prevnar 20\u00ae (PCV20)';
export const B_PCV21 = 'Capvaxive\u00ae (PCV21)';
export const B_PPSV23 = 'Pneumovax 23\u00ae (PPSV23)';
export const B_PCV20_21 = 'Prevnar 20\u00ae (PCV20) or Capvaxive\u00ae (PCV21)';
export const B_PCV15_20_21 = 'Vaxneuvance\u00ae (PCV15), Prevnar 20\u00ae (PCV20), or Capvaxive\u00ae (PCV21)';
export const B_MenACWY = 'Menveo\u00ae (MenACWY-CRM) or MenQuadfi\u00ae (MenACWY-TT)';
export const B_MenB_either = 'Bexsero\u00ae (MenB-4C) or Trumenba\u00ae (MenB-FHbp)';
export const B_MenABCWY = 'Penbraya\u2122 (MenABCWY \u2014 Pfizer) or Penmenvy\u2122 (MenABCWY \u2014 GSK)';

export function brandedMenB(brandStr) {
  if (brandStr === 'Bexsero') return 'Bexsero\u00ae (MenB-4C)';
  if (brandStr === 'Trumenba') return 'Trumenba\u00ae (MenB-FHbp)';
  return B_MenB_either;
}

export function brandedMenACWY(vaxCode) {
  if (vaxCode === 'menacwy_menveo') return 'Menveo\u00ae (MenACWY-CRM)';
  if (vaxCode === 'menacwy_menquadfi') return 'MenQuadfi\u00ae (MenACWY-TT)';
  return B_MenACWY;
}
