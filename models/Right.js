const mongoose = require('mongoose')

const RightSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    }
}, {collection: 'userRights'})

const UserRight = mongoose.model('userRights', RightSchema)

module.exports = UserRight