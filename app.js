var express = require("express");
var app = express();
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var expressSanitizer = require("express-sanitizer");
var passport = require("passport");
var LocalStrategy = require("passport-local");
var passportLocalMongoose = require("passport-local-mongoose");
var methodOverride = require("method-override");

mongoose.connect("mongodb://localhost/esports");
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(expressSanitizer());
app.use(methodOverride("_method"));

// Define User
var UserSchema = new mongoose.Schema({
    username: String,
    password: String,
    created: {type: Date, default: Date.now},
    avatar: String,
    firstName: String,
    lastName: String,
    birth: Date,
    email: String,
    department: String,
    job: String,
    team: String,
    player: Boolean,
    game: String,
    role: Number
});

UserSchema.plugin(passportLocalMongoose);

var User = mongoose.model("User", UserSchema);

// Password Config
app.use(require("express-session")({
    secret: "My Parrot Always Wins Because It Is An African Grey",
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    next();
});

// =============================
// DB Schemas 
// =============================

var sliderSchema = new mongoose.Schema({
    title: String,
    image: String
});
var Slider = mongoose.model("Slider", sliderSchema);

var tournamentsSchema = new mongoose.Schema({
    title: String,
    image: String,
    shortDesc: String,
    longDesc: String,
    created: {type: Date, default: Date.now},
    location: String,
    game: String,
    duration: String,
    author: String
});
var Tournament = mongoose.model("Tournament", tournamentsSchema);

var postSchema = new mongoose.Schema({
    title: String,
    created: {type: Date, default: Date.now},
    image: String,
    shortDesc: String,
    longDesc: String,
    author: {
        id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        username: String
    }
});
var Post = mongoose.model("News", postSchema);

var playerSchema = new mongoose.Schema({
    ingameName: String,
    firstName: String,
    lastName: String,
    profilePic: String,
    dateOfBirth: Date,
    twitter: String,
    twitch: String,
    facebook: String
});
var Player = mongoose.model("Player", playerSchema);


var teamSchema = new mongoose.Schema({
    game: String,
    pic: String,
    profilepic: String,
    manager: String,
    coach: String,
    trainer: String,
    players: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Player"
            }
        ]
});
var Team = mongoose.model("Team", teamSchema);

// =============================
// ROUTES
// =============================

// Index
app.get("/", function(req, res){
    if(req.isAuthenticated()){
        res.redirect("/secure")
        return;
    }
    res.render("landing")
});

// =============================
// AUTH ROUTES
// =============================
app.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/secure",
        failureRedirect: "/"
    }), function(req, res){
});
// Logout 
app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/");
});

// =============================
// SECURE ROUTES
// =============================
app.get("/secure", isLoggedIn, function(req, res){
    res.render("secure");
});

// All posts
app.get("/secure/news", isLoggedIn, function(req, res){
    Post.find().sort({created: -1}).exec(function(err, post){
        if(err){
            console.log(err);
        } else {
            res.render("secure/news", {post: post});
        }
    });
});

// New Post route
app.get("/secure/news/new", isLoggedIn, function(req, res){
    res.render("secure/news/new");
});


app.post("/secure/news", isLoggedIn, function(req, res){
    var title = req.body.title;
    var image = req.body.image;
    var shortDesc = req.body.shortDesc;
    var longDesc = req.body.longDesc;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    var newPost = {title: title, image: image, shortDesc: shortDesc, longDesc: longDesc, author: author};
    Post.create(newPost, function(err, newPost){
        if(err){
            console.log(err);
        } else {
            res.redirect("/secure/news")
        }
    })
});
// Show post
app.get("/secure/news/:id", isLoggedIn, function(req, res){
    // Find post with id
    Post.findById(req.params.id).exec(function(err, foundPost){
        if(err || !foundPost){
            res.redirect("back");
        } else {
            // Render show template with given id
            res.render("secure/news/show", {post: foundPost});
        }
    });
});
// Edit Post Route
app.get("/secure/news/:id/edit", isLoggedIn, function(req, res){
    Post.findById(req.params.id, function(err, foundPost){
        if(err || !foundPost){
            res.redirect("back");
        } else {
            res.render("secure/news/edit", {post: foundPost});
        }
    });
});
// Update Post Route
app.put("/secure/news/:id", isLoggedIn, function(req, res){
    // Find and update correct post
    Post.findByIdAndUpdate(req.params.id, req.body.post, function(err, updatedPost){
        if(err){
            res.redirect("/secure/");
        } else {
            res.redirect("/secure/news/" + req.params.id);
        }
    });
});
// Delete post route
app.delete("/secure/news/:id", isLoggedIn, function(req, res){
    // Destroy post
    Post.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/secure/news");
        } else {
            res.redirect("/secure/news");
        }
    });
});

// All users
app.get("/secure/users", isLoggedIn, function(req, res){
    User.find({role: { $ne: 1}}).sort({created: -1}).exec(function(err, user){
        if(err){
            console.log(err);
        } else {
            res.render("secure/users", {user: user});
        }
    });
});

// New User Step 1
app.get("/secure/users/new", isLoggedIn, function(req, res){
    res.render("secure/users/new");
});

//  New User Step 2
app.get("/secure/users/new/step2/:id", isLoggedIn, function(req, res){
    User.findById(req.params.id, function(err, user){
        if(err || !user){
            res.redirect("/secure/users/");
        } else {
            res.render("secure/users/final", {user: user});
        }
    });
});

// Add new user
app.post("/secure/users", isLoggedIn, function(req, res){
    var newUser = new User({username: req.body.username});
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
        }
        res.redirect("/secure/users/new/step2/" + user._id);
        });
});

// Get user with iD
app.get("/secure/users/:id", isLoggedIn, function(req, res){
    User.findById(req.params.id, function(err, user){
        if(err || !user){
            res.redirect("back");
        } else {
            res.render("secure/users/show", {user: user});
        }
    });
});

// Edit user
app.get("/secure/users/:id/edit", isLoggedIn, function(req, res){
    User.findById(req.params.id, function(err, user){
        if(err || !user){
            res.redirect("back");
        } else {
            res.render("secure/users/edit", {user: user});
        }
    });
});

// Update user
app.put("/secure/users/:id", isLoggedIn, function(req, res){
    User.findByIdAndUpdate(req.params.id, req.body.user, function(err, user){
        if(err){
            console.log(err)
            res.redirect("back")
        } else {
            res.redirect("/secure/users/" + req.params.id)
        }
    });
});

// Delete User route
app.delete("/secure/users/:id", isLoggedIn, function(req, res){
    // Destroy post
    User.findByIdAndRemove(req.params.id, function(err){
        if(err){
            res.redirect("/secure/users");
        } else {
            res.redirect("/secure/users");
        }
    });
});

// Player route

app.get("/secure/players", isLoggedIn, function(req, res){
    User.find({"role": 1}).sort({created: -1}).exec(function(err, user){
        if(err){
            console.log(err);
        } else {
            res.render("secure/players", {user: user});
        }
    });
});

app.get("/secure/cp", isLoggedIn, function(req, res){
    res.render("secure/cp")
});

app.get("*", function(req, res){
    res.send("This page does not exist! Please go back!")
})
// =============================
// MIDDLEWARE
// =============================

function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        if(req.user.role === 0) {
            return res.render("inactive")
        } else {
            return next();
        }
    }
    res.redirect("/");
};



// =============================
// Server
// =============================
app.listen(process.env.PORT, process.env.IP, function(){
    console.log("You are online!");
});