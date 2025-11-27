const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const loginValidationRegex = /^[a-zA-Zа-яА-Я0-9@$!%*?&^#-_]{3,50}$/

const UserSchema = new mongoose.Schema({
    login: {
        type: String,
        required: true,
        unique: true,
        minlength: 3,
        maxlength: 50,
        match: [loginValidationRegex, 'Login can only contain letters, numbers, and @$!%*?&^#-_ characters']
    },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    confirmationToken: { type: String },
    confirmationCode: { type: String },
    confirmationExpires: { type: Date },
    isActive: { type: Boolean, default: false },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    rights: [{ type: mongoose.Schema.Types.ObjectId, ref: 'userRights' }],
    avatarFilename: {type: String},
    favoriteGames: [{ type: mongoose.Schema.Types.ObjectId, ref: 'games'}]
}, {collection: 'users'})

UserSchema.pre('save', async function(next) {
    if (this.isModified('password') || this.isNew) {
        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(this.password, salt)
        this.password = hashedPassword
    }
    next()
})

const User = mongoose.model('User', UserSchema)

module.exports = User