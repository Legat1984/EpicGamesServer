const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
    const token = req.header('Authorization').replace('Bearer ', '');
    if (!token) {
        return res.status(200).json({ errors: 'Требуется авторизация' });
    }

    try {
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(200).json({ errors: 'Неверный или истекший токен' });
    }
};

module.exports = authMiddleware;