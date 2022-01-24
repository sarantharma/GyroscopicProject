const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const BoardSchema = new Schema({
  name: String,
  date: String,
  description: String,
  columntype: String,
  columns: [
    {
      type: Schema.Types.ObjectId,
      ref: "Column",
    },
  ],
});

module.exports = mongoose.model("Board", BoardSchema);
