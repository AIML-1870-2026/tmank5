/* ============================================================
   interactions.js — Interaction detection logic
   ============================================================ */


// ── Keyword-based severity classifier ─────────────────────────────────────
function classifyInteraction(text) {
  if (!text) return 0;
  const t = text.toLowerCase();
  if (t.includes('contraindicated') || t.includes('do not use') || t.includes('must not')) return 3;
  if (t.includes('major') || t.includes('serious') || t.includes('avoid') || t.includes('potentially fatal')) return 2;
  if (t.includes('monitor') || t.includes('caution') || t.includes('may increase') || t.includes('may decrease')) return 1;
  return 0;
}

// ── Drug-class interaction lookup table ───────────────────────────────────
const CLASS_INTERACTIONS = [
  { classA: 'SSRIs',                   classB: 'MAOIs',                        severity: 3, note: 'Serotonin syndrome risk — contraindicated' },
  { classA: 'SSRIs',                   classB: 'Triptans',                     severity: 2, note: 'Risk of serotonin syndrome' },
  { classA: 'NSAIDs',                  classB: 'Anticoagulants',               severity: 2, note: 'Increased bleeding risk' },
  { classA: 'NSAIDs',                  classB: 'ACE Inhibitors',               severity: 1, note: 'May reduce antihypertensive effect' },
  { classA: 'Statins',                 classB: 'Antifungals',                  severity: 2, note: 'Increased statin levels, myopathy risk' },
  { classA: 'Opioids',                 classB: 'Benzodiazepines',              severity: 3, note: 'Respiratory depression — FDA black box warning' },
  { classA: 'Opioids',                 classB: 'Alcohol',                      severity: 2, note: 'CNS depression potentiation' },
  { classA: 'Anticoagulants',          classB: 'Antibiotics',                  severity: 1, note: 'Some antibiotics affect INR' },
  { classA: 'Beta-Blockers',           classB: 'Calcium Channel Blockers',     severity: 2, note: 'Additive cardiac depression' },
  { classA: 'ACE Inhibitors',          classB: 'Potassium Supplements',        severity: 2, note: 'Hyperkalemia risk' },
];

const DRUG_CLASSES = [
  'SSRIs', 'MAOIs', 'NSAIDs', 'ACE Inhibitors', 'Beta-Blockers',
  'Statins', 'Opioids', 'Benzodiazepines', 'Anticoagulants', 'Antifungals', 'Antibiotics',
  'Triptans', 'Calcium Channel Blockers', 'Potassium Supplements',
];

// Look up class-level interactions for a given class
function getClassInteractions(drugClass) {
  return CLASS_INTERACTIONS.filter(
    row => row.classA === drugClass || row.classB === drugClass
  );
}

// ── Generate all unique pairs from an array ────────────────────────────────
function generatePairs(arr) {
  const pairs = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      pairs.push([arr[i], arr[j]]);
    }
  }
  return pairs;
}

// ── Analyze a single pair of drugs ────────────────────────────────────────
// Returns { drugA, drugB, severity, summaryText, source }
async function analyzePair(medA, medB) {
  const nameA = medA.brandName || medA.genericName;
  const nameB = medB.brandName || medB.genericName;

  const [labelA, labelB] = await Promise.allSettled([
    getDrugLabel(nameA),
    getDrugLabel(nameB),
  ]);

  let severity = 0;
  let summaryText = 'No specific interaction data found in FDA labels.';
  let source = null;

  const rA = labelA.status === 'fulfilled' ? labelA.value : null;
  const rB = labelB.status === 'fulfilled' ? labelB.value : null;

  // Check drug A's label for mentions of drug B
  if (rA?.drug_interactions) {
    const textA = Array.isArray(rA.drug_interactions)
      ? rA.drug_interactions.join(' ')
      : rA.drug_interactions;
    const bVariants = [nameB, medB.genericName, medB.brandName].filter(Boolean);
    const mentionsB = bVariants.some(v => textA.toLowerCase().includes(v.toLowerCase()));
    if (mentionsB) {
      const sev = classifyInteraction(textA);
      if (sev > severity) {
        severity = sev;
        summaryText = textA.slice(0, 600);
        source = nameA;
      }
    }
  }

  // Check drug B's label for mentions of drug A
  if (rB?.drug_interactions) {
    const textB = Array.isArray(rB.drug_interactions)
      ? rB.drug_interactions.join(' ')
      : rB.drug_interactions;
    const aVariants = [nameA, medA.genericName, medA.brandName].filter(Boolean);
    const mentionsA = aVariants.some(v => textB.toLowerCase().includes(v.toLowerCase()));
    if (mentionsA) {
      const sev = classifyInteraction(textB);
      if (sev > severity) {
        severity = sev;
        summaryText = textB.slice(0, 600);
        source = nameB;
      }
    }
  }

  return {
    idA: medA.id,
    idB: medB.id,
    drugA: nameA,
    drugB: nameB,
    severity,
    summaryText,
    source,
  };
}

// ── Analyze all pairwise interactions for a medication list ───────────────
// Runs in parallel with Promise.allSettled
async function analyzeAllInteractions(medications, onProgress) {
  const pairs = generatePairs(medications);
  if (pairs.length === 0) return [];

  let done = 0;
  const settled = await Promise.allSettled(
    pairs.map(async ([a, b]) => {
      const result = await analyzePair(a, b);
      done++;
      if (onProgress) onProgress(done, pairs.length);
      return result;
    })
  );

  const results = settled
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);

  saveAnalysis(results);
  return results;
}

// ── Get the worst severity for a given medication in a list of interactions ─
function worstSeverityFor(medId, interactions) {
  const related = interactions.filter(ix => ix.idA === medId || ix.idB === medId);
  return related.reduce((max, ix) => Math.max(max, ix.severity), 0);
}

// ── Get the overall worst severity across all interactions ─────────────────
function overallWorstSeverity(interactions) {
  return interactions.reduce((max, ix) => Math.max(max, ix.severity), 0);
}
