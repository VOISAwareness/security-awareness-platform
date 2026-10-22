// Each department's short code, for its crest: the Leaderboard and Insights.
export const DEPT_CODE = {
  Finance: 'FIN', 'IT Security': 'SEC', Operations: 'OPS', 'Human Res.': 'HR', Sales: 'SAL', Legal: 'LEG', IT: 'IT', Marketing: 'MKT',
  Procurement: 'PRC', 'Customer Care': 'CC', Engineering: 'ENG', 'Data & AI': 'DAI', 'Risk & Compliance': 'RSK', Facilities: 'FAC', Strategy: 'STR', 'Network Ops': 'NET',
  AIDA: 'AI', CARE: 'CAR', 'Finance Operations': 'FIN', 'Network Engineering': 'NET', 'Supply Chain Management': 'SCM',
  'Cyber Security': 'CYB', 'Cloud Infrastructure': 'CLD', 'IT Operations': 'ITO', 'Human Resources': 'HR', 'Legal & Compliance': 'LEG',
  'Sales & Enterprise': 'SAL', 'Digital Products': 'DIG', 'Marketing & Communications': 'MKT', 'Executive Board': 'EXB',
};

/** A department's code: its own, or its first three letters. */
export const deptCode = (name) => DEPT_CODE[name] || String(name || '').slice(0, 3).toUpperCase();
