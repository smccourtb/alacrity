import { parseArgs } from 'util';
import { initPaths } from './paths.js';
import { emitEvent, setLogJson } from './events.js';

// ── CLI argument parsing ────────────────────────────────────────
const { values: args } = parseArgs({
  options: {
    port: { type: 'string', default: '3001' },
    'data-dir': { type: 'string', default: process.cwd() },
    'resources-dir': { type: 'string', default: process.cwd() },
    'log-format': { type: 'string', default: 'text' },
  },
});

const PORT = args.port === 'auto' ? 0 : parseInt(args.port!, 10);
const LOG_JSON = args['log-format'] === 'json';

setLogJson(LOG_JSON);

// Initialize paths BEFORE any module that reads them (db.ts, routes, services)
initPaths({ dataDir: args['data-dir'], resourcesDir: args['resources-dir'] });

// Initialize config service — creates config.json with defaults if missing.
// Loaded dynamically so it only evaluates after initPaths has set the data dir.
const { initConfig } = await import('./services/config.js');
initConfig();

// ── Dynamic imports (must come after initPaths) ─────────────────
const { default: db } = await import('./db.js');
const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { runMigrations } = await import('./migrate.js');
const { default: speciesRouter } = await import('./routes/species.js');
const { default: pokemonRouter } = await import('./routes/pokemon.js');
const { default: savesRouter } = await import('./routes/saves.js');
const { default: huntsRouter } = await import('./routes/hunts.js');
const { default: syncRouter } = await import('./routes/sync.js');
const { default: encountersRouter } = await import('./routes/encounters.js');
const { default: movesRouter } = await import('./routes/moves.js');
const { default: guideRouter } = await import('./routes/guide.js');
const { default: playthroughsRouter } = await import('./routes/playthroughs.js');
const { default: specimensRouter } = await import('./routes/specimens.js');
const { default: collectionRouter } = await import('./routes/collection.js');
const { default: referenceRouter } = await import('./routes/reference.js');
const { default: legalityRouter } = await import('./routes/legality.js');
const { default: launcherRouter } = await import('./routes/launcher.js');
const { default: streamRouter } = await import('./routes/stream.js');
const { default: flagRoutes } = await import('./routes/flags.js');
const { default: timelineRouter } = await import('./routes/timeline.js');
const { seedShinyAvailability } = await import('./shiny-availability.js');
const { seedGuide } = await import('./seeds/seedGuide.js');
const { seedRibbons, seedMarks, seedBalls, seedForms, seedShinyMethods, seedLegality } = await import('./seed-reference.js');
const { seedLookupTables } = await import('./seed-moves.js');
const { runCompletionScan } = await import('./services/completionPipeline.js');
const { syncSaves } = await import('./services/syncSaves.js');
const { rebuildSnapshots } = await import('./services/saveSnapshot.js');
const { startRelay, stopRelay, onRelayInput } = await import('./services/mediamtxManager.js');
const { killAll: killAllProcesses, registeredCount } = await import('./services/processRegistry.js');
const { getSession } = await import('./services/streamSession.js');

// ── App setup ───────────────────────────────────────────────────
const app = express();

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || origin.includes('localhost') || origin.includes('tauri.localhost')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
}));
app.use(express.json());

runMigrations(db);

// Disable FK checks during seeding — species table populated async from PokeAPI
db.exec('PRAGMA foreign_keys = OFF');
seedShinyAvailability();
seedGuide();
seedRibbons(db);
seedMarks(db);
seedBalls(db);
seedShinyMethods(db);
seedLegality(db);
db.exec('PRAGMA foreign_keys = ON');
seedForms(db).catch(err => console.error('seedForms failed:', err));
// Ensure move/ability lookup tables are populated before syncing saves
db.exec('CREATE TABLE IF NOT EXISTS move_names (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
db.exec('CREATE TABLE IF NOT EXISTS ability_names (id INTEGER PRIMARY KEY, name TEXT NOT NULL)');
seedLookupTables()
  .then(() => {
    runCompletionScan();
    syncSaves();
    rebuildSnapshots();
  })
  .catch(err => {
    console.error('seedLookupTables failed:', err);
    // Still run sync even if seed fails — world state extraction doesn't need these tables.
    // Skip rebuildSnapshots: without move/ability names it would cache "move-###" placeholders.
    runCompletionScan();
    syncSaves();
  });

// Start Pion relay for WebRTC streaming
startRelay();

// Wire up DataChannel input: relay prints JSON to stdout → we route to session
onRelayInput((sessionId, inputJson) => {
  const session = getSession(sessionId);
  if (session) {
    try {
      const msg = JSON.parse(inputJson);
      session.handleInputMessage(msg);
    } catch {
      // Ignore malformed input
    }
  }
});

app.use('/api/species', speciesRouter);
app.use('/api/pokemon', pokemonRouter);
app.use('/api/saves', savesRouter);
app.use('/api/hunts', huntsRouter);
app.use('/api/3ds', syncRouter);
app.use('/api/encounters', encountersRouter);
app.use('/api/moves', movesRouter);
app.use('/api/guide', guideRouter);
app.use('/api/playthroughs', playthroughsRouter);
app.use('/api/specimens', specimensRouter);
app.use('/api/collection', collectionRouter);
app.use('/api/reference', referenceRouter);
app.use('/api/legality', legalityRouter);
app.use('/api/launcher', launcherRouter);
app.use('/api/stream', streamRouter);
app.use('/api/flags', flagRoutes);
app.use('/api/timeline', timelineRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/client-info', (req, res) => {
  // Check X-Forwarded-For first (set by reverse proxy / Vite dev proxy)
  const forwarded = req.headers['x-forwarded-for'];
  const clientIp = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0])
    : req.socket.remoteAddress || '';
  const isLocal = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(clientIp);
  res.json({ isLocal });
});

// ── Periodic status emission for active hunts ───────────────────
setInterval(() => {
  const stats = db.prepare(`
    SELECT COUNT(*) as active, COALESCE(SUM(total_attempts), 0) as total_attempts
    FROM hunts WHERE status = 'running'
  `).get() as any;
  if (stats.active > 0) {
    emitEvent({ event: 'status', active_hunts: stats.active, total_attempts: stats.total_attempts });
  }
}, 5000);

// ── Start server ────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  const addr = server.address();
  const actualPort = typeof addr === 'object' && addr ? addr.port : PORT;
  if (LOG_JSON) {
    emitEvent({ event: 'ready', port: actualPort });
  } else {
    console.log(`Pokemon server running on http://localhost:${actualPort}`);
  }
});

// Graceful shutdown — kill all child processes (emulators, FFmpeg, Xvfb, relay)
let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return; // prevent double-shutdown
  shuttingDown = true;
  const count = registeredCount();
  console.log(`\nShutting down... (${count} child processes to clean up)`);
  stopRelay();
  await killAllProcesses(5000);
  process.exit(0);
}

process.on('SIGTERM', () => { shutdown(); });
process.on('SIGINT', () => { shutdown(); });
