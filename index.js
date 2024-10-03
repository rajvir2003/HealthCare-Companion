import express, { response } from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { getDiagnosis } from './controllers/symp.js';
import { query } from "./controllers/chatbot.js";
import * as fs from 'fs/promises';
import pg from "pg";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "./controllers/auth.js";
import doctorpassport from "./controllers/doctorauth.js";

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

const db = new pg.Pool({
  user: "postgres",
  host: "localhost",
  database: "healthAssist",
  password: "password",
  port: 5432
});

app.get("/login", (req, res) => {
  res.render("login.ejs");
});

app.get("/register", (req, res) => {
  res.render("register.ejs");
})

app.get("/profile", async (req, res) => {
  if (req.isAuthenticated()) {
    try {
      const user = await db.query(
        "SELECT * FROM users WHERE id = $1",
        [req.user.id]
      );

      if (user.rows.length > 0) {
        res.render("profile.ejs", {
          user: user.rows[0],
          currYear: new Date().getFullYear()
        });
      } else {
        res.status(404).send("User not found");
      }
    } catch (err) {

      console.error("Error fetching user:", err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    // User not authenticated, redirect to login
    res.redirect("/login");
  }
});

app.post("/editProfile", async (req, res) => {
  const id = req.body.id;
  const username = req.body.username;
  const email = req.body.email;
  const gender = req.body.gender;
  const yearOfBirth = req.body.yearofbirth;
  
  try {
    await db.query(
      "UPDATE users SET username = $1, email = $2, gender = $3, yearofbirth = $4 WHERE id = $5",
      [username, email, gender, yearOfBirth, id]
    );
    res.redirect("/profile");
  } catch (error) {
    console.log(error);
  }
});
app.get("/logout", (req, res) => {
  req.logout((error) => {
    if (error) console.log(error);
    res.redirect("/login");
  })
});

app.get("/", (req, res) => {
  console.log("this is user");
  console.log(req.user);
  res.render("index.ejs");
  
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

app.get("/doctors", async (req, res) => {

  if (req.isAuthenticated()) {
    try {
      const result = await db.query('SELECT * FROM doctors');
      const doctors = result.rows;
      var doctorId = doctors.doctor_id;
      const user_id = req.user.id;
      res.render('doctors.ejs', { doctors, doctorId ,user_id});

    } catch (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    }
  } else {
    res.redirect("/login");
  }
});


app.post("/book-appointment", async (req, res) => {
  try {
    const patient_id = req.body.patient_id;
    const doctor_id = req.body.doctor_id;
    const time = req.body.time;
    const date = req.body.date;
    const problem = req.body.problem;

    if (!patient_id || !doctor_id || !time || !date || !problem) {
      return res.status(400).send("Invalid request data. Please provide all required fields.");
    }

    const checkResult = await db.query(
      "SELECT * FROM appointment WHERE patient_id = $1 AND doctor_id = $2 AND time = $3 AND date = $4",
      [patient_id, doctor_id, time, date]
    );
    if (checkResult.rows.length > 0) {
      return res.send("Same appointment already exists.");
    }

    const insertResult = await db.query(
      "INSERT INTO appointment (doctor_id, patient_id, date, time, problem_description, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
      [doctor_id, patient_id, date, time, problem, "pending"]
    );
    const newAppointment = insertResult.rows[0];
    console.log("New Appointment:", newAppointment);
    res.redirect("/doctors");
  } catch (error) {
    console.error("Error in /book-appointment:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/user-appointments", async (req, res) => {
  const userId = req.user.id;
  const statusFilter = req.query.status || 'pending'; // Default to 'pending' if no status is provided

  try {
    const result = await db.query(
      "SELECT * FROM appointment WHERE patient_id = $1 AND status = $2 ORDER BY date, time",
      [userId, statusFilter]
    );

    const appointments = result.rows;

    res.render("user-appointments.ejs", { appointments, statusFilter });
  } catch (error) {
    console.error("Error fetching user appointments:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/delete-appointment", async (req, res) => {
  const appointmentId = req.body.appointment_id;

  try {
    const result = await db.query(
      "DELETE FROM appointment WHERE appointment_id = $1",
      [appointmentId]
    );

    res.redirect("/user-appointments"); 
  } catch (error) {
    console.error("Error deleting appointment:", error.message);
    res.status(500).send("Internal Server Error");
  }
});



app.post("/editProfile", async (req, res) => {
  const id = req.body.id;
  const username = req.body.username;
  const email = req.body.email;
  const gender = req.body.gender;
  const yearOfBirth = req.body.yearofbirth;
  
  try {
    await db.query(
      "UPDATE users SET username = $1, email = $2, gender = $3, yearofbirth = $4 WHERE id = $5",
      [username, email, gender, yearOfBirth, id]
    );
    res.redirect("/profile");
  } catch (error) {
    console.log(error);
  }
});

app.get("/logout", (req, res) => {
  req.logout((error) => {
    if (error) console.log(error);
    res.redirect("/login");
  })
});


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
      const response = await axios.get(`https://newsapi.org/v2/top-headlines?category=health&apiKey=${newsAPI_Key}`);
      let newsArticles = response.data.articles;
      const result = newsArticles.filter((news) => news.urlToImage != null && news.content != null);
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


//doctor

// Doctor login route
app.get("/doctor/login", (req, res) => {
  res.render("doctor/login.ejs");
});

// Doctor registration route
app.get("/doctor/register", (req, res) => {
  res.render("doctor/register.ejs");
});

// Doctor profile route
app.get("/dashboard", async (req, res) => {
  if(req.isAuthenticated()) {
    const doctorId = req.user.doctor_id;
    console.log(req.user)
    const statusFilter = req.query.status || 'pending'; 

    try {
      const result = await db.query(
        "SELECT * FROM appointment WHERE doctor_id = $1 AND status = $2 ORDER BY date, time",
        [doctorId, statusFilter]
      );

      const appointments = result.rows;

      res.render("doctor/dashboard.ejs", { appointments, statusFilter });
    } catch (error) {
      console.error("Error fetching user appointments:", error.message);
      res.status(500).send("Internal Server Error");
    }
  } else {
    res.redirect("/doctor/register");
  }
})
app.get("/doctor/profile", (req, res) => {
  if (req.isAuthenticated()) {
    const doctor = req.user;
    res.render("doctor-profile.ejs", {
      doctor: doctor,
      currYear: new Date().getFullYear()
    });
  } else {
    res.redirect("/doctor/login");
  }
});

// Index route
app.get("/", (req, res) => {
  console.log("this is user");
  console.log(req.user);
  res.render("index.ejs");
});

// Doctor registration route
app.post("/doctor/register", async (req, res) => {
  const name = req.body.name;
  const contact_number = req.body.contact_number;
  const specialization = req.body.specialization;
  const email = req.body.email;
  const password = req.body.password;
  
  try {
    const checkResult = await db.query(
      "SELECT * FROM doctors WHERE email = $1",
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
            "INSERT INTO doctors (name, contact_number, specialization, email, password) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, contact_number, specialization, email, hash]
          );
          const doctor = result.rows[0];
          req.login(doctor, (error) => {
            console.log(error);
            res.redirect("/dashboard");
          })
        }
      });
    }
  } catch (error) {
    console.log(error);
  }
});

// Doctor login route
app.post("/doctor/login", passport.authenticate("doctor", {
  successRedirect: "/dashboard",
  failureRedirect: "/doctor/login"
}));



app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});





