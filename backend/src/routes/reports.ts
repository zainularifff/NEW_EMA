import { Router } from 'express';
import { create, getAll, getCatalog, getOptions, getReport, preview, generate } from '../controllers/reportsController';

const router = Router();

router.get('/catalog', getCatalog);
router.get('/options', getOptions);
router.post('/preview', preview);
router.post('/generate', generate);
router.get('/:id', getReport);
router.get('/', getAll);
router.post('/', create);

export default router;
