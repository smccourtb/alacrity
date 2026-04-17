import { Router } from 'express';
import { getNetworkInfo } from '../services/networkInfo.js';

const router = Router();

router.get('/', (req, res) => {
  const info = getNetworkInfo();
  const port = req.app.get('serverPort') as number;
  res.json({ ...info, port });
});

export default router;
