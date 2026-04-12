import { seedLookupTables } from './seed-moves.js';
seedLookupTables().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
