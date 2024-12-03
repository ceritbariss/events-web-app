const express = require("express");
const path = require("path");
const app = express();
const userRoutes = require("./routes/users");
const session = require("express-session");

app.set("view engine", "ejs");

app.use(express.static("public"));

app.use(
  session({
    secret: "gizliAnahtar",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use(userRoutes);

app.listen(3000, () => {
  console.log("listening on port 3000");
});
