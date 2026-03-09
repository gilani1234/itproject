 # 🚀 Виртуальная IT-компания — Быстрый старт

## Что реализовано

### ✅ Обязательные функции
- **Аутентификация**: регистрация, вход, JWT-токены, роли (студент/преподаватель)
- **Команды**: создание команд (только учитель), добавление участников
- **Kanban-доска**: 5 колонок (Backlog → Done), drag-and-drop, спринты, создание задач
- **Задачи**: название, описание, статус, points, deadline, assignee, comments, история изменений
- **Спринты**: создание спринтов (2 недели), статус (открыт/закрыт)
- **Рейтинг**: оценка студентов за спринты (баллы + комментарий), История оценок
- **Дашборд**: сводка по задачам, спринтам, баллам

### ✨ Реализованные страницы
1. **Dashboard** — статистика: баллы за неделю, задачи в спринте, рейтинг команды
2. **Teams** — управление командами и оценка студентов (учитель видит спринты и может оценивать)
3. **Kanban** — доска с drag-and-drop, создание задач и спринтов
4. **Chat** — сообщения команды (командный чат)
5. **Analytics** — velocity, топ участников, статистика задач
6. **Profile** — просмотр своего рейтинга и истории оценок

### 🛠️ Стек технологий
- **Frontend**: React 19 + TypeScript + Tailwind CSS + React Router
- **Backend**: Express + Node.js + TypeScript
- **БД**: PostgreSQL + Prisma ORM
- **Auth**: JWT токены
- **API**: REST с Zod валидацией

---

## 🚀 Установка и запуск

### 1. Инициализация БД
```bash
cd server
npm install
npm run prisma:migrate
npm run prisma:generate
```

### 2. Создание .env (если её нет)
```
PORT=3001
CORS_ORIGIN=http://localhost:5173
DATABASE_URL="postgresql://postgres:admin@localhost:5432/virtual_it_company?schema=public"
JWT_SECRET="dev-secret-change-me"
TEACHER_INVITE_CODE="teacher123"
```

### 3. Запуск в dev режиме
```bash
# из корня проекта
npm run dev

# или отдельно:
# npm --prefix server run dev   (Терминал 1)
# npm --prefix client run dev   (Терминал 2)
```

Фронтенд: http://localhost:5173
Бэкенд: http://localhost:3001

---

## 📋 API Endpoints

### Auth
- `POST /api/auth/register` — регистрация
- `POST /api/auth/login` — вход
- `GET /api/auth/me` — текущий пользователь

### Teams
- `GET /api/teams` — мои команды
- `POST /api/teams` — создать команду
- `POST /api/teams/:teamId/members` — добавить участника

### Tasks
- `GET /api/tasks/team/:teamId` — задачи команды
- `POST /api/tasks` — создать задачу
- `PATCH /api/tasks/:taskId` — обновить задачу

### Sprints
- `GET /api/sprints/team/:teamId` — спринты команды
- `POST /api/sprints/team/:teamId` — создать спринт

### Ratings
- `GET /api/ratings/user/:userId` — рейтинг студента
- `GET /api/ratings/sprint/:sprintId` — оценки за спринт
- `POST /api/ratings` — добавить оценку (учитель)
- `DELETE /api/ratings/:ratingId` — удалить оценку (учитель)

### Chat
- `GET /api/chat/team/:teamId` — сообщения чата
- `POST /api/chat/team/:teamId` — отправить сообщение

### Comments
- `GET /api/comments/task/:taskId` — комментарии задачи
- `POST /api/comments/task/:taskId` — добавить комментарий

### Analytics
- `GET /api/analytics/team?teamId=...` — аналитика команды

---

## 🧪 Тестирование

### Создать учетные записи
1. **Студент**: 
   - Email: `student@example.com`, пароль: `password123`
2. **Учитель** (код приглашения: `teacher123`):
   - Email: `teacher@example.com`, пароль: `password123`

### Сценарий использования
1. Логинитесь как учитель → создайте команду
2. Добавьте студентов в команду (по email)
3. Логинитесь как студент → выберите команду → откройте Kanban
4. Создавайте задачи, переносите их между колонками
5. В Teams (учитель) → выберите команду → спринт → оценивайте студентов
6. Студент видит свой рейтинг в Profile

---

## 📦 Структура проекта

```
virtual-it-company/
├── server/                      # Express backend
│   ├── prisma/
│   │   ├── schema.prisma       # Модели БД
│   │   └── migrations/         # Миграции SQL
│   ├── src/
│   │   ├── routes/             # API endpoints
│   │   ├── middleware/         # Auth, errors
│   │   ├── lib/                # Utilities
│   │   └── server.ts           # Entry point
│   └── package.json
│
├── client/                      # React frontend
│   ├── src/
│   │   ├── pages/              # Page components
│   │   ├── components/         # UI components
│   │   ├── api/                # API calls
│   │   ├── lib/                # Utilities, auth
│   │   ├── App.tsx             # Routing
│   │   └── main.tsx            # Entry
│   └── package.json
│
└── package.json                # Root scripts
```

---

## 🎯 Возможные дальнейшие улучшения

- [ ] Real-time уведомления (WebSocket)
- [ ] Загрузка файлов к задачам
- [ ] Ретроспектива спринта (peer-review форма)
- [ ] Экспорт данных (CSV, PDF)
- [ ] Темизация (dark/light mode toggle)
- [ ] Мобильное приложение
- [ ] Интеграция с GitHub/GitLab
- [ ] Уровни и достижения (геймификация)

---

## ⚠️ Важно перед деплоем

1. Изменить `JWT_SECRET` на сложный пароль
2. Изменить `DATABASE_URL` на production БД
3. Установить стоимость bcrypt: `const SALT_ROUNDS = 10;`
4. Включить HTTPS
5. Настроить CORS для production домена
6. Создать резервные копии БД

---

**Дата последнего обновления:** 7 марта 2026 г.
