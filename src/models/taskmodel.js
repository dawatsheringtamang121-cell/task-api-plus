// src/models/taskmodel.js — database queries only (no req, res, status codes)
const pool = require('../db');

const EDITABLE = ['title', 'description', 'priority', 'due_date', 'completed'];

const taskModel = {
  // Filters: { status: 'done'|'pending'|'overdue', priority, search, sort }
  findAll: async ({ status, priority, search, sort } = {}) => {
    const where = [];
    const values = [];

    if (status === 'done') where.push('completed = TRUE');
    if (status === 'pending') where.push('completed = FALSE');
    if (status === 'overdue') where.push('completed = FALSE AND due_date < CURDATE()');
    if (priority) { where.push('priority = ?'); values.push(priority); }
    if (search) { where.push('title LIKE ?'); values.push(`%${search}%`); }

    // sort is chosen from a fixed list — never inserted straight from the client
    const orderBy = {
      due: 'due_date IS NULL, due_date ASC',
      priority: "FIELD(priority, 'high', 'medium', 'low')",
      newest: 'created_at DESC, id DESC',
    }[sort] || 'created_at DESC, id DESC';

    const sql =
      'SELECT * FROM tasks_plus' +
      (where.length ? ' WHERE ' + where.join(' AND ') : '') +
      ' ORDER BY ' + orderBy;
    const [rows] = await pool.query(sql, values);
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.query('SELECT * FROM tasks_plus WHERE id = ?', [id]);
    return rows[0] || null;
  },

  create: async ({ title, description = null, priority = 'medium', due_date = null, completed = false }) => {
    const [result] = await pool.query(
      'INSERT INTO tasks_plus (title, description, priority, due_date, completed) VALUES (?, ?, ?, ?, ?)',
      [title, description, priority, due_date, completed]
    );
    return taskModel.findById(result.insertId);
  },

  // PUT — replace every editable field
  update: async (id, { title, description, priority, due_date, completed }) => {
    const [result] = await pool.query(
      'UPDATE tasks_plus SET title = ?, description = ?, priority = ?, due_date = ?, completed = ? WHERE id = ?',
      [title, description, priority, due_date, completed, id]
    );
    if (result.affectedRows === 0) return null;
    return taskModel.findById(id);
  },

  // PATCH — change only the fields provided
  partialUpdate: async (id, fields) => {
    const updates = [];
    const values = [];
    EDITABLE.forEach((col) => {
      if (fields[col] !== undefined) {
        updates.push(`${col} = ?`); // column names come from our fixed list
        values.push(fields[col]);
      }
    });
    if (updates.length === 0) return taskModel.findById(id);
    values.push(id);
    const [result] = await pool.query(
      `UPDATE tasks_plus SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
    if (result.affectedRows === 0) return null;
    return taskModel.findById(id);
  },

  remove: async (id) => {
    const [result] = await pool.query('DELETE FROM tasks_plus WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  // Delete every completed task, returns how many were removed
  clearCompleted: async () => {
    const [result] = await pool.query('DELETE FROM tasks_plus WHERE completed = TRUE');
    return result.affectedRows;
  },

  stats: async () => {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(completed = TRUE), 0) AS done,
              COALESCE(SUM(completed = FALSE), 0) AS pending,
              COALESCE(SUM(completed = FALSE AND due_date < CURDATE()), 0) AS overdue
       FROM tasks_plus`
    );
    return rows[0];
  },
};

module.exports = taskModel;
