// Подключаем локальный конфиг
require('dotenv').config()
// Импортируем необходимые модули
const express = require('express'); // Фреймворк для создания веб-приложений на Node.js
const bodyParser = require('body-parser'); // Модуль для парсинга JSON из HTTP-запросов
const mongoose = require('mongoose'); // ODM (Object Data Modeling) для работы с MongoDB
const cors = require('cors'); // Модуль для настройки CORS (Cross-Origin Resource Sharing)

// Импортируем роуты
const authRoutes = require('./routes/auth');
const gamesRoutes = require('./routes/games');

// Создаем экземпляр Express-приложения
const app = express()

// Определяем порт, на котором будет запущен сервер
const PORT = process.env.PORT || 5000
// Включаем поддержку CORS для разрешения кросс-доменных запросов
app.use(cors())

// Включаем парсинг JSON из входящих HTTP-запросов
app.use(bodyParser.json())

// Подключаемся к MongoDB, указывая URL и настройки для подключения
mongoose.connect(process.env.MONGO_URL)
.catch((err) => {
    throw new Error(`Произошла ошибка подключения к базе данных: ${err}`)
})

// Получаем экземпляр подключения к базе данных
const connection = mongoose.connection
// Настраиваем обработчик события "open" для подключения к MongoDB
connection.once('open', () => {
    console.log('Подключение к базе данных MongoDB установлено')
})

// Запускаем сервер на указанном порту и выводим сообщение о его успешном запуске
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту: ${PORT}`)
})

app.use('/api/users', authRoutes)
app.use('/api/games', gamesRoutes)