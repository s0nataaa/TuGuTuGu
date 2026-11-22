// Gabungkan migrasi + seed jadi satu file (supabase/setup.sql) supaya setup cukup
// 1x paste di SQL Editor. Jalankan ulang tiap ada perubahan SQL:  npm run db:bundle
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'supabase';
const files = [
  ...readdirSync(join(dir, 'migrations')).filter((f) => f.endsWith('.sql')).sort().map((f) => join(dir, 'migrations', f)),
  join(dir, 'seed.sql'),
];
const out =
  '-- GENERATED oleh scripts/bundle-sql.mjs -- jangan edit manual, edit file di supabase/migrations lalu `npm run db:bundle`.\n\n' +
  files.map((f) => `-- >>>>>>>>>> ${f}\n${readFileSync(f, 'utf8')}`).join('\n\n');
writeFileSync(join(dir, 'setup.sql'), out);
console.log(`supabase/setup.sql dibuat dari ${files.length} file`);
