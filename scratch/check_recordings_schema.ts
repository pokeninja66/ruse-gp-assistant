import { getSupabaseAdminClient } from '../src/utils/supabaseAdmin';

async function checkSchema() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'recordings' });
  
  if (error) {
    // If RPC doesn't exist, try a direct query to information_schema
    const { data: cols, error: colError } = await supabase
      .from('recordings')
      .select('*')
      .limit(1);
    
    if (colError) {
      console.error('Error fetching columns:', colError);
    } else {
      console.log('Columns in recordings:', Object.keys(cols[0] || {}));
    }
  } else {
    console.log('Columns in recordings:', data);
  }
}

checkSchema();
