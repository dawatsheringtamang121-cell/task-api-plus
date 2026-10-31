# Task API Plus

Express + MySQL (Aiven) REST API, MVC structure, with a plain HTML/CSS/JS frontend.
Extends the class Task API with description, priority, due date, filters and sorting.
Uses its own table `tasks_plus`, so it will not clash with the class `tasks` table.

## Setup
1. `npm install`
2. Edit `.env` with YOUR Aiven username and password.
3. Run `Database/schema.sql` in Workbench.
4. `node test-db.js` should print "Connected to MySQL".
5. `npm run dev`, then open http://localhost:3000

## Endpoints
| Method | URL | Body / query | Success |
|---|---|---|---|
| GET | /tasks | `?status=pending|done|overdue` `&priority=high` `&search=text` `&sort=due|priority|newest` | 200 array |
| GET | /tasks/stats | | 200 `{total, done, pending, overdue}` |
| GET | /tasks/:id | | 200 / 404 |
| POST | /tasks | `{title, description?, priority?, due_date?, completed?}` | 201 |
| PUT | /tasks/:id | title, priority, completed required; description, due_date optional | 200 / 404 |
| PATCH | /tasks/:id | any of the fields | 200 / 404 |
| DELETE | /tasks/:id | | 204 / 404 |
| DELETE | /tasks/completed | | 200 `{removed: n}` |

## Test checklist
- POST `{}` → 400 `Title is required`
- POST `{"title":"x","priority":"urgent"}` → 400
- POST `{"title":"x","due_date":"tomorrow"}` → 400
- POST `{"title":"'; DROP TABLE tasks_plus; --"}` → 201, table still exists
- GET `/tasks?status=overdue` → only unfinished tasks past their due date
- GET `/tasks/9999` → 404
- PATCH `{"completed":true}` → 200
- DELETE `/tasks/completed` → removes finished tasks
