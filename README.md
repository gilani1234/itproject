# Virtual IT Company (универ)

Проект по ТЗ: **виртуальная IT-компания** (команды + Kanban + спринты + роли студент/преподаватель).

## Стек

- **Client**: React + TypeScript + Vite + Tailwind
- **Server**: Node.js + Express + TypeScript + JWT
- **DB**: PostgreSQL + Prisma

## Запуск (Windows)

### 0) Требования

- Node.js (желательно 18+)
- PostgreSQL **или** Docker Desktop

### 1) Подними PostgreSQL

**Вариант A (если есть Docker):**

```powershell
cd C:\Users\Gilani\virtual-it-company
docker compose up -d
```

Если команда `docker` не находится — Docker Desktop не установлен, используй вариант B.

Это поднимет Postgres на `localhost:5432` с:
- user: `postgres`
- password: `postgres`
- db: `virtual_it_company`

**Вариант B (если Postgres установлен локально):**

1) Установи PostgreSQL для Windows с официального сайта: [postgresql.org/download](https://www.postgresql.org/download/).  
2) Во время установки запомни пароль пользователя `postgres` и порт (обычно `5432`).  
3) Открой **pgAdmin** (ставится вместе с PostgreSQL) и создай базу `virtual_it_company`.

### 2) Настрой переменные окружения

1) Скопируй `server\.env.example` → `server\.env` и заполни:

- `DATABASE_URL`
- `JWT_SECRET`

Пример `DATABASE_URL` для docker-compose:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/virtual_it_company?schema=public"
JWT_SECRET="any-long-random-string"
TEACHER_INVITE_CODE="teacher123" # опционально
```

2) (опционально) Скопируй `client\.env.example` → `client\.env` если хочешь менять URL API.

### 3) Прогони миграции Prisma

```powershell
cd C:\Users\Gilani\virtual-it-company\server
npx prisma migrate dev --name init
```

### 4) Запусти проект

```powershell
cd C:\Users\Gilani\virtual-it-company
npm run dev
```

- Client: `http://localhost:5173`
- Server health: `http://localhost:3001/api/health`

## Как проверить (smoke test)

1) Открой `http://localhost:5173`
2) Зарегистрируйся (создаётся студент)
3) Зайди в **Команды**:
   - создать команду может только **преподаватель**
4) Чтобы создать преподавателя:
   - выставь `TEACHER_INVITE_CODE` в `server\.env`
   - при регистрации отправь `role=TEACHER` и `inviteCode` (позже добавим UI-переключатель)

## Функциональность по ТЗ

- **Пользователи и роли**
  - Регистрация и вход: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
  - Роли: `STUDENT` и `TEACHER` (преподаватель создаётся через `TEACHER_INVITE_CODE`)

- **Команды**
  - Мои команды: `GET /api/teams`
  - Создание команды (только преподаватель): `POST /api/teams`
  - Добавление участника по email: `POST /api/teams/:teamId/members`

- **Спринты (2 недели по умолчанию)**
  - Список спринтов команды: `GET /api/sprints/team/:teamId`
  - Создание спринта (по умолчанию 14 дней): `POST /api/sprints/team/:teamId`
  - Закрытие спринта: `PATCH /api/sprints/:sprintId` (`{ isClosed: true }`)

- **Задачи и Kanban**
  - Статусы: `BACKLOG`, `TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`
  - Список задач команды (и спринта): `GET /api/tasks/team/:teamId?sprintId=...`
  - Создание задачи: `POST /api/tasks`
  - Обновление (в т.ч. смена колонки/drag&drop): `PATCH /api/tasks/:taskId`

- **Комментарии и история задач**
  - Комментарии: `GET /api/comments/task/:taskId`, `POST /api/comments/task/:taskId`
  - История изменений (`TaskHistory`) и вложения (`TaskAttachment`) заложены в БД и могут быть задействованы в UI

- **Командный чат**
  - Сообщения по команде: `GET /api/chat/team/:teamId`
  - Отправка сообщения: `POST /api/chat/team/:teamId`

- **Аналитика и рейтинг**
  - Командная аналитика: `GET /api/analytics/team?teamId=...`
    - totals: общее количество задач и по статусам
    - velocity: сумма поинтов по DONE в каждом спринте
    - topMembers: топ участников по выполненным задачам и поинтам

Фронтенд реализует:
- экраны `Дашборд`, `Команды`, `Kanban` (со спринтами), `Чат`, `Аналитика`, `Профиль`
- drag&drop задач между колонками Kanban
- командный чат и базовую аналитику (velocity, топ участников, статус задач).

