import express, { response } from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { getDiagnosis } from './controllers/symp.js';
import { query } from "./controllers/chatbot.js";
import * as fs from 'fs/promises';
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";

const app = express();
const port = 3000;
const newsAPI_Key = "7f5b3c4b4e2f4ba9a04cbc3350388f72";
const saltRounds = 10;

app.use(session({
  secret: "encriptionKey",
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 1000*60*60*24
  }
}));

app.use(bodyParser.urlencoded({ extended : true }));
app.use(bodyParser.json());
app.use(express.static("public"));

app.use(passport.initialize());
app.use(passport.session());

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "healthAssist",
  password: "password",
  port: 5432
});
db.connect();

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
})

app.get("/profile", (req, res) => {
  if (req.isAuthenticated()) {
    const user=req.user;
    res.render("profile.ejs", {
      user: user,
      currYear: new Date().getFullYear()
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/", (req, res) => {
  console.log("this is user");
  console.log(req.user);
  if (req.isAuthenticated()) {
    res.render("index.ejs");
  } else {
    res.redirect("/login");
  }
});

app.post("/register", async (req, res) => {
  const username = req.body.username;
  const email = req.body.email;
  const password = req.body.password;
  const yearOfBirth = req.body.yearOfBirth;
  const gender = req.body.gender;
  
  try {
    const checkResult = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );
    if(checkResult.rows.length > 0){
      res.send("Email already exists. Try logging in.");
    } else {
      bcrypt.hash(password, saltRounds, async (error, hash) => {
        if (error) {
          console.log("Error hashing password: ", error);
        } else {
          const result = await db.query(
            "INSERT INTO users (username, yearOfBirth, gender, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [username, yearOfBirth, gender, email, hash]
          );
          const user = result.rows[0];
          req.login(user, (error) => {
            console.log(error);
            res.redirect("/");
          })
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});

app.post("/login", passport.authenticate("local", {
  successRedirect: "/",
  failureRedirect: "/login"
}));

app.get("/symptoms", async (req, res) => {
  try {
    const data = await fs.readFile('./controllers/symptoms.json', 'utf-8');
    const symptoms = JSON.parse(data);
    res.json(symptoms);
  } catch (error) {
    console.error('Error reading symptoms from file:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.get("/predict-disease", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("disease-prediction.ejs");
  } else {
    res.redirect("/login");
  }
});

app.post("/predict-disease", async (req, res) => {
  try {
    const userSymptoms = req.body.symptoms || [];
    const gender = req.body.gender;
    const yearOfBirth = req.body.yearOfBirth;

    console.log("Received Symptoms:", userSymptoms);
    const result = await getDiagnosis(userSymptoms, gender, yearOfBirth);

    console.log(result);
    res.json({ diseases: result });
  } catch (error) {
    console.log(error.message);
    res.render("disease-prediction.ejs", { error : "Something went wrong! Please try again" });
  }
});

app.get("/news", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const response = await axios.get(`https://newsapi.org/v2/top-headlines?country=in&category=health&apiKey=${newsAPI_Key}`);
      let newsArtices = response.data.articles;
      const result = newsArtices.filter((news) => news.urlToImage != null && news.content != null);
      console.log(result);
      res.render("news.ejs", { news : result });
    }
    catch (error) {
      console.log(error.message);
      res.status(500);
    }
  } else {
    res.redirect("/login");
  }
});

app.post('/api/query', async (req, res) => {
  try {
    console.log('Incoming Request Body:', req.body);
    const data = req.body.inputs;
    console.log(data);
    // Simulate a response for testing purposes
    query(data).then((response) => {
      console.log(JSON.stringify(response));
      res.json(response);
 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

passport.use(new Strategy(async function verify(username, password, cb) {
  try {
    const result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [username]
    );
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const storedHashedPassword = user.password;
      bcrypt.compare(password, storedHashedPassword, (error, result) => {
        if (error) {
          return cb(error);
        } else {
          if (result) {
            return cb(null, user);
          } else {
            console.log("wrong password");
            return cb(null, false);
          }
        }
      })
    } else {
      return cb("User not found");
    }
  } catch (error) {
    return cb(error);
  }
}));

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
})

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});