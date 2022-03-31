const mongoose = require("mongoose");
const User = require("./user");
const Schema = mongoose.Schema;

const TeamSchema = new Schema({
    name: String,
    description: String,
    owner: {
        type: Schema.Types.ObjectId,
        ref: "User",
    },
    members: [
        {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    ],
});

module.exports = mongoose.model("Team", TeamSchema);