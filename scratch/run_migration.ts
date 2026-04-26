import { getSupabaseAdminClient } from '../src/utils/supabaseAdmin';
import * as fs from 'fs';

async function runMigration() {
  const sql = fs.readFileSync('scripts/fix_clinical_rls.sql', 'utf8');
  const supabase = getSupabaseAdminClient();
  
  // Try to run SQL via a custom RPC if it exists
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.error('Error running migration via RPC:', error);
    console.log('Please run the scripts/fix_clinical_rls.sql manually in the Supabase SQL Editor.');
  } else {
    console.log('Migration successful!');
  }
}

runMigration();
