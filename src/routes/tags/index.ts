import { Router } from 'express';
import { balanceRouter } from './balance';

const router = Router();

router.use('/', balanceRouter);

export default router;
