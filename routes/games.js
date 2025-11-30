// Конфиг
require('dotenv').config()

// Модули node js
const express = require('express')

// Модели базы данных
const User = require('../models/User')
const Games = require('../models/Games')
const Parts = require('../models/HPBattleTheBattleOfHogwarts/Parts')

// Middleware
const authMiddleware = require('../middleware/authMiddleware');
const adminRightsMiddleware = require('../middleware/adminRightsMiddleware');

const router = express.Router()

router.get('/games-list', async (req, res) => {
    try {
        const games = await Games.find();
        res.json(games.map(game => ({
            id: game._id,
            title: game.title,
            originalTitle: game.originalTitle,
            category: game.category,
            players: game.players,
            time: game.time,
            image: game.image,
            description: game.description
        })));
    } catch (error) {
        console.log(error)
        res.status(200).json({ errors: `Ошибка сервера ${error}` });
    }
});

router.post('/favorite/add/:gameId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const gameId = req.params.gameId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(200).json({ errors: 'Пользователь не найден' });
        }

        if (!user.favoriteGames.includes(gameId)) {
            user.favoriteGames.push(gameId);
            await user.save();
            return res.status(200).json({ message: 'Игра добавлена в избранное' });
        } else {
            return res.status(200).json({ errors: 'Игра уже в избранном' });
        }
    } catch (error) {
        console.error(error);
        res.status(200).json({ errors: `Ошибка сервера: ${error}` });
    }
});

router.post('/favorite/remove/:gameId', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const gameId = req.params.gameId;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(200).json({ errors: 'Пользователь не найден' });
        }

        const gameIndex = user.favoriteGames.indexOf(gameId);
        if (gameIndex !== -1) {
            user.favoriteGames.splice(gameIndex, 1);
            await user.save();
            return res.status(200).json({ message: 'Игра удалена из избранного' });
        } else {
            return res.status(200).json({ errors: 'Игра не найдена в избранном' });
        }
    } catch (error) {
        console.error(error);
        res.status(200).json({ errors: `Ошибка сервера: ${error}` });
    }
});

router.get('/favorite', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;

        const user = await User.findById(userId).populate('favoriteGames');
        if (!user) {
            return res.status(200).json({ errors: 'Пользователь не найден' });
        }

        res.status(200).json({ favoriteGames: user.favoriteGames });
    } catch (error) {
        console.error(error);
        res.status(200).json({ errors: `Ошибка сервера: ${error}` });
    }
});

module.exports = router