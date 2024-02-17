const express = require("express");
const app = express();

app.use("/views", express.static(__dirname + "/views"));
app.use("/passkey", require("./endpoints/server.js"));
app.use(express.static('public'));

app.listen(3000);
