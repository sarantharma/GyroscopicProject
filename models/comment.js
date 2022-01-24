const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  content: String,
  likes: Number,
  dislikes: Number,
});

module.exports = mongoose.model("Comment", commentSchema);
