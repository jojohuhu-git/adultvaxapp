// Multi-select dropdown labels
export const MS_LABELS = {
  hiv: 'HIV',
  asplenia: 'Asplenia / Sickle cell',
  complement: 'Complement deficiency',
  complement_inhibitor: 'Complement inhibitor',
  malignancy: 'Malignancy',
  renal: 'Chronic renal failure',
  immunosuppressed: 'Immunosuppressive therapy',
  transplant: 'SOT',
  hsct: 'Post-HSCT',
  cochlear: 'Cochlear implant',
  csf_leak: 'CSF leak',
  heart: 'Chronic heart disease',
  lung: 'Chronic lung disease',
  diabetes: 'Diabetes',
  liver: 'Chronic liver disease',
  alcoholism: 'Alcoholism',
  smoking: 'Smoking',
  travel: 'Travel risk',
  microbiologist: 'Microbiologist',
  college: 'College freshman',
  military: 'Military',
};

export const VAX_COLORS = {
  pcv7: '#e05252',
  pcv13: '#f5a623',
  pcv15: '#4d9de0',
  pcv20: '#3ec97e',
  pcv21: '#9b72cf',
  ppsv23: '#3ecfc9',
  unknown_pcv: '#6a7a9a',
  menacwy_menveo: '#4d9de0',
  menacwy_menquadfi: '#3ecfc9',
  menacwy_unknown: '#6a7a9a',
  menb_bexsero: '#3ec97e',
  menb_trumenba: '#9b72cf',
  menb_unknown: '#6a7a9a',
  menabcwy_penbraya: '#f5a623',
  menabcwy_penmenvy: '#e05252',
};

export const VAX_LABELS = {
  pcv7: 'PCV7 (Prevnar)',
  pcv13: 'PCV13 (Prevnar 13)',
  pcv15: 'PCV15 (Vaxneuvance)',
  pcv20: 'PCV20 (Prevnar 20)',
  pcv21: 'PCV21 (Capvaxive)',
  ppsv23: 'PPSV23 (Pneumovax 23)',
  unknown_pcv: 'Unknown PCV',
  menacwy_menveo: 'Menveo (MenACWY-CRM)',
  menacwy_menquadfi: 'MenQuadfi (MenACWY-TT)',
  menacwy_unknown: 'MenACWY (unknown)',
  menb_bexsero: 'Bexsero (MenB-4C)',
  menb_trumenba: 'Trumenba (MenB-FHbp)',
  menb_unknown: 'MenB (unknown brand)',
  menabcwy_penbraya: 'Penbraya (MenABCWY-Pfizer)',
  menabcwy_penmenvy: 'Penmenvy (MenABCWY-GSK)',
};

export const RISK_LABELS = {
  hiv: 'HIV',
  asplenia: 'Asplenia/Sickle Cell',
  complement: 'Complement Deficiency',
  complement_inhibitor: 'Complement Inhibitor',
  malignancy: 'Malignancy',
  renal: 'Chronic Renal Failure',
  immunosuppressed: 'Immunosuppressive Therapy',
  transplant: 'SOT',
  hsct: 'Post-HSCT',
  cochlear: 'Cochlear Implant',
  csf_leak: 'CSF Leak',
  heart: 'Chronic Heart Disease',
  lung: 'Chronic Lung Disease',
  diabetes: 'Diabetes',
  liver: 'Chronic Liver Disease',
  alcoholism: 'Alcoholism',
  smoking: 'Smoking',
  travel: 'Travel Risk',
  microbiologist: 'Microbiologist',
  college: 'College Freshman',
  military: 'Military',
};

export const AGE_LABELS = {
  11: '11\u201315 yrs',
  16: '16\u201317 yrs',
  19: '19\u201329 yrs',
  30: '30\u201339 yrs',
  40: '40\u201349 yrs',
  50: '50\u201364 yrs',
  65: '65+ yrs',
};

