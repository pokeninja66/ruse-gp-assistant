import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// MediScribe AI — Drug Catalogue Seeder
// Run once (or weekly) to populate public.drug_catalogue
//
// Usage (Node / TanStack Start server function):
//   import { seedDrugCatalogue } from "./seedDrugCatalogue";
//   await seedDrugCatalogue();
//
// Or run directly:
//   npx tsx scripts/seedDrugCatalogue.ts
// ─────────────────────────────────────────────────────────────────────────────

type DrugSource = "ema" | "bda" | "custom";
type PrescriptionStatus = "prescription_only" | "otc" | "hospital_only";

interface DrugEntry {
  product_name: string;
  active_substance: string;
  atc_code: string;
  source: DrugSource;
  authorised_bg: boolean;
  authorised_eu: boolean;
  prescription_status: PrescriptionStatus;
  dosage_form: string;
}

const DRUG_CATALOGUE: DrugEntry[] = [
  // ── ANTIBIOTICS — J01 ─────────────────────────────────────────────────────
  { product_name: "Amoxicillin 500mg",            active_substance: "amoxicillin",                        atc_code: "J01CA04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Augmentin 875mg/125mg",         active_substance: "amoxicillin / clavulanic acid",      atc_code: "J01CR02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Azithromycin 500mg",            active_substance: "azithromycin",                       atc_code: "J01FA10", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Clarithromycin 500mg",          active_substance: "clarithromycin",                     atc_code: "J01FA09", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Erythromycin 500mg",            active_substance: "erythromycin",                       atc_code: "J01FA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Doxycycline 100mg",             active_substance: "doxycycline",                        atc_code: "J01AA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Ciprofloxacin 500mg",           active_substance: "ciprofloxacin",                      atc_code: "J01MA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Levofloxacin 500mg",            active_substance: "levofloxacin",                       atc_code: "J01MA12", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Metronidazole 500mg",           active_substance: "metronidazole",                      atc_code: "J01XD01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Co-trimoxazole 960mg",          active_substance: "sulfamethoxazole / trimethoprim",    atc_code: "J01EE01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Cephalexin 500mg",              active_substance: "cefalexin",                          atc_code: "J01DB01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Cefuroxime 500mg",              active_substance: "cefuroxime",                         atc_code: "J01DC02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Ceftriaxone 1g",               active_substance: "ceftriaxone",                        atc_code: "J01DD04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "hospital_only",      dosage_form: "powder for injection" },
  { product_name: "Clindamycin 300mg",             active_substance: "clindamycin",                        atc_code: "J01FF01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Nitrofurantoin 100mg",          active_substance: "nitrofurantoin",                     atc_code: "J01XE01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Ampicillin 500mg",              active_substance: "ampicillin",                         atc_code: "J01CA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Roxithromycin 150mg",           active_substance: "roxithromycin",                      atc_code: "J01FA06", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Cefixime 400mg",               active_substance: "cefixime",                           atc_code: "J01DD08", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Meropenem 500mg",               active_substance: "meropenem",                          atc_code: "J01DH02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "hospital_only",      dosage_form: "powder for injection" },
  { product_name: "Vancomycin 500mg",              active_substance: "vancomycin",                         atc_code: "J01XA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "hospital_only",      dosage_form: "powder for injection" },
  { product_name: "Flucloxacillin 500mg",          active_substance: "flucloxacillin",                     atc_code: "J01CF05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Cefaclor 500mg",               active_substance: "cefaclor",                           atc_code: "J01DC04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },

  // ── ANTIFUNGALS — J02 ─────────────────────────────────────────────────────
  { product_name: "Fluconazole 150mg",             active_substance: "fluconazole",                        atc_code: "J02AC01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Itraconazole 100mg",            active_substance: "itraconazole",                       atc_code: "J02AC02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },

  // ── ANTIVIRALS — J05 ──────────────────────────────────────────────────────
  { product_name: "Acyclovir 400mg",               active_substance: "aciclovir",                          atc_code: "J05AB01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Valacyclovir 500mg",            active_substance: "valaciclovir",                       atc_code: "J05AB11", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Oseltamivir 75mg",              active_substance: "oseltamivir",                        atc_code: "J05AH02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },

  // ── BETA-BLOCKERS — C07 ───────────────────────────────────────────────────
  { product_name: "Metoprolol 50mg",               active_substance: "metoprolol",                         atc_code: "C07AB02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Bisoprolol 5mg",                active_substance: "bisoprolol",                         atc_code: "C07AB07", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Carvedilol 25mg",               active_substance: "carvedilol",                         atc_code: "C07AG02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Atenolol 50mg",                 active_substance: "atenolol",                           atc_code: "C07AB03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── CALCIUM CHANNEL BLOCKERS — C08 ────────────────────────────────────────
  { product_name: "Amlodipine 5mg",                active_substance: "amlodipine",                         atc_code: "C08CA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Nifedipine 20mg",               active_substance: "nifedipine",                         atc_code: "C08CA05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Diltiazem 90mg",                active_substance: "diltiazem",                          atc_code: "C08DB01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Verapamil 80mg",                active_substance: "verapamil",                          atc_code: "C08DA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── ACE INHIBITORS — C09A ─────────────────────────────────────────────────
  { product_name: "Lisinopril 10mg",               active_substance: "lisinopril",                         atc_code: "C09AA03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Enalapril 10mg",                active_substance: "enalapril",                          atc_code: "C09AA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Ramipril 5mg",                  active_substance: "ramipril",                           atc_code: "C09AA05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Perindopril 5mg",               active_substance: "perindopril",                        atc_code: "C09AA04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── ARBs — C09C ───────────────────────────────────────────────────────────
  { product_name: "Losartan 50mg",                 active_substance: "losartan",                           atc_code: "C09CA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Valsartan 80mg",                active_substance: "valsartan",                          atc_code: "C09CA03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Telmisartan 40mg",              active_substance: "telmisartan",                        atc_code: "C09CA07", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Irbesartan 150mg",              active_substance: "irbesartan",                         atc_code: "C09CA04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Candesartan 8mg",               active_substance: "candesartan",                        atc_code: "C09CA06", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Sacubitril/Valsartan 50mg",     active_substance: "sacubitril / valsartan",             atc_code: "C09DX04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── DIURETICS — C03 ───────────────────────────────────────────────────────
  { product_name: "Furosemide 40mg",               active_substance: "furosemide",                         atc_code: "C03CA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Hydrochlorothiazide 25mg",      active_substance: "hydrochlorothiazide",                atc_code: "C03AA03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Spironolactone 25mg",           active_substance: "spironolactone",                     atc_code: "C03DA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Torasemide 10mg",               active_substance: "torasemide",                         atc_code: "C03CA04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Indapamide 2.5mg",              active_substance: "indapamide",                         atc_code: "C03BA11", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Eplerenone 50mg",               active_substance: "eplerenone",                         atc_code: "C03DA04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── STATINS — C10A ────────────────────────────────────────────────────────
  { product_name: "Atorvastatin 20mg",             active_substance: "atorvastatin",                       atc_code: "C10AA05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Simvastatin 20mg",              active_substance: "simvastatin",                        atc_code: "C10AA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Rosuvastatin 10mg",             active_substance: "rosuvastatin",                       atc_code: "C10AA07", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── ANTITHROMBOTIC — B01 ──────────────────────────────────────────────────
  { product_name: "Aspirin 100mg",                 active_substance: "acetylsalicylic acid",               atc_code: "B01AC06", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Clopidogrel 75mg",              active_substance: "clopidogrel",                        atc_code: "B01AC04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Warfarin 5mg",                  active_substance: "warfarin",                           atc_code: "B01AA03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Rivaroxaban 20mg",              active_substance: "rivaroxaban",                        atc_code: "B01AF01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Apixaban 5mg",                  active_substance: "apixaban",                           atc_code: "B01AF02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Dabigatran 110mg",              active_substance: "dabigatran etexilate",               atc_code: "B01AE07", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },

  // ── CARDIAC — C01 ─────────────────────────────────────────────────────────
  { product_name: "Digoxin 0.25mg",                active_substance: "digoxin",                            atc_code: "C01AA05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Ivabradine 5mg",                active_substance: "ivabradine",                         atc_code: "C01EB17", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Trimetazidine 35mg",            active_substance: "trimetazidine",                      atc_code: "C01EB15", source: "bda", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── DIABETES — A10 ────────────────────────────────────────────────────────
  { product_name: "Metformin 850mg",               active_substance: "metformin",                          atc_code: "A10BA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Gliclazide 80mg",               active_substance: "gliclazide",                         atc_code: "A10BB09", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Glimepiride 2mg",               active_substance: "glimepiride",                        atc_code: "A10BB12", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Glibenclamide 5mg",             active_substance: "glibenclamide",                      atc_code: "A10BB01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Sitagliptin 100mg",             active_substance: "sitagliptin",                        atc_code: "A10BH01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Empagliflozin 10mg",            active_substance: "empagliflozin",                      atc_code: "A10BK03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Dapagliflozin 10mg",            active_substance: "dapagliflozin",                      atc_code: "A10BK01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Insulin Glargine 100 IU/ml",   active_substance: "insulin glargine",                   atc_code: "A10AE04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "solution for injection" },
  { product_name: "Insulin Aspart 100 IU/ml",     active_substance: "insulin aspart",                     atc_code: "A10AB05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "solution for injection" },
  { product_name: "Insulin Lispro 100 IU/ml",     active_substance: "insulin lispro",                     atc_code: "A10AB04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "solution for injection" },

  // ── RESPIRATORY — R03 ─────────────────────────────────────────────────────
  { product_name: "Salbutamol 100mcg",             active_substance: "salbutamol",                         atc_code: "R03AC02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "pressurised inhalation" },
  { product_name: "Formoterol 12mcg",              active_substance: "formoterol",                         atc_code: "R03AC13", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "inhalation powder" },
  { product_name: "Salmeterol 50mcg",              active_substance: "salmeterol",                         atc_code: "R03AC12", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "inhalation powder" },
  { product_name: "Budesonide 200mcg",             active_substance: "budesonide",                         atc_code: "R03BA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "inhalation powder" },
  { product_name: "Fluticasone 250mcg",            active_substance: "fluticasone propionate",             atc_code: "R03BA05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "pressurised inhalation" },
  { product_name: "Tiotropium 18mcg",              active_substance: "tiotropium",                         atc_code: "R03BB04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "inhalation powder" },
  { product_name: "Montelukast 10mg",              active_substance: "montelukast",                        atc_code: "R03DC03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Ipratropium 20mcg",             active_substance: "ipratropium bromide",                atc_code: "R03AK04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "pressurised inhalation" },

  // ── ANTIHISTAMINES — R06 ──────────────────────────────────────────────────
  { product_name: "Cetirizine 10mg",               active_substance: "cetirizine",                         atc_code: "R06AE07", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Loratadine 10mg",               active_substance: "loratadine",                         atc_code: "R06AX13", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Fexofenadine 120mg",            active_substance: "fexofenadine",                       atc_code: "R06AX26", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Desloratadine 5mg",             active_substance: "desloratadine",                      atc_code: "R06AX27", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── COUGH — R05 ───────────────────────────────────────────────────────────
  { product_name: "Ambroxol 30mg",                 active_substance: "ambroxol",                           atc_code: "R05CB06", source: "bda", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Bromhexine 8mg",                active_substance: "bromhexine",                         atc_code: "R05CB02", source: "bda", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "N-Acetylcysteine 600mg",        active_substance: "acetylcysteine",                     atc_code: "R05CB01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "effervescent tablet" },
  { product_name: "Codeine 30mg",                  active_substance: "codeine",                            atc_code: "R05DA04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── GI / ACID — A02 ───────────────────────────────────────────────────────
  { product_name: "Omeprazole 20mg",               active_substance: "omeprazole",                         atc_code: "A02BC01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "capsule" },
  { product_name: "Pantoprazole 40mg",             active_substance: "pantoprazole",                       atc_code: "A02BC02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "gastro-resistant tablet" },
  { product_name: "Lansoprazole 30mg",             active_substance: "lansoprazole",                       atc_code: "A02BC03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Esomeprazole 40mg",             active_substance: "esomeprazole",                       atc_code: "A02BC05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "gastro-resistant capsule" },
  { product_name: "Domperidone 10mg",              active_substance: "domperidone",                        atc_code: "A03FA03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Metoclopramide 10mg",           active_substance: "metoclopramide",                     atc_code: "A03FA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Ondansetron 8mg",               active_substance: "ondansetron",                        atc_code: "A04AA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Loperamide 2mg",                active_substance: "loperamide",                         atc_code: "A07DA03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "capsule" },
  { product_name: "Mesalazine 400mg",              active_substance: "mesalazine",                         atc_code: "A07EC02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "gastro-resistant tablet" },
  { product_name: "Lactulose 667mg/ml",            active_substance: "lactulose",                          atc_code: "A06AD11", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "oral solution" },
  { product_name: "Bisacodyl 5mg",                 active_substance: "bisacodyl",                          atc_code: "A06AB02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "gastro-resistant tablet" },

  // ── THYROID — H03 ─────────────────────────────────────────────────────────
  { product_name: "Levothyroxine 50mcg",           active_substance: "levothyroxine sodium",               atc_code: "H03AA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Levothyroxine 100mcg",          active_substance: "levothyroxine sodium",               atc_code: "H03AA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── CORTICOSTEROIDS — H02 ─────────────────────────────────────────────────
  { product_name: "Prednisolone 5mg",              active_substance: "prednisolone",                       atc_code: "H02AB06", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Methylprednisolone 16mg",       active_substance: "methylprednisolone",                 atc_code: "H02AB04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Dexamethasone 0.5mg",           active_substance: "dexamethasone",                      atc_code: "H02AB02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Hydrocortisone 20mg",           active_substance: "hydrocortisone",                     atc_code: "H02AB09", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── ANALGESICS — N02 / M01 ────────────────────────────────────────────────
  { product_name: "Paracetamol 500mg",             active_substance: "paracetamol",                        atc_code: "N02BE01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Paracetamol 1000mg",            active_substance: "paracetamol",                        atc_code: "N02BE01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Ibuprofen 400mg",               active_substance: "ibuprofen",                          atc_code: "M01AE01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Diclofenac 50mg",               active_substance: "diclofenac sodium",                  atc_code: "M01AB05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "gastro-resistant tablet" },
  { product_name: "Naproxen 500mg",                active_substance: "naproxen",                           atc_code: "M01AE02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Meloxicam 15mg",                active_substance: "meloxicam",                          atc_code: "M01AC06", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Celecoxib 200mg",               active_substance: "celecoxib",                          atc_code: "M01AH01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Etoricoxib 60mg",               active_substance: "etoricoxib",                         atc_code: "M01AH05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Tramadol 50mg",                 active_substance: "tramadol",                           atc_code: "N02AX02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Morphine 10mg",                 active_substance: "morphine",                           atc_code: "N02AA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Ketorolac 10mg",                active_substance: "ketorolac",                          atc_code: "M01AB15", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── ANTIDEPRESSANTS — N06A ────────────────────────────────────────────────
  { product_name: "Sertraline 50mg",               active_substance: "sertraline",                         atc_code: "N06AB06", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Escitalopram 10mg",             active_substance: "escitalopram",                       atc_code: "N06AB10", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Fluoxetine 20mg",               active_substance: "fluoxetine",                         atc_code: "N06AB03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Venlafaxine 75mg",              active_substance: "venlafaxine",                        atc_code: "N06AX16", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "modified-release capsule" },
  { product_name: "Amitriptyline 25mg",            active_substance: "amitriptyline",                      atc_code: "N06AA09", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Mirtazapine 30mg",              active_substance: "mirtazapine",                        atc_code: "N06AX11", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Duloxetine 60mg",               active_substance: "duloxetine",                         atc_code: "N06AX21", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "gastro-resistant capsule" },

  // ── ANTIPSYCHOTICS — N05A ─────────────────────────────────────────────────
  { product_name: "Quetiapine 200mg",              active_substance: "quetiapine",                         atc_code: "N05AH04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Olanzapine 10mg",               active_substance: "olanzapine",                         atc_code: "N05AH03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Haloperidol 5mg",               active_substance: "haloperidol",                        atc_code: "N05AD01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Risperidone 2mg",               active_substance: "risperidone",                        atc_code: "N05AX08", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── ANXIOLYTICS / SEDATIVES — N05B / N05C ────────────────────────────────
  { product_name: "Alprazolam 0.5mg",              active_substance: "alprazolam",                         atc_code: "N05BA12", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Diazepam 5mg",                  active_substance: "diazepam",                           atc_code: "N05BA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Lorazepam 1mg",                 active_substance: "lorazepam",                          atc_code: "N05BA06", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Zolpidem 10mg",                 active_substance: "zolpidem",                           atc_code: "N05CF02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── ANTIEPILEPTICS — N03 ──────────────────────────────────────────────────
  { product_name: "Pregabalin 150mg",              active_substance: "pregabalin",                         atc_code: "N03AX16", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Gabapentin 300mg",              active_substance: "gabapentin",                         atc_code: "N03AX12", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Carbamazepine 200mg",           active_substance: "carbamazepine",                      atc_code: "N03AF01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Valproate 500mg",               active_substance: "valproic acid",                      atc_code: "N03AG01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "gastro-resistant tablet" },
  { product_name: "Levetiracetam 500mg",           active_substance: "levetiracetam",                      atc_code: "N03AX14", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Lamotrigine 100mg",             active_substance: "lamotrigine",                        atc_code: "N03AX09", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Topiramate 50mg",               active_substance: "topiramate",                         atc_code: "N03AX11", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── ANTI-PARKINSON / DEMENTIA — N04 / N06D ───────────────────────────────
  { product_name: "Levodopa/Carbidopa 250/25mg",  active_substance: "levodopa / carbidopa",               atc_code: "N04BA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Pramipexole 0.18mg",            active_substance: "pramipexole",                        atc_code: "N04BC05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Donepezil 10mg",                active_substance: "donepezil",                          atc_code: "N06DA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Rivastigmine 6mg",              active_substance: "rivastigmine",                       atc_code: "N06DA03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },
  { product_name: "Memantine 10mg",                active_substance: "memantine",                          atc_code: "N06DX01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── NOOTROPICS — BG favourites ────────────────────────────────────────────
  { product_name: "Piracetam 800mg",               active_substance: "piracetam",                          atc_code: "N06BX03", source: "bda", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Pentoxifylline 400mg",          active_substance: "pentoxifylline",                     atc_code: "C04AD03", source: "bda", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "modified-release tablet" },

  // ── MIGRAINE — N02C ───────────────────────────────────────────────────────
  { product_name: "Sumatriptan 50mg",              active_substance: "sumatriptan",                        atc_code: "N02CC01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── MUSCLE RELAXANTS — M03 ────────────────────────────────────────────────
  { product_name: "Baclofen 10mg",                 active_substance: "baclofen",                           atc_code: "M03BX01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Tizanidine 4mg",                active_substance: "tizanidine",                         atc_code: "M03BX02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── UROLOGY — G04 ────────────────────────────────────────────────────────
  { product_name: "Tamsulosin 0.4mg",              active_substance: "tamsulosin",                         atc_code: "G04CA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "modified-release capsule" },
  { product_name: "Finasteride 5mg",               active_substance: "finasteride",                        atc_code: "G04CB01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Solifenacin 5mg",               active_substance: "solifenacin",                        atc_code: "G04BD08", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── BONE — M05 / GOUT — M04 ───────────────────────────────────────────────
  { product_name: "Alendronic Acid 70mg",          active_substance: "alendronic acid",                    atc_code: "M05BA04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Risedronate 35mg",              active_substance: "risedronate sodium",                 atc_code: "M05BA07", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Allopurinol 300mg",             active_substance: "allopurinol",                        atc_code: "M04AA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Colchicine 0.5mg",              active_substance: "colchicine",                         atc_code: "M04AC01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Febuxostat 80mg",               active_substance: "febuxostat",                         atc_code: "M04AA03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── IMMUNOSUPPRESSANTS — L04 ──────────────────────────────────────────────
  { product_name: "Methotrexate 10mg",             active_substance: "methotrexate",                       atc_code: "L04AX03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Hydroxychloroquine 200mg",      active_substance: "hydroxychloroquine",                 atc_code: "P01BA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Azathioprine 50mg",             active_substance: "azathioprine",                       atc_code: "L04AX01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Ciclosporin 100mg",             active_substance: "ciclosporin",                        atc_code: "L04AD01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "capsule" },

  // ── ONCOLOGY HORMONAL — L02 ───────────────────────────────────────────────
  { product_name: "Tamoxifen 20mg",                active_substance: "tamoxifen",                          atc_code: "L02BA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Anastrozole 1mg",               active_substance: "anastrozole",                        atc_code: "L02BG03", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },
  { product_name: "Letrozole 2.5mg",               active_substance: "letrozole",                          atc_code: "L02BG04", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "tablet" },

  // ── VITAMINS / HAEMATINICS — B03 / A11 ───────────────────────────────────
  { product_name: "Ferrous Sulfate 325mg",         active_substance: "ferrous sulfate",                    atc_code: "B03AA07", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Folic Acid 5mg",                active_substance: "folic acid",                         atc_code: "B03BB01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Cyanocobalamin 1000mcg",        active_substance: "cyanocobalamin",                     atc_code: "B03BA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "solution for injection" },
  { product_name: "Vitamin D3 1000 IU",            active_substance: "colecalciferol",                     atc_code: "A11CC05", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },
  { product_name: "Vitamin D3 + Calcium",          active_substance: "colecalciferol / calcium carbonate", atc_code: "A12AX",   source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "tablet" },

  // ── DERMATOLOGY — D ───────────────────────────────────────────────────────
  { product_name: "Betamethasone 0.1% cream",      active_substance: "betamethasone",                      atc_code: "D07AC01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "cream" },
  { product_name: "Mometasone 0.1% cream",         active_substance: "mometasone",                         atc_code: "D07AC13", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "cream" },
  { product_name: "Hydrocortisone 1% cream",       active_substance: "hydrocortisone",                     atc_code: "D07AA02", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "cream" },
  { product_name: "Clotrimazole 1% cream",         active_substance: "clotrimazole",                       atc_code: "D01AC01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "cream" },
  { product_name: "Mupirocin 2% ointment",         active_substance: "mupirocin",                          atc_code: "D06AX09", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "ointment" },
  { product_name: "Tretinoin 0.025% cream",        active_substance: "tretinoin",                          atc_code: "D10AD01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "cream" },

  // ── OPHTHALMOLOGY — S01 ───────────────────────────────────────────────────
  { product_name: "Latanoprost 50mcg/ml",          active_substance: "latanoprost",                        atc_code: "S01EE01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "eye drops" },
  { product_name: "Timolol 5mg/ml eye drops",      active_substance: "timolol",                            atc_code: "S01ED01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "eye drops" },
  { product_name: "Ofloxacin 3mg/ml eye drops",   active_substance: "ofloxacin",                          atc_code: "S01AX11", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "eye drops" },
  { product_name: "Dexamethasone 1mg/ml eye drops",active_substance: "dexamethasone",                      atc_code: "S01BA01", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "eye drops" },

  // ── NASAL — R01 ───────────────────────────────────────────────────────────
  { product_name: "Xylometazoline 0.1% nasal",    active_substance: "xylometazoline",                     atc_code: "R01AA07", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "otc",               dosage_form: "nasal spray" },
  { product_name: "Mometasone 50mcg nasal",        active_substance: "mometasone",                         atc_code: "R01AD09", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "nasal spray" },
  { product_name: "Fluticasone 50mcg nasal",       active_substance: "fluticasone propionate",             atc_code: "R01AD08", source: "ema", authorised_bg: true, authorised_eu: true, prescription_status: "prescription_only", dosage_form: "nasal spray" },
];

// ─────────────────────────────────────────────────────────────────────────────
// seedDrugCatalogue
// Upserts all 182 drugs into public.drug_catalogue in batches of 50.
//
// Requires a unique constraint in Supabase:
//   ALTER TABLE public.drug_catalogue
//     ADD CONSTRAINT drug_catalogue_unique
//     UNIQUE (active_substance, atc_code, dosage_form);
// ─────────────────────────────────────────────────────────────────────────────
export async function seedDrugCatalogue(
  supabaseUrl = process.env.VITE_SUPABASE_URL!,
  supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!,
  batchSize = 50
): Promise<{ inserted: number; errors: string[] }> {
  const supabase = createClient(supabaseUrl, supabaseKey);
  const errors: string[] = [];
  let inserted = 0;

  const batches: DrugEntry[][] = [];
  for (let i = 0; i < DRUG_CATALOGUE.length; i += batchSize) {
    batches.push(DRUG_CATALOGUE.slice(i, i + batchSize));
  }

  // Clear existing records
  await supabase.from("drug_catalogue").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  for (const [idx, batch] of batches.entries()) {
    const { error, count } = await supabase
      .from("drug_catalogue")
      .insert(batch, { count: "exact" });

    if (error) {
      errors.push(`Batch ${idx + 1}: ${error.message}`);
      console.error(`[seedDrugCatalogue] Batch ${idx + 1} error:`, error.message);
    } else {
      inserted += count ?? batch.length;
      console.log(`[seedDrugCatalogue] Batch ${idx + 1}/${batches.length} — ${batch.length} drugs upserted`);
    }
  }

  console.log(`[seedDrugCatalogue] Done. Total: ${inserted} | Errors: ${errors.length}`);
  return { inserted, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — filter the catalogue locally without a DB round-trip
// ─────────────────────────────────────────────────────────────────────────────

/** Return all OTC drugs */
export const getOTCDrugs = () =>
  DRUG_CATALOGUE.filter((d) => d.prescription_status === "otc");

/** Return all drugs for a given ATC prefix, e.g. "J01" for antibiotics */
export const getDrugsByATC = (prefix: string) =>
  DRUG_CATALOGUE.filter((d) => d.atc_code.startsWith(prefix));

/** Fuzzy-search by product name or active substance */
export const searchDrugs = (query: string) => {
  const q = query.toLowerCase();
  return DRUG_CATALOGUE.filter(
    (d) =>
      d.product_name.toLowerCase().includes(q) ||
      d.active_substance.toLowerCase().includes(q)
  );
};

export { DRUG_CATALOGUE };
