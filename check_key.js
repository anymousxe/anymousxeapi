
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkKey(key) {
    console.log('Checking for key:', key);
    const { data, error } = await supabase
        .from('user_api_keys')
        .select('*')
        .eq('key', key);

    if (error) {
        console.error('Error fetching key:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('Key found:', JSON.stringify(data[0], null, 2));
    } else {
        console.log('Key NOT found in user_api_keys table.');
    }
}

const keyToTest = process.argv[2] || 'any-5u5dfjra19sn';
checkKey(keyToTest);
