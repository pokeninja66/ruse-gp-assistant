
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://urqfeywecqrbfyagbxxk.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVycWZleXdlY3FyYmZ5YWdieHhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzA3MDQ0NCwiZXhwIjoyMDkyNjQ2NDQ0fQ.LRz2dGNpUPmWHaquas7M80UVzF471D7uzGDR7KGJNpc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase
    .from('patient_anamnesis')
    .select('*')
    .limit(5)
  
  if (error) {
    console.error('Error fetching anamnesis:', error)
  } else {
    console.log('Anamnesis data sample:', JSON.stringify(data, null, 2))
  }
  
  const { data: tables, error: tableError } = await supabase
    .from('pg_catalog.pg_tables')
    .select('tablename')
    .eq('schemaname', 'public')
  
  if (tableError) {
    console.error('Error fetching tables:', tableError)
  } else {
    console.log('Public tables:', tables.map(t => t.tablename))
  }
}

check()
