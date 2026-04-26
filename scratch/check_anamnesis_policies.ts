import { getSupabaseAdminClient } from '../src/utils/supabaseAdmin';

async function checkPolicies() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'patient_anamnesis' });
  
  if (error) {
    // Try querying pg_policies
    const { data: policies, error: polError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'patient_anamnesis');
    
    if (polError) {
      // Try raw SQL if possible via a known function or just assume we can't
      console.error('Error fetching policies:', polError);
    } else {
      console.log('Policies for patient_anamnesis:', policies);
    }
  } else {
    console.log('Policies for patient_anamnesis:', data);
  }
}

checkPolicies();
