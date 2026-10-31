// src/controllers/taskcontroller.js — HTTP layer: validate, call model, respond
const taskModel = require('../models/taskmodel');

const PRIORITIES = ['low', 'medium', 'high'];
const isBlank = (v) => typeof v !== 'string' || v.trim() === '';
const isValidId = (id) => /^\d+$/.test(String(id));
const isValidDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

// Returns an error message string, or null if every provided field is valid
function checkFields({ title, description, priority, due_date, completed }, { requireTitle }) {
  if (requireTitle && isBlank(title)) return 'Title is required';
  if (title !== undefined && isBlank(title)) return 'Title cannot be empty';
  if (title !== undefined && title.trim().length > 255) return 'Title must be 255 characters or fewer';
  if (description !== undefined && description !== null && typeof description !== 'string') return 'description must be text';
  if (priority !== undefined && !PRIORITIES.includes(priority)) return 'priority must be low, medium or high';
  if (due_date !== undefined && due_date !== null && !isValidDate(due_date)) return 'due_date must look like YYYY-MM-DD';
  if (completed !== undefined && typeof completed !== 'boolean') return 'completed must be true or false';
  return null;
}

// Trim strings and turn empty description into null
function clean(body) {
  const out = { ...body };
  if (typeof out.title === 'string') out.title = out.title.trim();
  if (typeof out.description === 'string') out.description = out.description.trim() || null;
  return out;
}

const taskController = {
  getAllTasks: async (req, res, next) => {
    try {
      const { status, priority, search, sort } = req.query;
      if (status && !['done', 'pending', 'overdue'].includes(status)) {
        return res.status(400).json({ error: 'status must be done, pending or overdue' });
      }
      if (priority && !PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: 'priority must be low, medium or high' });
      }
      res.json(await taskModel.findAll({ status, priority, search, sort }));
    } catch (err) { next(err); }
  },

  getStats: async (req, res, next) => {
    try { res.json(await taskModel.stats()); } catch (err) { next(err); }
  },

  getTaskById: async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'id must be a positive whole number' });
      const task = await taskModel.findById(req.params.id);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) { next(err); }
  },

  createTask: async (req, res, next) => {
    try {
      const body = req.body || {};
      const problem = checkFields(body, { requireTitle: true });
      if (problem) return res.status(400).json({ error: problem });
      res.status(201).json(await taskModel.create(clean(body)));
    } catch (err) { next(err); }
  },

  updateTask: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!isValidId(id)) return res.status(400).json({ error: 'id must be a positive whole number' });
      const body = req.body || {};
      // PUT replaces everything, so every field must be present
      for (const key of ['title', 'priority', 'completed']) {
        if (body[key] === undefined) return res.status(400).json({ error: `${key} is required for PUT` });
      }
      const problem = checkFields(body, { requireTitle: true });
      if (problem) return res.status(400).json({ error: problem });
      const c = clean(body);
      const task = await taskModel.update(id, {
        title: c.title,
        description: c.description ?? null,
        priority: c.priority,
        due_date: c.due_date ?? null,
        completed: c.completed,
      });
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) { next(err); }
  },

  patchTask: async (req, res, next) => {
    try {
      const { id } = req.params;
      if (!isValidId(id)) return res.status(400).json({ error: 'id must be a positive whole number' });
      const body = req.body || {};
      const given = ['title', 'description', 'priority', 'due_date', 'completed'].filter((k) => body[k] !== undefined);
      if (given.length === 0) return res.status(400).json({ error: 'Provide at least one field to update' });
      const problem = checkFields(body, { requireTitle: false });
      if (problem) return res.status(400).json({ error: problem });
      const c = clean(body);
      const fields = {};
      given.forEach((k) => { fields[k] = c[k]; });
      const task = await taskModel.partialUpdate(id, fields);
      if (!task) return res.status(404).json({ error: 'Task not found' });
      res.json(task);
    } catch (err) { next(err); }
  },

  deleteTask: async (req, res, next) => {
    try {
      if (!isValidId(req.params.id)) return res.status(400).json({ error: 'id must be a positive whole number' });
      const deleted = await taskModel.remove(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Task not found' });
      res.status(204).send();
    } catch (err) { next(err); }
  },

  clearCompleted: async (req, res, next) => {
    try {
      const removed = await taskModel.clearCompleted();
      res.json({ removed });
    } catch (err) { next(err); }
  },
};

module.exports = taskController;
