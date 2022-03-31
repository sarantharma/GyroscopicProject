const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ReactSchema = new Schema({
   userId: String,
   like: Boolean,
   dislike: Boolean,
   commentId: String
});

module.exports = mongoose.model("React", ReactSchema);
