const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors'); // Import the cors package

const app = express();
const port = 3000;

app.use(cors({
    origin: 'reacturl/',  // Specify your frontend origin
    methods: ['GET', 'POST'], // Allow only GET and POST methods
  }));

// Directory where your images are stored
const imagesDirectory = path.join(__dirname, '/temp_pict_location/images');

// Route to get the list of image files
app.get('/get-images', (req, res) => {
  // Check if the images directory exists
  fs.readdir(imagesDirectory, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Unable to read images directory' });
    }

    // Filter out non-image files (you can customize this based on your needs)
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif';
    });

    // Map the image file paths to full URLs (adjust based on your server configuration)
    const imagePaths = imageFiles.map(file => `/temp_pict_location/images/${file}`);

    // Send the list of image URLs in the response
    res.json(imagePaths);
  });
});

// Static route to serve the images from the 'images' folder
app.use('/images', express.static(imagesDirectory));

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
