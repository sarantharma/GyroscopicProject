const express = require("express");
const expressSession = require("express-session");
const parser = require("cookie-parser");
var session;

const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");

const Board = require("./models/board");
const Column = require("./models/column");
const Comment = require("./models/comment");
const User = require("./models/user");

const morgan = require("morgan");
const ejsMate = require("ejs-mate");
const catchAsync = require("./utils/catchAsync");
const ExpressError = require("./utils/ExpressError");
const Joi = require("joi"); // For validations

const flash = require("connect-flash");

// User Authentication
const passport = require("passport");
const LocalStrategy = require("passport-local");

// Real time (Socket.io)
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const { resolveSoa } = require("dns");
const io = new Server(server);

io.on("connection", (socket) => {
  Comment.find().then((result) => {
    socket.emit("output-comments", result);
  });
  console.log("A user is connected");
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });

  // ==================== Real Time ====================
  //create new comment
  socket.on("board comment", async (cmt, columnID, currentUser, isanonymous) => {
    // console.log("message: ", cmt, columnID);
    // console.log(columnID);
    let user = "annonymous";
    const findColumn = await Column.findById(columnID);
    const comment = new Comment({ content: cmt });
    if(isanonymous == ""){
        comment.anonymous = false;
    }else{
        comment.anonymous = true;
    }
    
    if (currentUser != "annonymous") {
      const checkUser = await User.findById(currentUser);
      // console.log(user);
      comment.owner = checkUser._id;
      user = checkUser.username;
    }
    // console.log(comment);
    const newComment = await comment.save();
    findColumn.comments.push(newComment);
    await findColumn.save();
    // console.log("The ID: ", newComment);
    // console.log(newComment.id);
    io.emit("board comment", cmt, newComment.id, columnID, user, isanonymous);
  });

  // drag and drop comment
  socket.on("drag comment", async (cmtID, parentColumnID, newColumnID, currentDragging) => {
    // const findParentColumn = await Column.findById(parentColumnID);
    // console.log("Comment ID ", cmtID);
    // console.log("Parent ID ", parentColumnID);
    // console.log("New ID ", newColumnID);
    // console.log("Grag", currentDragging)

    const theComment = await Comment.findById(cmtID);
    const findNewColumn = await Column.findById(newColumnID);

    await Column.findByIdAndUpdate(parentColumnID, {
      $pull: { comments: cmtID },
    });
    findNewColumn.comments.push(theComment);
    await findNewColumn.save();
    const findUser = await User.findById(theComment.owner._id);
    const cmtUser = findUser.username;

    io.emit("drag comment", theComment, findNewColumn.id, parentColumnID,cmtUser,currentDragging);
  });

  //Editing Comment
  socket.on("commentEdit", async (cmt, commentID) => {
    // console.log(cmt + "" + commentID);
    Comment.findOneAndUpdate(
      { _id: commentID },
      { $set: { content: cmt } },
      function (error, result) {
        if (error) {
          console.log("Error Editing Comment");
        } else {
          console.log("Yes");
          io.emit("commentEdit", cmt, commentID);
        }
      }
    );
  });

  // delete a comment
  socket.on("remove comment", async (cmtID) => {
    const deletedComemnt = await Comment.findByIdAndDelete(cmtID);
    io.emit("remove comment", cmtID);
  });

  socket.on("like comment", async (cmtID) => {
    const comment = await Comment.findById(cmtID);
    comment.likes += 1;
    await comment.save();
    const numLikes = comment.likes;
    io.emit("like comment", cmtID, numLikes);
  });
});

// ================== End Real Time ====================

// ==================== Mongo Connection ====================

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

// ================== End Mongo Connection ==================

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const sessionConfig = {
  secret: "thisshouldbeabettersecret!",
  resave: false,
  saveUninitialized: true,
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7, //Expiress after a week
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
};

// Use to parse the req.body - for the post request
app.use(express.urlencoded({ extended: true }));

// Use to update (PUT request)
app.use(methodOverride("_method"));

app.use(express.static(path.join(__dirname, "public")));

app.use(expressSession(sessionConfig)); // Session should be initialized before initialize passport

app.use(flash());

