const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import the cors package

const app = express();
const port = 3000;

app.use(cors({
    origin: 'reacturl',  // Specify your frontend origin
    methods: ['GET', 'POST'], // Allow only GET and POST methods
  }));

// Directory where your images are stored
const imagesDirectory = path.join(__dirname, '/temp_pict_location/images');
const labelsDirectory = path.join(__dirname, '/temp_pict_location/labels');


app.get('/get-images', (req, res) => {

    fs.readdir(imagesDirectory, (err, files) => {
      if (err) {
        return res.status(500).json({ error: 'Unable to read images directory' });
    }

    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif';
    });

    const imagePaths = imageFiles.map(file => `/temp_pict_location/images/${file}`);

    res.json(imagePaths);
  });
});

app.get('/get-labels', (req, res) => {

  fs.readdir(labelsDirectory, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read labels directory' });
    }

    const labelVersions = files
    let dirFilesDict = {};
    
    labelVersions.forEach( (version) =>{
      dir = path.join(__dirname, `/temp_pict_location/labels/${version}`)
      const files = fs.readdirSync(dir).filter(file => fs.statSync(path.join(dir, file)).isFile());
      const labelPaths = files.map(file => `/temp_pict_location/labels/${version}/${file}`);
      dirFilesDict[version] = labelPaths
    })

    res.json(dirFilesDict);
  });
});

// Static route to serve the images from the 'images' folder
// app.use('/images', express.static(imagesDirectory));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
