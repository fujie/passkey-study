const express = require("express");
const session = require("express-session");
const app = express();
const router = require("express").Router();

app.use(session({
    secret: 'secret_for_session',
    resave: true,
    saveUninitialized: false,
    proxy: true,
    cookie:{
        httpOnly: true,
        secure: true,
        sameSite: 'none'
    }
}));
//app.use(express.urlencoded({extended: true}));
app.use(express.json()); 
app.use(router);
app.use("/views", express.static(__dirname + "/views"));
app.use("/passkey", require("./endpoints/server.js"));
app.use(express.static('public'));

app.listen(3000);