// Implement Passport JS
app.use(passport.initialize()); // Initializa Passport
app.use(passport.session()); // Persistent login session

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser()); //Serialize user into the session
passport.deserializeUser(User.deserializeUser()); // Deserialize user into the session

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  next();
});

// Express session
// app.use(
//   expressSession({
//     saveUninitialized: false,
//     secret: "gyroscopicboard",
//     resave: false,
//   })
// );

// Cookie parser
app.use(parser());

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

const isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.returnTo = req.originalUrl;
    req.flash("error", "You must be logged in!");
    return res.redirect("/login");
  }
  next();
};

app.get("/", (req, res) => {
  session = req.session;
  if (session.username) {
    res.render("home");
  } else {
    res.redirect("login");
  }
});

app.get(
  "/boards",
  catchAsync(async (req, res) => {
    const boards = await Board.find({});
    res.render("boards/index", { boards });
  })
);

app.get("/boards/new", isLoggedIn, (req, res) => {
  res.render("boards/new");
});

// Sign up page
app.get("/signup", (req, res) => {
  res.render("users/signup"); // render with no errors
});

// Login page
app.get("/login", (req, res) => {
  res.render("users/login"); // render with no errors
});

// Home page
app.get("/home", (req, res) => {
  res.render("home", { error: "" }); // render with no errors
});

// Logout
app.get("/logout", (req, res) => {
  req.logout();
  req.flash("success", "Successfully logged out!");
  res.redirect("/boards");
});

app.post(
  "/boards",
  isLoggedIn,
  validateBoard,
  catchAsync(async (req, res) => {
    const dateNow = new Date();
    const board = new Board({ ...req.body.board, date: dateNow });
    board.owner = req.user._id;
    const x = await board.save();
    const newBoard = await Board.findById(x._id);

    for (const [key, value] of Object.entries(req.body.column)) {
      // console.log(`{${key} and ${value}}`);
      const column = new Column({ header: value, columnOrder: key.slice(-1) });
      const x = await column.save();
      const newColumn = await Column.findById(x._id);
      newBoard.columns.push(newColumn);
      await newBoard.save();
    }

    req.flash("success", "Successfully made a board!");
    res.redirect(`/boards/${board._id}`);
  })
);

app.post(
  "/signup",
  catchAsync(async (req, res, next) => {
    try {
      const { email, username, password } = req.body;
      const user = new User({ email, username });
      const registeredUser = await User.register(user, password);
      req.login(registeredUser, (err) => {
        if (err) {
          return next(err);
        }else{
          req.flash("success", "Successfully created an account!");
          res.redirect("/boards");
        }
      });
    } catch (e) {
      req.flash("error", e.message);
      res.redirect("signup");
    }
  })
);

app.post(
  "/login",
  passport.authenticate("local", {
    failureFlash: true,
    failureRedirect: "/login",
  }),
  (req, res) => {
    const redirectUrl = req.session.returnTo || "/boards";
    delete req.session.returnTo;
    req.flash("success", `Hi ${req.user.username}`);
    res.redirect(redirectUrl);
  }
);

app.get(
  "/boards/:id",
  catchAsync(async (req, res) => {
    // const board = await Board.findById(req.params.id).populate("columns");
    const board = await Board.findById(req.params.id)
      .populate({
        path: "columns",
        populate: {
          path: "comments",
          populate: {
            path: "owner",
          },
        },
      })
      .populate("owner");
    // .populate("comments");
    // console.log(board);

    res.render("boards/show", { board });
  })
);

app.get(
  "/boards/:id/edit",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const board = await Board.findById(req.params.id);
    res.render("boards/edit", { board });
  })
);

app.put(
  "/boards/:id",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const boardBeforeUpdate = await Board.findById(id);
    if (!boardBeforeUpdate.owner.equals(req.user._id)) {
      return res.redirect(`/boards/${id}`);
    }
    const b = { ...boardBeforeUpdate._doc, ...req.body.board };
    const board = await Board.findByIdAndUpdate(id, {
      ...boardBeforeUpdate._doc,
      ...req.body.board,
    });
    res.redirect(`/boards/${board._id}`);
  })
);

app.delete(
  "/boards/:id",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const board = await Board.findByIdAndDelete(id);

    if (!board.owner.equals(req.user._id)) {
      return res.redirect(`/boards/${id}`);
    }
    req.flash("success", "Successfully deleted the board!");
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
