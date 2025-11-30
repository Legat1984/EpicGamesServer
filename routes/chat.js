const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const auth = require('../middleware/authMiddleware');

// Получить все комнаты
router.get('/rooms', auth, async (req, res) => {
  try {
    const rooms = await Room.find().populate('participants', 'username email');
    res.json(rooms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Получить сообщения комнаты
router.get('/rooms/:roomId/messages', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const messages = await Message.find({ room: roomId })
      .populate('user', 'username avatar')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Отправить сообщение (для резервного варианта)
router.post('/messages', auth, async (req, res) => {
  try {
    const { roomId, text } = req.body;

    const newMessage = new Message({
      room: roomId,
      user: req.user.id,
      text
    });

    const message = await newMessage.save();
    await message.populate('user', 'username avatar');

    res.json(message);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;