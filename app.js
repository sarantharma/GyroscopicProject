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
const Team = require("./models/team");
const React = require("./models/react");

const morgan = require("morgan");
const ejsMate = require("ejs-mate");
const catchAsync = require("./utils/catchAsync");
const ExpressError = require("./utils/ExpressError");
const Joi = require("joi"); // For validations
const sendgrid = require("@sendgrid/mail"); // For emails

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
  socket.on("drag comment", async (cmtID, parentColumnID, newColumnID) => {

    const theComment = await Comment.findById(cmtID);
    const findNewColumn = await Column.findById(newColumnID);

    await Column.findByIdAndUpdate(parentColumnID, {
      $pull: { comments: cmtID },
    });
    findNewColumn.comments.push(theComment);
    await findNewColumn.save();

    const cmtUser = await User.findById(theComment.owner._id)

    // adding React (Like/dislike) data to comment
    theComment.likes = await React.countDocuments({commentId: cmtID, like: true});
    theComment.dislikes = await React.countDocuments({commentId: cmtID, dislike: true});
    
    io.emit("drag comment", theComment, findNewColumn.id, parentColumnID, cmtUser.username);
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

  // Like comment
  socket.on("like", async (commentID, userId) => {
      // if a react exists with both (userId=userId, commentId=commentId) update it, else insert new react.
      React.updateOne(
          {userId: userId, commentId: commentID},
              { $set: {
                  userId: userId,
                  commentId: commentID,
                  like: true,
                  dislike: false}
                  },
          {upsert:true},
          function(error, result){
              if(error){
                  console.log(error);
              }
          }
      );
      let like = await React.countDocuments({commentId: commentID, like: true});
      let dislike = await React.countDocuments({commentId: commentID, dislike: true});
      // both like and dislike Emit updateReact
      io.emit("updateReact", commentID, like, dislike);
      
  });
  // Dislike comment
  socket.on("dislike", async (commentID, userId) => {
      // if a react exists with both (userId=userId, commentId=commentId) update it, else insert new react.   
      React.updateOne(
          {userId: userId, commentId: commentID},
              { $set: {
                  userId: userId,
                  commentId: commentID,
                  like: false,
                  dislike: true}
                  },
          {upsert:true},
          function(error, result){
              if(error){
                  console.log(error);
              }
          }
      );
      let like = await React.countDocuments({commentId: commentID, like: true});
      let dislike = await React.countDocuments({commentId: commentID, dislike: true});
      // both like and dislike Emit updateReact
      io.emit("updateReact", commentID, like, dislike);
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
      team: Joi.string().allow(null, ""),
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

const validateTeam = (req, res, next) => {
    const teamSchema = Joi.object({
        team: Joi.object({
            name: Joi.string().required(),
            description: Joi.string().required(),
        }).required(),
    });

    const { error } = teamSchema.validate({ team: req.body.team });
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
  isLoggedIn,
  catchAsync(async (req, res) => {
    const boards = await Board.find({});
    const teams = await Team.find({});
    res.render("boards/index", { boards, teams });
  })
);

app.get(
    "/teams",
    isLoggedIn,
    catchAsync(async (req, res) => {
        const teams = await Team.find({});
        res.render("teams/teamsIndex", { teams });
    })
);

app.get(
    "/boards/new",
    isLoggedIn,
    catchAsync(async (req, res) => {
        const teams = await Team.find({});
        res.render("boards/new", { teams });
    })
);

app.get("/teams/new", isLoggedIn, (req, res) => {
    res.render("teams/newTeam");
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
    // If user chooses no team, set to null
      if(req.body.board.team == "none") {
          req.body.board.team = null;
      }
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
    "/teams",
    isLoggedIn,
    validateTeam,
    catchAsync(async (req, res) => {
        const team = new Team({ ...req.body.team });
        team.owner = req.user._id;
        team.members.push(req.user._id);
        const x = await team.save();
        const newTeam = await Team.findById(x._id);

        req.flash("success", "Successfully created a team");
        res.redirect(`/teams/${team._id}`);
    })
);

app.post(
  "/signup",
  catchAsync(async (req, res, next) => {
      // Get user inputs from form
      const { email, username, password } = req.body;

      // Check if the email is already associated with a pseudo user
      const pseudoUser = await User.findOne({ username: null, email: email }, function (err, docs) {
          if(docs != null) {
              pseudoUserID = docs._id;
              console.log(pseudoUserID);

              User.findByIdAndUpdate(pseudoUserID, {username: username}).then(function (sanitizedUser) {
                  if(sanitizedUser) {
                      sanitizedUser.setPassword(password, function () {
                          sanitizedUser.save();
                          console.log("Password updated");
                          res.redirect("/teams");
                      });
                  }
                  else {
                      console.log("Password could not be updated");
                      res.redirect("back");
                  }
              },function(err) { console.error(err); })
          }
      }).clone().catch(function (err){console.log(err)})

      // If the email is not associated with a pseudo user, register as a new user
      if(!pseudoUser) {
          try {
              const user = new User({email, username});
              const registeredUser = await User.register(user, password);
              req.login(registeredUser, (err) => {
                  if (err) {
                      return next(err);
                  } else {
                      req.flash("success", "Successfully created an account!");
                      res.redirect("/boards");
                  }
              });
          } catch (e) {
              req.flash("error", e.message);
              res.redirect("signup");
          }
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
          .populate("team")
          .populate("owner");
        // .populate("comments");
        // console.log(board);
        
        // adding React (Like/dislike) data to comments
        for(let i =0; i < board.columns.length; i++){
            for(let j =0; j < board.columns[i].comments.length; j++){
                board.columns[i].comments[j].likes = await React.countDocuments({commentId: board.columns[i].comments[j]._id.toString(), like: true});
                board.columns[i].comments[j].dislikes = await React.countDocuments({commentId: board.columns[i].comments[j]._id.toString(), dislike: true});
            }
        }

      res.render("boards/show", { board });
  })
);

app.get(
  "/boards/:id/edit",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const board = await Board.findById(req.params.id);
    const teams = await Team.find({});
    res.render("boards/edit", { board, teams });
  })
);

app.put(
  "/boards/:id",
  isLoggedIn,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const boardBeforeUpdate = await Board.findById(id);

    // Check if the user isn't the board owner
    if (!boardBeforeUpdate.owner.equals(req.user._id)) {
        // If the board has a team, check if the current user isn't its owner
        if(typeof(boardBeforeUpdate.team) != 'undefined' && boardBeforeUpdate.team != null && boardBeforeUpdate.team.owner == req.user._id) {
            return res.redirect(`/boards/${id}`);
        }
    }
    const b = { ...boardBeforeUpdate._doc, ...req.body.board };
    // If the user chooses no team
    if(req.body.board.team == "none")
        req.body.board.team = null;
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

// Remove board from team
app.delete(
    "/boards/:id/remove",
    isLoggedIn,
    catchAsync(async (req, res) => {
        // Get board id from req
        const { id } = req.params;
        const boardBeforeUpdate = await Board.findById(id).populate("team");

        console.log(boardBeforeUpdate.team.owner);
        console.log(req.user._id);

        // If the board has a team, check if the current user isn't its owner
        if (!boardBeforeUpdate.team.owner.equals(req.user._id)) {
            // User doesn't have permission, redirect back
            console.log("Permission to remove denied.");
            return res.redirect("back");
        }

        // Unlink the board to the team
        const board = await Board.findByIdAndUpdate(id, { team: null });
        console.log("Board removed from team.");

        // Redirect back to the team page
        res.redirect("back");
    })
);

app.post(
    "/boards/:id",
    isLoggedIn,
    catchAsync(async (req, res) => {
        // Get new column name, add new column to board
        const board = await Board.findById(req.params.id);
        const order = board.columns.$size;
        const column = new Column({header: req.body.newColumnName, columnOrder: order });
        const x = await column.save();
        const newColumn = await Column.findById(x._id);
        board.columns.push(newColumn);
        await board.save();

        console.log("New column added");

        res.redirect("back");
    })
);

app.get(
    "/teams/:id",
    isLoggedIn,
    catchAsync(async (req, res) => {
        const team = await Team.findById(req.params.id)
            .populate("members")
            .populate("owner");

        // Load boards that are linked to the team
        const boards = await Board.find({ team: team })
            .populate("team");

        res.render("teams/showTeam", { team, boards });
    })
);

app.get(
    "/teams/:id/edit",
    isLoggedIn,
    catchAsync(async (req, res) => {
        const team = await Team.findById(req.params.id);
        res.render("teams/editTeam", { team });
    })
);

app.put(
    "/teams/:id",
    isLoggedIn,
    catchAsync(async (req, res) => {
        const { id } = req.params;
        const teamBeforeUpdate = await Team.findById(id);

        if (!teamBeforeUpdate.owner.equals(req.user._id)) {
            return res.redirect(`/teams/${id}`);
        }
        const t = { ...teamBeforeUpdate._doc, ...req.body.team };
        const team = await Team.findByIdAndUpdate(id, {
            ...teamBeforeUpdate._doc,
            ...req.body.team,
        });
        res.redirect(`/teams/${team._id}`);
    })
);

app.delete(
    "/teams/:id",
    isLoggedIn,
    catchAsync(async (req, res) => {
        const { id } = req.params;

        const teamBeforeUpdate = await Team.findById(id);
        const boards = await Board.find({ team: teamBeforeUpdate });

        // Unlink all boards in the team, defaulting to none
        for(let i = 0; i < boards.length; i++) {
            x = await Board.findByIdAndUpdate(boards[i].id, {team: null});
        }

        const team = await Team.findByIdAndDelete(id);

        if (!team.owner.equals(req.user._id)) {
            return res.redirect(`/teams/${id}`);
        }
        req.flash("success", "Successfully deleted the team");
        res.redirect("/teams");
    })
);

app.delete(
    "/teams/:id/:memberID/remove",
    isLoggedIn,
    catchAsync(async (req, res) => {
        // Get team
        const team = await Team.findById(req.params.id);

        // Check for null url parameter and if the user is the team owner
        if(req.params.memberID != null && team.owner.equals(req.user._id)) {
            // Get member's id from params
            const memberID = req.params.memberID;

            // Create members list without the specified member
            const membersList = team.members.filter(({ _id }) => _id != memberID);

            // Replace the team's members list with new list
            const updatedTeam = await Team.findByIdAndUpdate(team.id, { members: membersList });

            console.log("Member removed");
        }
        else {
            console.log("Error: Member not removed");
        }
        // Redirect back to the team page
        res.redirect("back");
    })
);

app.post(
    "/teams/:id/invite",
    isLoggedIn,
    catchAsync(async (req, res) => {
        sendgrid.setApiKey("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");
        const url = 'http://localhost:3100/teams/' + req.params.id;
        const team = await Team.findById(req.params.id);
        const email = req.body.email;

        const msg = {
            to: email, // Change to your recipient
            from: 'gyroscopicboard@gmail.com', // Change to your verified sender
            subject: 'Gyroscopic Team Invitation',
            templateId: 'd-478522bdf29f47468a107e3540e0d577',
            dynamic_template_data: {
                subject: 'Gyroscopic Team Invitation',
                teamLink: url,
            },
        }
        sendgrid
            .send(msg)
            .then(() => {
                console.log('Email sent')
            })
            .catch((error) => {
                console.error(error)
            })

        req.flash("success", `Invite sent`);

        // If user already has an account, add to members list of board
        const invitee = await User.findOne({email: email}, function(err, doc) {
            if(err) {
                console.log(err);
            }
            // If the user exists. To do: check if already a member of board
            if(doc != null) {
                console.log("User exists");
                const id = doc._id;
                if(!team.owner.equals(id) && !team.members.includes(id)) {
                    console.log(id);
                    team.members.push(id);
                    team.save();
                }
                else {
                    console.log("Not added: User is already a member.");
                }
            }
            // If the invitee isn't associated with an account, add their email to a pseudo user
            else {
                console.log("User doesn't already exist");

                // Create a user with only an email
                const pseudoUser = new User({ email: email });
                pseudoUser.save();
                console.log(pseudoUser._id);
                // Add pseudo user to the team's member list
                team.members.push(pseudoUser._id);
                team.save();
                console.log("Pseudo user added");
            }
        }).clone().catch(function (err){console.log(err)})

        // Redirect back to team
        res.redirect("/teams");
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
