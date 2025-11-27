const User = require('../models/User');

const adminRightsMiddleware = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId).populate('rights');
        if (!user) {
            return res.status(200).json({ errors: 'Пользователь не найден' });
        }

        const isAdmin = user.rights.some(right => right.name === 'Тестировщик');
        if (!isAdmin) {
            return res.status(200).json({ errors: 'Недостаточно прав' });
        }

        next();
    } catch (error) {
        res.status(200).json({ errors: 'Ошибка сервера' });
    }
};

module.exports = adminRightsMiddleware;