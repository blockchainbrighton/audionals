import { Router } from 'express';
import { ProjectController } from '../controllers/projectController';

const router = Router();

router.get('/', ProjectController.getAll);
router.get('/:id', ProjectController.getOne);
router.post('/', ProjectController.create);
router.put('/:id', ProjectController.update);
router.delete('/:id', ProjectController.delete);

export default router;
