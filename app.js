const express = require("express");

const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");

const Board = require("./models/board");
const Column = require("./models/column");
const Comment = require("./models/comment");
var User = require("./models/user");

const morgan = require("morgan");
const ejsMate = require("ejs-mate");
const catchAsync = require("./utils/catchAsync");
const ExpressError = require("./utils/ExpressError");
const Joi = require("Joi"); // For validations

// Real time (Socket.io)
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

io.on("connection", (socket) => {
  Comment.find().then((result) => {
    socket.emit("output-comments", result);
  });
  console.log("A user is connected");
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  socket.on("board comment", async (cmt, columnID) => {
    // console.log("message: ", cmt, columnID);
    // console.log(columnID);

    const findColumn = await Column.findById(columnID);
    const comment = new Comment({ content: cmt });

    const newComment = await comment.save();
    findColumn.comments.push(newComment);
    await findColumn.save();
    // console.log("The ID: ", newComment);
    // console.log(newComment.id);
    io.emit("board comment", cmt, newComment.id, columnID);
  });

  socket.on("drag comment", async (cmtID, parentColumnID, newColumnID) => {
    // const findParentColumn = await Column.findById(parentColumnID);
    // console.log("Comment ID ", cmtID);
    // console.log("Parent ID ", parentColumnID);
    // console.log("New ID ", newColumnID);

    const theComment = await Comment.findById(cmtID);
    const findNewColumn = await Column.findById(newColumnID);

    await Column.findByIdAndUpdate(parentColumnID, {
      $pull: { comments: cmtID },
    });
    findNewColumn.comments.push(theComment);
    await findNewColumn.save();

    io.emit("drag comment", theComment, findNewColumn.id, parentColumnID);
  });

  // Editing Comment
  // socket.on("commentEdit", async (cmt, commentID) => {
  //   Comment.findOneAndUpdate({_id: commentID}, {$set: {content: cmt} }, function(error, result){
  // 	if(error){
  // 		console.log("Error Editing Comment");
  // 	}else{
  // 		io.emit("commentEdit", cmt, commentID);
  // 	}
  // },);
  // });
});

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

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Use to parse the req.body - for the post request
app.use(express.urlencoded({ extended: true }));

// Use to update (PUT request)
app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname, "public")));

const validateBoard = (req, res, next) => {
  const boardSchema = Joi.object({
    board: Joi.object({
      name: Joi.string().required(),
      description: Joi.string().required(),
      columntype: Joi.string().required(),
    }).required(),
  });

  const { error } = boardSchema.validate({ board: req.body.board });
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/boards",
  catchAsync(async (req, res) => {
    const boards = await Board.find({});
    res.render("boards/index", { boards });
  })
);

app.get("/boards/new", (req, res) => {
  res.render("boards/new");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post(
  "/boards",
  validateBoard,
  catchAsync(async (req, res) => {
    const board = new Board(req.body.board);
    const x = await board.save();
    const newBoard = await Board.findById(x._id);

    for (const [key, value] of Object.entries(req.body.column)) {
      console.log(`{${key} and ${value}}`);
      const column = new Column({ header: value, columnOrder: key.slice(-1) });
      const x = await column.save();
      const newColumn = await Column.findById(x._id);
      newBoard.columns.push(newColumn);
      await newBoard.save();
    }

    res.redirect(`/boards/${board._id}`);
  })
);

app.post(
  "/signup",
  (req, res) => {
    var username = req.body.username
    var password = req.body.password
    var email = req.body.email

    const user = new User({username: username, password: password, email: email})
    User.find({username: username}, function (err, docs) {
      if(docs.length > 0) {
        console.log("User already exists");
      } 
      else {
        user.save();
        console.log("User added")
      }
    })

    res.redirect("signup");
  });

app.get(
  "/boards/:id",
  catchAsync(async (req, res) => {
    // const board = await Board.findById(req.params.id).populate("columns");
    const board = await Board.findById(req.params.id).populate({
      path: "columns",
      populate: {
        path: "comments",
      },
    });
    // .populate("comments");
    // console.log(board);
    res.render("boards/show", { board });
  })
);

app.get(
  "/boards/:id/edit",
  catchAsync(async (req, res) => {
    const board = await Board.findById(req.params.id);
    res.render("boards/edit", { board });
  })
);

app.put(
  "/boards/:id",
  validateBoard,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const board = await Board.findByIdAndUpdate(id, { ...req.body.board });
    res.redirect(`/boards/${board._id}`);
  })
);

app.delete(
  "/boards/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    await Board.findByIdAndDelete(id);
    res.redirect("/boards");
  })
);

app.all("*", (req, res, next) => {
  next(new ExpressError("Page Not Found", 404));
});

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = "Something Went Wrong";
  res.status(statusCode).render("error", { err });
});

server.listen(3100, () => {
  console.log("serving on port 3100");
});
