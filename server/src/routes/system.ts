import { Router } from 'express';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { paths } from '../paths.js';

const router = Router();

router.get('/data-dir', (_req, res) => {
  const parentDir = dirname(paths.dataDir);
  const grandparentDir = dirname(parentDir);
  const possibleSentinels = [
    join(parentDir, 'portable.txt'),
    join(grandparentDir, 'portable.txt'),
  ];
  const portable = possibleSentinels.some(existsSync);

  res.json({
    dataDir: paths.dataDir,
    portable,
  });
});

export default router;
