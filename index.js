import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import { getDiagnosis } from './controllers/symp.js';

const app = express();
const port = 3000;
const newsAPI_Key = "7f5b3c4b4e2f4ba9a04cbc3350388f72";

app.use(bodyParser.urlencoded({ extended : true }));
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index.ejs");
});

app.get("/predict-disease", (req, res) => {
  res.render("disease-prediction.ejs");
});

app.post("/predict-disease", async (req, res) => {
  const userSymptoms = req.body.symptoms;
  const gender = req.body.gender;
  const yearOfBirth = req.body.yearOfBirth;
  try {
    console.log(userSymptoms);
    const result = await getDiagnosis(userSymptoms, gender, yearOfBirth);

    console.log(result);
    res.render("disease-prediction.ejs", { diseases : result });
  } catch (error) {
    // Handle errors appropriately
    res.status(500).send('Internal Server Error');
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