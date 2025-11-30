const Message = require('../models/Message');
const Room = require('../models/Room');
const User = require('../models/User');

const jwt = require('jsonwebtoken');

module.exports = (io) => {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;

    if (!token) {
      console.log('Токен отсутствует при подключении сокета');
      return next(new Error('Требуется авторизация'));
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);
      socket.user = decoded;
      next();
    } catch (err) {
      console.log('Ошибка проверки токена при подключении сокета:', err.message);
      next(new Error('Неверный или истекший токен'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Пользователь подключился:', socket.id);
    console.log('Пользователь ID:', socket.user.userId || socket.user.id);

    // Присоединение к комнате
    socket.on('joinRoom', async (data) => {
      try {
        const { roomId } = data;
        const userId = socket.user.userId || socket.user.id;

        // Проверяем существование комнаты
        const room = await Room.findById(roomId);
        if (!room) {
          socket.emit('error', { message: 'Комната не найдена' });
          return;
        }

        // Добавляем пользователя к комнате
        socket.join(roomId);

        // Обновляем список участников комнаты в базе данных
        await Room.findByIdAndUpdate(roomId, {
          $addToSet: { participants: userId }
        });

        // Уведомляем других пользователей о присоединении
        socket.to(roomId).emit('userJoined', {
          userId,
          roomId,
          message: `Пользователь присоединился к комнате ${room.name}`
        });

        // Отправляем историю сообщений пользователю
        const messages = await Message.find({ room: roomId })
          .populate('user', 'login avatar')
          .sort({ createdAt: 1 })
          .limit(50); // ограничиваем количество сообщений

        socket.emit('loadMessages', { roomId, messages });
      } catch (error) {
        console.error('Ошибка при присоединении к комнате:', error);
        socket.emit('error', { message: 'Ошибка при присоединении к комнате' });
      }
    });

    // Отправка сообщения
    socket.on('sendMessage', async (data) => {
      try {
        const { roomId, text } = data;
        const userId = socket.user.userId || socket.user.id;

        // Создаем новое сообщение в базе данных
        const newMessage = new Message({
          room: roomId,
          user: userId,
          text: text.trim()
        });

        const message = await newMessage.save();
        await message.populate('user', 'login avatar');

        // Рассылаем сообщение всем участникам комнаты
        io.to(roomId).emit('receiveMessage', message);

        // Обновляем комнату с последним сообщением
        await Room.findByIdAndUpdate(roomId, {
          $set: {
            lastMessageAt: newMessage.createdAt,
            lastMessage: text.substring(0, 50) + (text.length > 50 ? '...' : '') // первые 50 символов
          }
        });
      } catch (error) {
        console.error('Ошибка при отправке сообщения:', error);
        socket.emit('error', { message: 'Ошибка при отправке сообщения' });
      }
    });

    // Выход из комнаты
    socket.on('leaveRoom', async (data) => {
      try {
        const { roomId } = data;
        const userId = socket.user.userId || socket.user.id;

        socket.leave(roomId);

        // Удаляем пользователя из участников комнаты
        await Room.findByIdAndUpdate(roomId, {
          $pull: { participants: userId }
        });

        socket.to(roomId).emit('userLeft', {
          userId,
          roomId,
          message: `Пользователь покинул комнату ${roomId}`
        });
      } catch (error) {
        console.error('Ошибка при выходе из комнаты:', error);
        socket.emit('error', { message: 'Ошибка при выходе из комнаты' });
      }
    });

    // Обработка ошибок
    socket.on('error', (error) => {
      console.log('Ошибка сокета:', error.message);
    });

    // Отключение пользователя
    socket.on('disconnect', () => {
      console.log('Пользователь отключился:', socket.id, 'User ID:', socket.user.userId || socket.user.id);
    });
  });
};