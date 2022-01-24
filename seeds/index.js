const mongoose = require("mongoose");
const Board = require("../models/board");

const names = [
  "Saran Retro",
  "Paul test",
  "James top lists",
  "Main goal",
  "Everyone contribution",
  "React testing",
  "AWS CONFIG",
  "Bootcamp training",
];

const descr =
  "I am ahg lairg alirg lrairhg lairg lairhg airgh a;irhg ajbf laiurgh laiugh laiugh alif lairug liu";

mongoose.connect("mongodb://localhost:27017/gyroscopic_1", {
  useNewUrlParser: true,
  //   useCreateIndex: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => {
  console.log("Database Connected!");
});

const seedDB = async () => {
  await Board.deleteMany({});
  for (let i = 0; i < 8; i++) {
    const b = new Board({
      name: `${names[i]}`,
      date: "1-1-2012",
      description: descr,
    });
    await b.save();
  }
};

seedDB().then(() => {
  mongoose.connection.close();
});
