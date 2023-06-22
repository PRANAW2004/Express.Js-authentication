//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs")
const parser = require("body-parser")
const mongoose = require("mongoose");
const { upperFirst } = require("lodash");
const encrypt = require("mongoose-encryption");

mongoose.connect("mongodb://127.0.0.1:27017/secretsdb", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String
})


userSchema.plugin(encrypt,{secret: process.env.SECRET, encryptedFields: ['password']});


const user = new mongoose.model("User",userSchema);



const app = express()

app.use(parser.urlencoded({
    extended: true
}))
app.use(express.static("public"))
app.set('view engine', 'ejs');

app.get("/",(req,res)=>{
    res.render("home");
})

app.get("/login",(req,res)=>{
    res.render("login");
})

app.get("/register",(req,res)=>{
    res.render("register");
})

app.post("/register",(req,res)=>{
    const user1 = new user({
        email: req.body.username,
        password: req.body.password
    })
    user1.save()
    .then(()=>{
        res.render("secrets");
    })
    .catch((err)=>{
        console.log(err);
    })
})

app.post("/login", (req,res)=>{
    const username = req.body.username;
    const password = req.body.password;
    user.findOne({email: username})
        .then((d1)=>{
            if(d1){
            if(d1.password === password){
                res.render("secrets")
            }}
        })
        .catch((err)=>{
            console.log(err);
            res.send("Username and password not correct")
            res.redirect("/login");
        })
})

app.listen(process.env.PORT || 3000, ()=>{
    console.log("Server started");
})