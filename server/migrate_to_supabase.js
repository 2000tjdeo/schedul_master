const SUPABASE_URL = 'https://ylpwdpkwtondtjnuysah.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlscHdkcGt3dG9uZHRqbnV5c2FoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NDQ5MjcsImV4cCI6MjA4OTUyMDkyN30.5We_nT58XGdFqVeSXGRXY-eetRbTb_f5Eg_SAU3sbfo';

async function migrateTable(localEndpoint, remoteName, cleanFn) {
  try {
    const resLocal = await fetch(`http://localhost:3001/api/${localEndpoint}`);
    if (!resLocal.ok) throw new Error(`Failed: ${resLocal.statusText}`);
    let rows = await resLocal.json();
    if (rows.length === 0) {
      console.log(`⏭ [${localEndpoint}] -> [${remoteName}]: No data`);
      return;
    }
    
    const cleanRows = rows.map(r => {
      let clean = { ...r };
      Object.keys(clean).forEach(k => {
        if (clean[k] === '') clean[k] = null;
      });
      delete clean.id;
      if (cleanFn) clean = cleanFn(clean);
      return clean;
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/${remoteName}`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(cleanRows)
    });

    if (res.ok) console.log(`✅ [${localEndpoint}] -> [${remoteName}]: SUCCESS (${cleanRows.length} rows)`);
    else console.error(`❌ [${localEndpoint}] Failed:`, await res.text());
  } catch (err) {
    console.error(`❌ [${localEndpoint}] error:`, err);
  }
}

async function run() {
  await migrateTable('tasks', 'sm_tasks', (row) => {
    delete row.assignee_name;
    delete row.creator_name;
    delete row.created_by_name;
    delete row.comment_count;
    return row;
  });
  
  await migrateTable('appointments', 'sm_appointments', (row) => {
    delete row.created_by_name;
    delete row.creator_name;
    return row;
  });
}

run();