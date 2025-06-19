const express = require('express');
const dotenv = require('dotenv');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Set up multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Route to handle file uploads
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({model: 'gemini-1.5-flash'});

async function generateText(req, res) {
  const { prompt } = req.body;

  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();

    res.json({ output: text});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function generateTextFromImage(req, res) {
    const prompt = req.body.prompt || 'Write a story about this image';
    const imagePath = req.file.path;
    const imageData = fs.readFileSync(imagePath);
    const mimeType = path.extname(imagePath) === '.png' ? 'image/png' : 'image/jpeg'; // Basic MIME type detection
    const imageFile = {
        inlineData: {
            data: Buffer.from(imageData).toString('base64'),
            mimeType
        },
    }

  try {
    const result = await model.generateContent([prompt, imageFile]);
    const text = await result.response.text();

    res.json({ output: text});
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    // Clean up uploaded file
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path)
    }
  }
}

async function generateTextFromDocument(req, res) {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64File = Buffer.from(buffer).toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const documentFile = {
            inlineData: {
                data: base64File,
                mimeType
            },
        };

        const result = await model.generateContent(['Analyze this document', documentFile]);
        const text = await result.response.text();

        res.json({ output: text });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        // Clean up uploaded file
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        } 
    }          
}

async function generateTextFromAudio(req, res) {
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64Audio = Buffer.from(audioBuffer).toString('base64');
    const mimeType = req.file.mimetype;

    try {
        const audioFile = {
            inlineData: {
                data: base64Audio,
                mimeType
            },
        };

        const result = await model.generateContent(['Transcribe this audio', audioFile]);
        const text = await result.response.text();

        res.json({ output: text });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        // Clean up uploaded file
        if (req.file && req.file.path) {
            fs.unlinkSync(req.file.path);
        }
    }
}

app.post('/generate-text', generateText);
app.post('/generate-from-image', upload.single('image'), generateTextFromImage);
app.post('/generate-from-document', upload.single('document'), generateTextFromDocument);
app.post('/generate-from-audio', upload.single('audio'), generateTextFromAudio);

app.listen(PORT, () => {
  console.log(`Chat API server is running on http://localhost:${PORT}`);
});