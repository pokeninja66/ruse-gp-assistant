import { getSupabaseAdminClient } from '../src/utils/supabaseAdmin';

async function checkTable() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.from('patient_anamnesis').select('*').limit(1);
  if (error) {
    console.error('Error fetching patient_anamnesis:', error);
  } else {
    console.log('Success fetching patient_anamnesis, row count:', data.length);
  }
}

checkTable();
