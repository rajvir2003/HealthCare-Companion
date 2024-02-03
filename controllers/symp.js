import axios from 'axios';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';

const AUTH_SERVICE_URL = 'https://authservice.priaid.ch/login';
const API_KEY = 'Fd34D_GMAIL_COM_AUT';
const SECRET_KEY = 'Ed7y5CZf3k4K6Msj2';

const getAccessToken = async () => {
    const uri = AUTH_SERVICE_URL;
    const hashedCredentials = crypto
      .createHmac('md5', Buffer.from(SECRET_KEY, 'utf-8'))
      .update(uri, 'utf-8')
      .digest('base64');
  
    const authHeader = `Bearer ${API_KEY}:${hashedCredentials}`;
  
    const authResponse = await axios.post(
      AUTH_SERVICE_URL,
      {},
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
      }
    );
  
    return authResponse.data.Token;
};

const readSymptomsFromFile = async () => {
  try {
    const data = await fs.readFile('./controllers/symptoms.json', 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading symptoms from file:', error.message);
    throw error;
  }
};

// Function to perform Symptomate API call
export const getDiagnosis = async (userSymptoms, gender, yearOfBirth) => {
  try {
    // Obtain the access token
    const token = await getAccessToken();

    // Read symptoms from the local JSON file
    const allSymptoms = await readSymptomsFromFile();

    // Map user symptoms to corresponding IDs
    const symptomIds = userSymptoms.map(userSymptom => {
      const matchingSymptom = allSymptoms.find(apiSymptom => apiSymptom.Name.toLowerCase() === userSymptom.toLowerCase());
      return matchingSymptom ? matchingSymptom.ID : null;
    });
    console.log(symptomIds);

    // API endpoint
    const apiUrl = 'https://healthservice.priaid.ch/diagnosis';

    // Make the request
    const response = await axios.get(apiUrl, {
      params: {
        symptoms: JSON.stringify(symptomIds),
        gender,
        year_of_birth: yearOfBirth,
        token,
        format: 'json',
        language: 'en-gb',
      },
    });

    // Extract and return only disease names
    return response.data.map(diagnosis => diagnosis.Issue.Name);
  } catch (error) {
    console.error('Error in Symptomate API request:', error.response ? error.response.data : error.message);
    throw error;
  }
};

export default getDiagnosis;
