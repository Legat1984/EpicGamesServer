const mongoose = require('mongoose');

const PartsSchema = new mongoose.Schema({
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Games' },
    name: { type: String, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {collection: 'hp_parts'});

const Parts = mongoose.model('Parts', PartsSchema);

module.exports = Parts;