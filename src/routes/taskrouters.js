// src/routes/taskrouters.js — maps method + URL to a controller function
const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskcontroller');

router.get('/', taskController.getAllTasks);
router.get('/stats', taskController.getStats);                 // before '/:id'
router.delete('/completed', taskController.clearCompleted);    // before '/:id'
router.post('/', taskController.createTask);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.patch('/:id', taskController.patchTask);
router.delete('/:id', taskController.deleteTask);

module.exports = router;
