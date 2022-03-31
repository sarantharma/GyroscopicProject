const mongoose = require("mongoose");
const Comment = require("./comment")
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

columnSchema.post("deleteMany", async function (doc) {
  // console.log("Column delete");
  // doc.array.forEach(element => {
  //   console.log(element)
  // });
  if (doc) {
    await Comment.deleteMany({
      _id: {
        $in: doc.comments,
      },
    });
  }
});

module.exports = mongoose.model("Column", columnSchema);
