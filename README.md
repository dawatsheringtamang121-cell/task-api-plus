# Task API Plus

Express + MySQL (Aiven) REST API with an MVC structure and a plain HTML/CSS/JS frontend.
It extends the class Task API with description, priority, due date, filters and sorting.
It uses its own table, `tasks_plus`, so it will not clash with the class `tasks` table.

## Project structure
```
task-api/
├── Database/schema.sql        creates and seeds the tasks_plus table
├── frontend/                  index.html, app.js, style.css (Task Board)
├── src/
│   ├── db.js                  MySQL connection pool (SSL with ca.pem)
│   ├── models/taskmodel.js    SQL queries only
│   ├── controllers/taskcontroller.js   validation and responses
│   └── routes/taskrouters.js  URL to controller mapping
├── server.js                  entry point
├── ca.pem                     Aiven CA certificate
├── .env.example               template for your own .env
└── package.json
```

## Setup
1. Run `npm install`.
2. Copy `.env.example` to `.env` and fill in YOUR Aiven host, port, username and password. Never commit `.env`.
3. Run `Database/schema.sql` in MySQL Workbench against your Aiven service.
4. Run `npm run dev`, then open http://localhost:3000

## Endpoints
| Method | URL | Body / query | Success |
|---|---|---|---|
| GET | /tasks | Optional query: `status` (pending, done or overdue), `priority` (low, medium or high), `search` (text), `sort` (due, priority or newest) | 200 array |
| GET | /tasks/stats | none | 200 `{total, done, pending, overdue}` |
| GET | /tasks/:id | none | 200 or 404 |
| POST | /tasks | `{title, description?, priority?, due_date?, completed?}` | 201 |
| PUT | /tasks/:id | title, priority and completed required; description and due_date optional | 200 or 404 |
| PATCH | /tasks/:id | any of the fields | 200 or 404 |
| DELETE | /tasks/:id | none | 204 or 404 |
| DELETE | /tasks/completed | none | 200 `{removed: n}` |

Validation errors return 400, for example `{ "error": "Title is required" }`.

## Test checklist
- POST `{}` returns 400 `Title is required`
- POST `{"title":"x","priority":"urgent"}` returns 400
- POST `{"title":"x","due_date":"tomorrow"}` returns 400
- POST `{"title":"'; DROP TABLE tasks_plus; --"}` returns 201 and the table still exists
- GET `/tasks?status=overdue` returns only unfinished tasks past their due date
- GET `/tasks/9999` returns 404
- PATCH `{"completed":true}` returns 200
- DELETE `/tasks/completed` removes finished tasks

## Security notes
- All SQL uses `?` placeholders, so user input is never inserted directly into queries.
- Secrets live in `.env`, which is listed in `.gitignore`.