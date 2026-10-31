-- Database/schema.sql — run in MySQL Workbench against the Aiven server.
-- Do NOT run CREATE DATABASE. The service already has defaultdb.
USE defaultdb;

-- Named tasks_plus so it does not collide with the class "tasks" table.
CREATE TABLE IF NOT EXISTS tasks_plus (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  description TEXT NULL,
  priority    ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  due_date    DATE NULL,
  completed   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO tasks_plus (title, description, priority, due_date, completed)
SELECT * FROM (
  SELECT 'Finish backend lecture notes' AS title, 'Review MVC and middleware' AS description, 'high' AS priority, DATE_ADD(CURDATE(), INTERVAL 2 DAY) AS due_date, FALSE AS completed UNION ALL
  SELECT 'Submit API assignment', 'Zip project without node_modules', 'high', DATE_ADD(CURDATE(), INTERVAL 5 DAY), FALSE UNION ALL
  SELECT 'Practise SQL joins', NULL, 'medium', DATE_ADD(CURDATE(), INTERVAL 7 DAY), FALSE UNION ALL
  SELECT 'Set up Thunder Client', 'Create a collection for all endpoints', 'low', NULL, TRUE
) AS seed_data
WHERE NOT EXISTS (SELECT 1 FROM tasks_plus LIMIT 1);

SELECT 'Setup complete' AS status;
SELECT * FROM tasks_plus;
