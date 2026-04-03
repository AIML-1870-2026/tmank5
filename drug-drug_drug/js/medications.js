/* ============================================================
   medications.js — Medication list state + localStorage
   ============================================================ */

const STORAGE_KEY      = 'drugSafe_medications';
const ANALYSIS_KEY     = 'drugSafe_lastAnalysis';

// ── Load from localStorage ─────────────────────────────────────────────────
function loadMedications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Save to localStorage ───────────────────────────────────────────────────
function saveMedications(meds) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meds));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

// ── Add a medication ───────────────────────────────────────────────────────
// Returns the updated list, or null if duplicate
function addMedication(meds, drug) {
  const genericName = (drug.genericName || drug.generic_name || '').toLowerCase();
  const brandName   = (drug.brandName   || drug.brand_name   || '').toLowerCase();

  const isDuplicate = meds.some(m => {
    const mg = m.genericName?.toLowerCase();
    const mb = m.brandName?.toLowerCase();
    return (genericName && mg === genericName) || (brandName && mb === brandName);
  });

  if (isDuplicate) return null;

  const newMed = {
    id:          crypto.randomUUID(),
    brandName:   drug.brandName   || drug.brand_name   || '',
    genericName: drug.genericName || drug.generic_name || '',
    dosageForm:  drug.dosageForm  || drug.dosage_form  || '',
    ndcCode:     drug.ndcCode     || drug.product_ndc  || '',
    addedAt:     new Date().toISOString(),
  };

  const updated = [...meds, newMed];
  saveMedications(updated);
  return updated;
}

// ── Remove a medication ────────────────────────────────────────────────────
function removeMedication(meds, id) {
  const updated = meds.filter(m => m.id !== id);
  saveMedications(updated);
  return updated;
}

// ── Clear all medications ──────────────────────────────────────────────────
function clearMedications() {
  saveMedications([]);
  localStorage.removeItem(ANALYSIS_KEY);
  return [];
}

// ── Save cached analysis ───────────────────────────────────────────────────
function saveAnalysis(analysis) {
  try {
    localStorage.setItem(ANALYSIS_KEY, JSON.stringify({
      data: analysis,
      savedAt: new Date().toISOString(),
    }));
  } catch {}
}

// ── Load cached analysis ───────────────────────────────────────────────────
function loadAnalysis() {
  try {
    const raw = localStorage.getItem(ANALYSIS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
