/* ============================================================
   api.js — All OpenFDA API calls
   Base URL: https://api.fda.gov
   ============================================================ */


const BASE = 'https://api.fda.gov';

// Generic fetcher with error handling
async function apiFetch(url) {
  try {
    const res = await fetch(url);
    if (res.status === 404) return null; // no results — not an error
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    if (err.name === 'TypeError' || err.message.includes('Failed to fetch')) {
      showToast('Network error — check your connection', 'error');
    } else if (!err.message.includes('404')) {
      showToast(`FDA API error: ${err.message}`, 'error');
    }
    return null;
  }
}

// ── Search drugs by name for autocomplete ──────────────────────────────────
// GET /drug/ndc.json?search=brand_name:"QUERY"&limit=8
// Falls back to generic_name search, then full-text search
async function searchDrugsByName(query, limit = 8) {
  if (!query || query.length < 2) return [];
  const q = encodeURIComponent(query);

  // Try brand_name first
  let data = await apiFetch(`${BASE}/drug/ndc.json?search=brand_name:"${q}"&limit=${limit}`);
  if (data?.results?.length) return data.results;

  // Try generic_name
  data = await apiFetch(`${BASE}/drug/ndc.json?search=generic_name:"${q}"&limit=${limit}`);
  if (data?.results?.length) return data.results;

  // Full-text fallback
  data = await apiFetch(`${BASE}/drug/ndc.json?search=${q}&limit=${limit}`);
  return data?.results ?? [];
}

// ── Get drug label (interactions, warnings, contraindications) ─────────────
// GET /drug/label.json?search=openfda.brand_name:"NAME"&limit=1
// Falls back to generic_name, then full-text
async function getDrugLabel(drugName) {
  if (!drugName) return null;
  const n = encodeURIComponent(drugName);

  // Try brand name on openfda fields
  let data = await apiFetch(`${BASE}/drug/label.json?search=openfda.brand_name:"${n}"&limit=1`);
  if (data?.results?.length) return data.results[0];

  // Try generic name on openfda fields
  data = await apiFetch(`${BASE}/drug/label.json?search=openfda.generic_name:"${n}"&limit=1`);
  if (data?.results?.length) return data.results[0];

  // Full-text fallback (broader but less precise)
  data = await apiFetch(`${BASE}/drug/label.json?search=${n}&limit=1`);
  return data?.results?.[0] ?? null;
}

// ── Get interaction text between two drugs ─────────────────────────────────
// Fetches label for drugA and drugB, checks drug_interactions field for each other's name
async function getInteractionText(drugA, drugB) {
  const [labelA, labelB] = await Promise.allSettled([
    getDrugLabel(drugA),
    getDrugLabel(drugB),
  ]);

  const results = [];
  const rA = labelA.status === 'fulfilled' ? labelA.value : null;
  const rB = labelB.status === 'fulfilled' ? labelB.value : null;

  const extractText = (label) => {
    if (!label?.drug_interactions) return '';
    return Array.isArray(label.drug_interactions)
      ? label.drug_interactions.join(' ')
      : label.drug_interactions;
  };

  const textA = extractText(rA);
  const textB = extractText(rB);

  if (textA && textA.toLowerCase().includes(drugB.toLowerCase())) {
    results.push({ source: drugA, text: textA });
  }
  if (textB && textB.toLowerCase().includes(drugA.toLowerCase())) {
    results.push({ source: drugB, text: textB });
  }

  // Return all available interaction text even if no specific mention found
  if (results.length === 0 && textA) {
    results.push({ source: drugA, text: textA, generic: true });
  }

  return results;
}

// ── Get adverse events for a drug ─────────────────────────────────────────
// GET /drug/event.json?search=patient.drug.openfda.brand_name:"NAME"&count=patient.reaction.reactionmeddrapt.exact&limit=10
async function getAdverseEvents(drugName, limit = 10) {
  if (!drugName) return [];
  const n = encodeURIComponent(drugName);

  // Try brand name first
  let data = await apiFetch(
    `${BASE}/drug/event.json?search=patient.drug.openfda.brand_name:"${n}"&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}`
  );
  if (data?.results?.length) return data.results;

  // Try generic name
  data = await apiFetch(
    `${BASE}/drug/event.json?search=patient.drug.openfda.generic_name:"${n}"&count=patient.reaction.reactionmeddrapt.exact&limit=${limit}`
  );
  return data?.results ?? [];
}

// ── Get adverse event total count ─────────────────────────────────────────
async function getAdverseEventCount(drugName) {
  if (!drugName) return 0;
  const n = encodeURIComponent(drugName);
  const data = await apiFetch(
    `${BASE}/drug/event.json?search=patient.drug.openfda.brand_name:"${n}"&limit=1`
  );
  return data?.meta?.results?.total ?? 0;
}

// ── Get recall status for a drug ──────────────────────────────────────────
// GET /drug/enforcement.json?search=brand_name:"NAME"&limit=5
async function getRecallStatus(drugName) {
  if (!drugName) return [];
  const n = encodeURIComponent(drugName);

  let data = await apiFetch(`${BASE}/drug/enforcement.json?search=brand_name:"${n}"&limit=5`);
  if (data?.results?.length) return data.results;

  // Try product description field
  data = await apiFetch(`${BASE}/drug/enforcement.json?search=product_description:"${n}"&limit=5`);
  return data?.results ?? [];
}

// ── Get NDC info (generic name, dosage form, etc.) ────────────────────────
// GET /drug/ndc.json?search=brand_name:"NAME"&limit=1
async function getNDCInfo(drugName) {
  if (!drugName) return null;
  const n = encodeURIComponent(drugName);
  const data = await apiFetch(`${BASE}/drug/ndc.json?search=brand_name:"${n}"&limit=1`);
  return data?.results?.[0] ?? null;
}
