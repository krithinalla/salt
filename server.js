const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'recipes.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

[path.join(__dirname, 'data'), UPLOADS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]');

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s/g, '_')}`)
});
const upload = multer({ storage });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));

function readRecipes() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeRecipes(recipes) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(recipes, null, 2));
}

app.get('/api/recipes', (req, res) => {
  res.json(readRecipes());
});

app.post('/api/recipes', upload.fields([
  { name: 'heroImage', maxCount: 1 },
  { name: 'photos', maxCount: 10 }
]), (req, res) => {
  const recipes = readRecipes();
  const recipe = {
    id: Date.now().toString(),
    heroImage: req.files?.heroImage?.[0] ? `/uploads/${req.files.heroImage[0].filename}` : null,
    ingredients: JSON.parse(req.body.ingredients || '[]'),
    vinegar: parseFloat(req.body.vinegar) || 0,
    water: parseFloat(req.body.water) || 0,
    vinegarUnit: req.body.vinegarUnit || 'ml',
    waterUnit: req.body.waterUnit || 'ml',
    photosLink: req.body.photosLink || '',
    photos: req.files?.photos ? req.files.photos.map(f => `/uploads/${f.filename}`) : []
  };
  recipes.push(recipe);
  writeRecipes(recipes);
  res.json(recipe);
});

app.put('/api/recipes/:id', upload.fields([
  { name: 'heroImage', maxCount: 1 },
  { name: 'photos', maxCount: 10 }
]), (req, res) => {
  const recipes = readRecipes();
  const idx = recipes.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const existing = recipes[idx];
  const updated = {
    ...existing,
    ingredients: JSON.parse(req.body.ingredients || '[]'),
    vinegar: parseFloat(req.body.vinegar) || 0,
    water: parseFloat(req.body.water) || 0,
    vinegarUnit: req.body.vinegarUnit || 'ml',
    waterUnit: req.body.waterUnit || 'ml',
    photosLink: req.body.photosLink || '',
  };

  if (req.files?.heroImage?.[0]) {
    updated.heroImage = `/uploads/${req.files.heroImage[0].filename}`;
  }
  if (req.files?.photos?.length) {
    updated.photos = req.files.photos.map(f => `/uploads/${f.filename}`);
  }

  recipes[idx] = updated;
  writeRecipes(recipes);
  res.json(updated);
});

app.delete('/api/recipes/:id', (req, res) => {
  const recipes = readRecipes().filter(r => r.id !== req.params.id);
  writeRecipes(recipes);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Salt running at http://localhost:${PORT}`);
  console.log(`Admin:        http://localhost:${PORT}/admin.html`);
});
