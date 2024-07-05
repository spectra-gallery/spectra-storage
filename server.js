const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const app = express();

require('dotenv').config();

global.__basedir = __dirname;

const corsOptions = {
  origin: ['http://localhost:3000',
    'http://localhost:8000'],
};


app.use(cors(corsOptions));

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({extended: true}));

app.use(express.static(path.join(__dirname, 'ressources'),
    {xframe: 'ALLOW-FROM *'}));

app.get('/', (req, res) => {
  res.json({message: 'Spectra storage'});
});

require('./routes/storage.routes')(app);

const PORT = process.env.PORT || 6001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}.`);
});
