# CVForge
 
CVForge — веб-сервіс для створення власного резюме за допомогою готових шаблонів. По суті це конструктор резюме: користувач заповнює свої дані (досвід, освіту, навички тощо), обирає шаблон і отримує готовий, акуратно оформлений документ, який можна завантажити у форматі PDF.
 
## Стек технологій
 
- **Backend:** Django REST Framework
- **База даних:** PostgreSQL
- **Генерація PDF:** WeasyPrint
- **Frontend:** HTML + CSS + JavaScript
## Структура проєкту
 
```
cvforge/
├── backend/     # Django REST Framework застосунок
└── frontend/    # HTML/CSS/JS клієнтська частина
```
 
## Встановлення
 
### 1. Клонування репозиторію
 
```bash
git clone https://github.com/lopez1k/cvforge.git
cd cvforge
```
 
### 2. Backend (Django)
 
Перейдіть у папку `backend`:
 
```bash
cd backend
```
 
Створіть та активуйте віртуальне середовище:
 
```bash
python -m venv venv
source venv/bin/activate      # Linux / macOS
venv\Scripts\activate         # Windows
```
 
Встановіть залежності:
 
```bash
pip install -r requirements.txt
```
 
### 3. Налаштування бази даних PostgreSQL
 
Створіть базу даних та користувача в PostgreSQL:
 
```sql
CREATE DATABASE db_name;
CREATE USER db_user WITH PASSWORD 'db_pass';
GRANT ALL PRIVILEGES ON DATABASE db_name TO db_user;
```
 
### 4. Файл оточення `.env`
 
У папці `backend` створіть файл `.env` на основі `.env.example`:
 
```bash
cp .env.example .env
```
 
**.env.example**
 
```dotenv
SECRET_KEY = your_key
DB_NAME = db_name
DB_USER = db_user
DB_PASSWORD = db_pass
DB_HOST = db_host
MEDIA_ROOT = your_media_root
DEBUG=True
ALLOWED_HOSTS=your_domain
```
 
Опис змінних:
 
| Змінна | Опис |
|---|---|
| `SECRET_KEY` | Секретний ключ Django (обов'язково змінити на власний перед деплоєм) |
| `DB_NAME` | Назва бази даних PostgreSQL |
| `DB_USER` | Користувач бази даних |
| `DB_PASSWORD` | Пароль користувача бази даних |
| `DB_HOST` | Хост бази даних (наприклад, `localhost`) |
| `MEDIA_ROOT` | Шлях до директорії для збереження медіафайлів (аватарки, завантаження тощо) |
| `DEBUG` | Режим налагодження Django (`True`/`False`) |
| `ALLOWED_HOSTS` | Список дозволених хостів/доменів |
 
### 5. Міграції та запуск сервера
 
```bash
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```
 
Backend буде доступний за адресою `http://127.0.0.1:8000`.
 
### 6. Frontend
 
Перейдіть у папку `frontend` та відкрийте проєкт (наприклад, через Live Server або будь-який статичний веб-сервер):
 
```bash
cd ../frontend
```
 
Переконайтесь, що адреса backend API у frontend-коді відповідає адресі вашого Django-сервера.
 
## API Endpoints
 
Усі endpoints, окрім автентифікації, потребують JWT-токен (`Authorization: Bearer <access_token>`).
 
### Автентифікація
 
| Метод | Endpoint | Опис |
|---|---|---|
| `POST` | `/api/token/` | Отримати пару токенів (access + refresh) за логіном і паролем |
| `POST` | `/api/token/refresh/` | Оновити access-токен за допомогою refresh-токена |
 
### Резюме
 
| Метод | Endpoint | Опис |
|---|---|---|
| `GET` | `/api/resumes/` | Отримати список усіх резюме поточного користувача |
| `POST` | `/api/resumes/` | Створити нове резюме |
| `GET` | `/api/resumes/<id>/` | Отримати конкретне резюме за ID |
| `PUT` | `/api/resumes/<id>/` | Повністю оновити резюме за ID |
| `PATCH` | `/api/resumes/<id>/` | Частково оновити резюме за ID |
| `DELETE` | `/api/resumes/<id>/` | Видалити резюме за ID |
| `GET` | `/api/resumes/<id>/export/?template=<template_name>` | Згенерувати та завантажити резюме у PDF за вказаним шаблоном |
 
**Примітки:**
- `POST`/`PUT`/`PATCH` для `/api/resumes/` приймають `multipart/form-data`. Такі поля, як `personal_info`, `links`, `experience`, `education`, `languages`, `skills`, `projects`, `certifications`, передаються як JSON-рядки в межах form-data; фото профілю передається файлом у полі `photo`.
- Параметр `template` в endpoint експорту відповідає назві папки шаблону в `resumes/templates/resumes/<template_name>/`.
- Доступ до резюме обмежений власником — користувач бачить і редагує лише свої записи.
## Основний функціонал
 
- Реєстрація та авторизація користувачів
- Заповнення даних резюме (особиста інформація, досвід, освіта, навички тощо)
- Вибір готового шаблону оформлення
- Генерація резюме у PDF за допомогою WeasyPrint
- Збереження та редагування створених резюме
