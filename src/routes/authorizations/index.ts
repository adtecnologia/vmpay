import { Router } from 'express';
import { authorizeRouter } from './authorize';
import { rollbackRouter } from './rollback';

const router = Router();

router.use('/', authorizeRouter);
router.use('/', rollbackRouter);

export default router;
