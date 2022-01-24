const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const columnSchema = new Schema({
  header: String,
  columnOrder: Number,
  comments: [
    {
      type: Schema.Types.ObjectId,
      ref: "Comment",
    },
  ],
});

module.exports = mongoose.model("Column", columnSchema);
