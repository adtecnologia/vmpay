import { Router } from 'express';
import authorizationsRouter from './authorizations';
import tagsRouter from './tags';

const router = Router();

router.use('/authorizations', authorizationsRouter);
router.use('/tags', tagsRouter);

export default router;
