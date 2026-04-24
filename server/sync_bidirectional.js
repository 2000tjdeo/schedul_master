const SUPABASE_URL = 'https://ylpwdpkwtondtjnuysah.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscHdkcGt3dG9uZHRqbnV5c2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDQ5MjcsImV4cCI6MjA4OTUyMDkyN30.5We_nT58XGdFqVeSXGRXY-eetRbTb_f5Eg_SAU3sbfo';

const localApi = 'http://localhost:3001/api';

async function fetchLocal(endpoint) {
  const res = await fetch(`${localApi}/${endpoint}`);
  return res.ok ? await res.json() : [];
}

async function postLocal(endpoint, data) {
  const res = await fetch(`${localApi}/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res;
}

async function fetchSupabase(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return res.ok ? await res.json() : [];
}

async function postSupabase(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(data)
  });
  return res;
}

function cleanRow(r) {
  let clean = { ...r };
  delete clean.id;
  Object.keys(clean).forEach(k => {
    if (clean[k] === '') clean[k] = null;
  });
  return clean;
}

async function syncLocalToSupabase(localEndpoint, remoteTable) {
  try {
    const localData = await fetchLocal(localEndpoint);
    if (!localData.length) {
      console.log(`⏭ [${localEndpoint}] → [${remoteTable}]: No data`);
      return;
    }
    
    const cleanData = localData.map(cleanRow);
    const res = await postSupabase(remoteTable, cleanData);
    
    if (res.ok) {
      console.log(`✅ [${localEndpoint}] → [${remoteTable}]: ${cleanData.length} rows`);
    } else {
      const err = await res.text();
      console.log(`⚠️ [${localEndpoint}] → [${remoteTable}]: ${err.substring(0, 80)}`);
    }
  } catch (err) {
    console.error(`❌ [${localEndpoint}]:`, err.message);
  }
}

async function syncSupabaseToLocal(localEndpoint, remoteTable) {
  try {
    const remoteData = await fetchSupabase(remoteTable);
    if (!remoteData.length) {
      console.log(`⏭ [${remoteTable}] → [${localEndpoint}]: No data`);
      return;
    }
    
    const cleanData = remoteData.map(cleanRow);
    const res = await postLocal(localEndpoint, cleanData);
    
    if (res.ok) {
      console.log(`✅ [${remoteTable}] → [${localEndpoint}]: ${cleanData.length} rows`);
    } else {
      const err = await res.text();
      console.log(`⚠️ [${remoteTable}] → [${localEndpoint}]: ${err.substring(0, 80)}`);
    }
  } catch (err) {
    console.error(`❌ [${localEndpoint}]:`, err.message);
  }
}

async function run() {
  const mode = process.argv[2] || 'push';
  
  console.log(`\n🔄 Sync Mode: ${mode.toUpperCase()}\n`);
  
  if (mode === 'push' || mode === 'local→supabase') {
    console.log('📤 Local → Supabase\n');
    await syncLocalToSupabase('users', 'sm_users');
    await syncLocalToSupabase('tasks', 'sm_tasks');
    await syncLocalToSupabase('appointments', 'sm_appointments');
  } else if (mode === 'pull' || mode === 'supabase→local') {
    console.log('📥 Supabase → Local\n');
    await syncSupabaseToLocal('users', 'sm_users');
    await syncSupabaseToLocal('tasks', 'sm_tasks');
    await syncSupabaseToLocal('appointments', 'sm_appointments');
  } else if (mode === 'both') {
    console.log('🔄 Bidirectional Sync\n');
    console.log('📤 Step 1: Local → Supabase\n');
    await syncLocalToSupabase('users', 'sm_users');
    await syncLocalToSupabase('tasks', 'sm_tasks');
    await syncLocalToSupabase('appointments', 'sm_appointments');
    console.log('\n📥 Step 2: Supabase → Local\n');
    await syncSupabaseToLocal('users', 'sm_users');
    await syncSupabaseToLocal('tasks', 'sm_tasks');
    await syncSupabaseToLocal('appointments', 'sm_appointments');
  } else {
    console.log('Usage: node sync_bidirectional.js [push|pull|both]');
    console.log('  push   - Local → Supabase');
    console.log('  pull   - Supabase → Local');
    console.log('  both   - Bidirectional');
  }
}

run();