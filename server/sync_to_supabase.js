const SUPABASE_URL = 'https://ylpwdpkwtondtjnuysah.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscHdkcGt3dG9uZHRqbnV5c2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDQ5MjcsImV4cCI6MjA4OTUyMDkyN30.5We_nT58XGdFqVeSXGRXY-eetRbTb_f5Eg_SAU3sbfo';

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

async function syncTable(table, remoteTable) {
  try {
    const resLocal = await fetch(`http://localhost:3001/api/${table}`);
    if (!resLocal.ok) throw new Error(`Local error: ${resLocal.statusText}`);
    const localData = await resLocal.json();
    
    const cleanData = localData.map(r => {
      let clean = { ...r };
      delete clean.id;
      Object.keys(clean).forEach(k => {
        if (clean[k] === '') clean[k] = null;
      });
      return clean;
    });
    
    const res = await postSupabase(remoteTable, cleanData);
    if (res.ok) {
      console.log(`✅ [${table}] → [${remoteTable}]: ${cleanData.length} rows synced`);
    } else {
      const err = await res.text();
      console.log(`⚠️ [${table}] → [${remoteTable}]: ${err.substring(0, 100)}`);
    }
  } catch (err) {
    console.error(`❌ [${table}]:`, err.message);
  }
}

console.log('🔄 Local → Supabase Sync\n');

// Users first
syncTable('users', 'sm_users');

// Then tasks and appointments
syncTable('tasks', 'sm_tasks');
syncTable('appointments', 'sm_appointments');