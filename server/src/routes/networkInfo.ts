import { Router } from 'express';
import { getNetworkInfo } from '../services/networkInfo.js';

const router = Router();

router.get('/', (req, res) => {
  const info = getNetworkInfo();
  // Server reports the port it's listening on. The index.ts handler
  // sets it via res.locals.serverPort on the app beforehand.
  const port = Number(req.app.get('serverPort')) || 0;
  res.json({ ...info, port });
});

export default router;
