const mongoose = require('mongoose')

const GamesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    },
    originalTitle: { type: String },
    category: { type: String },
    players: { type: String },
    time: { type: String },
    image: { type: String },
    description: { type: String }
}, {collection: 'games'})

const Games = mongoose.model('games', GamesSchema)

module.exports = Games