import { createClient } from '@supabase/supabase-js';

const url = 'https://cybjbonnardearxckoig.supabase.co';
const key = 'sb_publishable_ow4P72Jh-Tz36aeBhalO_A_7AziO04D';

const supabase = createClient(url, key);

async function testConnection() {
  console.log('Testing connection to Supabase...');
  try {
    const { data: districts, error: distError } = await supabase
      .from('districts')
      .select('count');
    
    if (distError) {
      console.log('Districts table status:', distError.message);
    } else {
      console.log('✅ districts table exists! Found:', districts);
    }

    const { data: reports, error: repError } = await supabase
      .from('road_reports')
      .select('count');
    
    if (repError) {
      console.log('Road reports table status:', repError.message);
    } else {
      console.log('✅ road_reports table exists! Found:', reports);
    }
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();
