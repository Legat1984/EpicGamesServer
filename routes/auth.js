// Конфиг
require('dotenv').config()

// Модули node js
const express = require('express')
const { check, validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

// Модели базы данных
const User = require('../models/User')
const UserRight = require('../models/Right')
const Games = require('../models/Games')

// Сервисы
const { sendConfirmationEmail } = require('../services/emailService')

const router = express.Router()

// Middleware
const authMiddleware = require('../middleware/authMiddleware');
const adminRightsMiddleware = require('../middleware/adminRightsMiddleware');

// Регистрация пользователя
router.post(
  '/register',
  [
    check('login', 'Логин должен содержать от 3 до 50 символов и может включать буквы, цифры и специальные символы: @$!%*?&^#-_')
      .matches(/^[a-zA-Zа-яА-Я0-9@$!%*?&^#-_]{3,50}$/),
    check('email', 'Введите корректный email').isEmail(),
    check(
      'password',
      'Пароль должен содержать минимум 8 символов, включая хотя бы одну заглавную букву, одну строчную букву и одну цифру. Разрешены специальные символы: @$!%*?&^#-_'
    ).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&^#-_]{8,}$/),
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(200).json({ errors: errors.array() })
    }

    const { login, email, password } = req.body

    try {
      let user = await User.findOne({ email })
      if (user) {
        return res.status(200).json({ errors: 'Пользователь с таким e-mail уже зарегистрирован!' })
      }

      user = await User.findOne({ login })
      if (user) {
        return res.status(200).json({ errors: 'Пользователь с таким логином уже зарегистрирован!' })
      }

      const playerRight = await UserRight.findOne({ name: 'Игрок' });
      if (!playerRight) {
        const playerRight = new UserRight({
          name: 'Игрок'
        });

        await playerRight.save();
      }

      // Создание нового пользователя
      user = new User({
        login,
        password,
        email,
        isActive: false,
        rights: [playerRight._id]
      })

      await user.save()

      // Генерация токена подтверждения
      const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);

      // Генерация кода подтверждения
      const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-значный код

      // Установка срока действия кода
      const codeExpires = Date.now() + 15 * 60 * 1000; // 15 минут

      // Обновление пользователя с данными подтверждения
      user.confirmationToken = token;
      user.confirmationCode = confirmationCode;
      user.confirmationExpires = codeExpires;
      await user.save();

      // Отправка письма с кодом подтверждения
      await sendConfirmationEmail(email, confirmationCode);

      // Возврат успешного ответа с токеном
      return res.status(200).json({ message: 'Регистрация пользователя прошла успешно! На ваш e-mail было отправлено письмо с кодом подтверждения. Введите код в поле ввода и нажмите "Подтвердить"', token });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Ошибка сервера!')
    }
  }
)

// Повторная отправка кода подтверждения
router.post('/resend-confirmation', async (req, res) => {
  const { token } = req.body;

  try {
    // Проверка наличия пользователя по токену
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(200).json({ errors: 'Пользователь не найден!' });
    }

    //if (user.isActive) {
    //  return res.status(200).json({ errors: 'Аккаунт уже активирован!' });
    //}

    // Генерация нового кода подтверждения
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-значный код

    // Установка нового срока действия кода
    const codeExpires = Date.now() + 15 * 60 * 1000; // 15 минут

    // Обновление пользователя с новыми данными подтверждения
    user.confirmationCode = confirmationCode;
    user.confirmationExpires = codeExpires;
    await user.save();

    // Отправка письма с новым кодом подтверждения
    await sendConfirmationEmail(user.email, confirmationCode);

    // Возврат успешного ответа
    return res.status(200).json({ message: 'Код подтверждения был отправлен повторно.' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Ошибка сервера!');
  }
});

// Подтверждение кода
router.post('/confirm', async (req, res) => {
  const { token, confirmationCode } = req.body;

  try {
    // Поиск пользователя по token
    let user = await User.findOne({ confirmationToken: token });

    if (!user) {
      return res.status(200).json({ errors: 'Пользователь не найден!' });
    }

    // Проверка кода подтверждения
    if (user.confirmationCode !== confirmationCode) {
      return res.status(200).json({ errors: 'Неверный код подтверждения!' });
    }

    // Проверка срока действия кода
    //if (Date.now() > user.confirmationExpires) {
    //  return res.status(200).json({ errors: 'Срок действия кода истек!' });
    //}

    // Активация учетной записи
    user.isActive = true;
    user.isEmailVerified = true;
    user.confirmationCode = undefined;
    user.confirmationToken = undefined;
    user.confirmationExpires = undefined;
    await user.save();

    // Создание токена
    const newToken = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1h' })

    return res.status(200).json({
      message: 'Учетная запись успешно активирована!',
      token: newToken,
      user: { id: user._id, login: user.login, displayName: user.displayName, email: user.email }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Ошибка сервера!');
  }
});

// Роут для запроса сброса пароля
router.post('/request-reset', [
  check('email', 'Введите корректный email').isEmail()
], async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(200).json({ errors: errors.array() })
  }

  const { email } = req.body

  try {
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(200).json({ errors: 'Пользователь с таким e-mail не найден!' })
    }

    // Генерация токена подтверждения
    const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY);

    // Генерация кода подтверждения
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-значный код

    // Установка срока действия кода
    const codeExpires = Date.now() + 15 * 60 * 1000; // 15 минут

    // Обновление пользователя с данными подтверждения
    user.confirmationToken = token;
    user.confirmationCode = confirmationCode;
    user.confirmationExpires = codeExpires;
    await user.save();

    // Отправка письма с кодом подтверждения
    await sendConfirmationEmail(email, confirmationCode);

    // Возврат успешного ответа с токеном
    return res.status(200).json({ message: 'На e-mail было отправлено письмо с кодом подтверждения электронной почты. Введите код в поле ввода и нажмите "Подтвердить"', token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Ошибка сервера!')
  }
})

// Роут для сброса пароля
router.post('/reset-password', [
  check('newPassword', 'Пароль должен содержать минимум 8 символов, включая хотя бы одну заглавную букву, одну строчную букву и одну цифру. Разрешены специальные символы: @$!%*?&^#-_')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d@$!%*?&^#-_]{8,}$/)
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(200).json({ errors: errors.array() });
  }

  const { tokenNewUser: token, newPassword } = req.body;

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(200).json({ errors: 'Токен недействителен или истек.' });
    }

    // Обновление пароля (хэширование будет выполнено в модели)
    user.password = newPassword;

    await user.save();

    return res.status(200).json({ message: 'Пароль успешно изменен!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Ошибка сервера');
  }
});

