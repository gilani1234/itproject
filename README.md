

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