export const IMMUNO_RISKS = [
  'hiv', 'asplenia', 'complement', 'complement_inhibitor', 'malignancy',
  'renal', 'immunosuppressed', 'transplant', 'hsct', 'cochlear', 'csf_leak',
];

export const OTHER_RISK_CONDITIONS = [
  'heart', 'lung', 'diabetes', 'liver', 'alcoholism', 'smoking',
];

// Immunocompromising condition options for the form
export const IMMUNO_OPTIONS = [
  { value: 'hiv', label: 'HIV infection' },
  { value: 'asplenia', label: 'Asplenia / Sickle cell disease' },
  { value: 'complement', label: 'Complement deficiency (C3, C5\u2013C9, properdin, factor D/H)' },
  { value: 'complement_inhibitor', label: 'Complement inhibitor (eculizumab, ravulizumab, sutimlimab)' },
  { value: 'malignancy', label: 'Malignancy / hematologic cancer' },
  { value: 'renal', label: 'Chronic renal failure / nephrotic syndrome' },
  { value: 'immunosuppressed', label: 'Immunosuppressive therapy (steroids, chemo, biologics)' },
  { value: 'transplant', label: 'Solid organ transplant' },
  { value: 'hsct', label: 'Post-HSCT (stem cell transplant)' },
  { value: 'cochlear', label: 'Cochlear implant' },
  { value: 'csf_leak', label: 'CSF leak' },
];

// Other risk condition options for the form
export const OTHER_RISK_OPTIONS = [
  { value: 'heart', label: 'Chronic heart disease (heart failure, cardiomyopathy)' },
  { value: 'lung', label: 'Chronic lung disease (COPD, emphysema, severe asthma)' },
  { value: 'diabetes', label: 'Diabetes mellitus' },
  { value: 'liver', label: 'Chronic liver disease / cirrhosis' },
  { value: 'alcoholism', label: 'Alcoholism' },
  { value: 'smoking', label: 'Current cigarette smoking' },
  { value: 'travel', label: 'Travel to meningococcal-endemic region (meningitis belt, Hajj)' },
  { value: 'microbiologist', label: 'Microbiologist \u2014 N. meningitidis exposure' },
  { value: 'college', label: 'First-year college student in residential housing' },
  { value: 'military', label: 'Military recruit' },
];

// Pneumococcal vaccine options for the form
export const PNEU_VAX_OPTIONS = [
  { value: 'pcv7', label: 'PCV7 (Prevnar)' },
  { value: 'pcv13', label: 'PCV13 (Prevnar 13)' },
  { value: 'pcv15', label: 'PCV15 (Vaxneuvance)' },
  { value: 'pcv20', label: 'PCV20 (Prevnar 20)' },
  { value: 'pcv21', label: 'PCV21 (Capvaxive)' },
  { value: 'ppsv23', label: 'PPSV23 (Pneumovax 23)' },
  { value: 'unknown_pcv', label: 'Unknown PCV (brand unknown)' },
];

// Meningococcal vaccine options for the form
export const MENING_VAX_OPTIONS = [
  {
    label: 'MenACWY',
    options: [
      { value: 'menacwy_menveo', label: 'Menveo (MenACWY-CRM)' },
      { value: 'menacwy_menquadfi', label: 'MenQuadfi (MenACWY-TT)' },
      { value: 'menacwy_unknown', label: 'MenACWY \u2014 brand unknown' },
    ],
  },
  {
    label: 'MenB',
    options: [
      { value: 'menb_bexsero', label: 'Bexsero (MenB-4C)' },
      { value: 'menb_trumenba', label: 'Trumenba (MenB-FHbp)' },
      { value: 'menb_unknown', label: 'MenB \u2014 brand unknown' },
    ],
  },
  {
    label: 'MenABCWY Combination',
    options: [
      { value: 'menabcwy_penbraya', label: 'Penbraya (MenABCWY \u2014 Pfizer)' },
      { value: 'menabcwy_penmenvy', label: 'Penmenvy (MenABCWY \u2014 GSK)' },
    ],
  },
];
