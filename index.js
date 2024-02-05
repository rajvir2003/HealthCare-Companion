import express, { response } from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { getDiagnosis } from './controllers/symp.js';
import * as fs from 'fs/promises';

const app = express();
const port = 3000;
const newsAPI_Key = "7f5b3c4b4e2f4ba9a04cbc3350388f72";


app.use(bodyParser.urlencoded({ extended : true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index.ejs");
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
  res.render("disease-prediction.ejs");
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
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});