// Авторизация пользователя
router.post(
  '/login',
  [
    check('email', 'Введите корректный email или логин').notEmpty(),
    check('password', 'Введите пароль').exists()
  ],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(200).json({ errors: errors.array() })
    }

    const { email, password } = req.body

    try {
      // Проверка существования пользователя по email или login
      let user = await User.findOne({
        $or: [{ email: email }, { login: email }]
      }).populate('favoriteGames');
      if (!user) {
        return res.status(200).json({ errors: 'Неверные учетные данные' })
      }

      // Проверка активности пользователя
      if (!user.isActive) {
        return res.status(200).json({ errors: 'Пользователь не активирован' })
      }

      // Проверка пароля
      const isMatch = await bcrypt.compare(password, user.password)
      if (!isMatch) {
        return res.status(200).json({ errors: 'Неверные учетные данные' })
      }

      // Создание токена
      const token = jwt.sign({ userId: user._id }, process.env.SECRET_KEY, { expiresIn: '1h' })

      // Возврат токена и данных пользователя
      return res.status(200).json({
        token, user: {
          id: user._id,
          login: user.login,
          displayName: user.displayName,
          email: user.email,
          favoriteGames: user.favoriteGames.map(game => (game._id))
        }
      })
    } catch (err) {
      console.error(err.message)
      res.status(500).send('Ошибка сервера')
    }
  }
)

// Маршрут для обновления токена
router.post('/refresh-token', authMiddleware, (req, res) => {
  const userId = req.user.userId;
  const newToken = jwt.sign({ userId }, process.env.SECRET_KEY, { expiresIn: '1h' });

  return res.status(200).json({ token: newToken });
});

// Маршрут для получения данных о пользователе
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('rights')
      .populate('favoriteGames');
    if (!user) {
      return res.status(200).json({ errors: 'Пользователь не найден' });
    }

    return res.status(200).json({
      id: user._id,
      login: user.login,
      displayName: user.displayName,
      email: user.email,
      isActive: user.isActive,
      rights: user.rights.map(right => right.name),
      avatarFilename: user.avatarFilename,
      favoriteGames: user.favoriteGames.map(game => ({
        id: game._id,
        name: game.game,
        description: game.description,
        icon: game.icon
      }))
    });
  } catch (error) {
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Получение списка пользователей
router.get('/users-list', authMiddleware, adminRightsMiddleware, async (req, res) => {
  try {
    const users = await User.find({}).populate('rights');
    return res.status(200).json(users.map(user => ({
      id: user._id,
      login: user.login,
      displayName: user.displayName,
      email: user.email,
      isActive: user.isActive,
      rights: user.rights.map(right => right.name)
    })));
  } catch (error) {
    res.status(200).json({ errors: 'Ошибка сервера' });
  }
});

module.exports = router