const mongoose = require("mongoose");
const Column = require("./column")
const Schema = mongoose.Schema;

const BoardSchema = new Schema({
  name: String,
  date: { type: Date, default: Date.now },
  description: String,
  columntype: String,
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  columns: [
    {
      type: Schema.Types.ObjectId,
      ref: "Column",
    },
  ],
  members: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
});

BoardSchema.post("findOneAndDelete", async function (doc) {
  console.log(doc)

  if (doc) {
    await Column.deleteMany({
      _id: {
        $in: doc.columns,
      },
    });
  }
});

module.exports = mongoose.model("Board", BoardSchema);
