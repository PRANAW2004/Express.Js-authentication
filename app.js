//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs")
const parser = require("body-parser")
const mongoose = require("mongoose");
const { upperFirst } = require("lodash");
// const encrypt = require("mongoose-encryption");
// const hash  = require("md5")
// const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport")
const passportlocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findorcreate = require("mongoose-findorcreate");
// const saltRounds = 10;


const app = express()

app.use(parser.urlencoded({
    extended: true
}))
app.use(express.static("public"))
app.set('view engine', 'ejs');
app.use(session({
    secret: ""+process.env.SECRET+"",
    resave: false,
    saveUninitialized: true,
}))

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/secretsdb", {useNewUrlParser: true});

const contentSchema = new mongoose.Schema({
    content: String,
})

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: [],
})

// userSchema.plugin(encrypt,{secret: process.env.SECRET, encryptedFields: ['password']});

userSchema.plugin(passportlocalMongoose);
userSchema.plugin(findorcreate);
const user = new mongoose.model("User",userSchema);
const contentmodel = new mongoose.model("content",contentSchema);
passport.use(user.createStrategy());

// passport.serializeUser(user.serializeUser());
// passport.deserializeUser(user.deserializeUser());

passport.serializeUser(function(user1, done){
    process.nextTick(()=>{
        done(null, user1.id);
    })
});

passport.deserializeUser((id, done)=>{
    const signin = user.find({_id: id});
    signin.then((user1)=>{
        try{
            done(null,user1);
        }catch(err){
            
        }
    });
})

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
(accessToken, refreshToken, profile,cb)=>{
    user.findOrCreate({googleId: profile.id},(err,user)=>{
        return cb(err, user);
    });
}

))


app.get("/",(req,res)=>{
    res.render("home");
})

app.get('/auth/google',
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
    passport.authenticate("google", {failureRedirect: "/login"}),(req,res)=>{
        res.redirect("/secrets");
    }
)

app.get("/login",(req,res)=>{
    res.render("login");
})

app.get("/register",(req,res)=>{
    res.render("register");
})

app.get("/secrets", (req,res)=>{
    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{
    //     res.redirect("login");
    // }
    user.find({'secret.$.content': {$ne: null}})
        .then((d1)=>{
            console.log(d1);
            res.render("secrets", {userswithSecrets: d1})
        })
        .catch((err)=>{
            res.redirect("/")
        })
            
        
})

app.get("/submit", (req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }else{
        res.redirect("login");
    }
})


app.post("/register",(req,res)=>{

    user.register({username: req.body.username}, req.body.password, (err,d1)=>{
        if(err){
            res.redirect("/register");
        }else{
            passport.authenticate("local")(req,res,()=>{
                res.redirect("/secrets");
            })
        }
    })

    // bcrypt.hash(req.body.password, saltRounds, (err,hash)=>{
    //     const user1 = new user({
    //         email: req.body.username,
    //         password: hash
    //     })
    //     user1.save()
    //     .then(()=>{
    //         res.render("secrets");
    //     })
    //     .catch((err)=>{
    //         console.log(err);
    //     })
    // })
    // const user1 = new user({
    //     email: req.body.username,
    //     password: req.body.password
    // })
    // user1.save()
    // .then(()=>{
    //     res.render("secrets");
    // })
    // .catch((err)=>{
    //     console.log(err);
    // })
})

app.post("/login", (req,res)=>{
    const User = new user({
        username: req.body.username,
        password: req.body.password
    })
    req.login(User, (err)=>{
        if(err){
            res.redirect("/login");
        }else{
            passport.authenticate("local")(req,res, ()=>{
                res.redirect("/secrets");
            })
        }
    })
    // const username = req.body.username;
    // const password = req.body.password;
    // user.findOne({email: username})
    //     .then((d1)=>{
    //         if(d1){
    //             bcrypt.compare(password, d1.password, (err, res1)=>{
    //                 if(res1 === true){
    //                 res.render("secrets")
    //                 }
    //             })
    //         // if(d1.password === password){
    //         //     res.render("secrets")
    //         // }}
    //         }
    //     })
    //     .catch((err)=>{
    //         console.log(err);
    //         res.send("Username and password not correct")
    //         res.redirect("/login");
    //     })
})

app.post("/submit", (req,res)=>{
    const secret = req.body.secret;
    const submitFind = user.find({_id: (req.user)[0]['_id']});
    submitFind.then((d1)=>{
        if(d1){
            // d1[0]['secret'][0]['content'] = secret;
            // d1[0].save();
            // res.redirect("/secrets");
            const data = new contentmodel({
                content: secret,
            })
            
            d1[0]['secret'] = data;
            d1[0].save();
            res.redirect("/secrets");
        }
    })
})

app.get("/logout", (req,res)=>{
    req.logout(()=>{

    });
    res.redirect("/");
})



app.listen(process.env.PORT || 3000, ()=>{
    console.log("Server started");
})
