let currentEditId = null;
let currentHeroImageUrl = null;
let currentPhotos = [];

function gcd(a, b) {
  return b === 0 ? a : gcd(b, a % b);
}

function calcVWRatio(v, w) {
  if (!v || !w || isNaN(v) || isNaN(w) || v <= 0 || w <= 0) return '—';
  const scale = 1000;
  const vi = Math.round(v * scale);
  const wi = Math.round(w * scale);
  const g = gcd(vi, wi);
  return `${vi / g}:${wi / g}`;
}

function updateRatioDisplay() {
  const v = parseFloat(document.getElementById('vinegarAmount').value);
  const w = parseFloat(document.getElementById('waterAmount').value);
  document.getElementById('vwDisplay').textContent = `V:W = ${calcVWRatio(v, w)}`;
}

function addIngredientRow(name = '', amount = '') {
  const row = document.createElement('div');
  row.className = 'ingredient-row';

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'ing-name';
  nameInput.placeholder = 'Ingredient name';
  nameInput.value = name;

  const amountInput = document.createElement('input');
  amountInput.type = 'text';
  amountInput.className = 'ing-amount';
  amountInput.placeholder = 'Amount (e.g. 30g)';
  amountInput.value = amount;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-ing';
  removeBtn.textContent = '×';
  removeBtn.addEventListener('click', () => row.remove());

  row.appendChild(nameInput);
  row.appendChild(amountInput);
  row.appendChild(removeBtn);
  document.getElementById('ingredientsList').appendChild(row);
}

function getIngredients() {
  return Array.from(document.querySelectorAll('.ingredient-row'))
    .map(row => ({
      name: row.querySelector('.ing-name').value.trim(),
      amount: row.querySelector('.ing-amount').value.trim()
    }))
    .filter(ing => ing.name);
}

async function uploadFile(file, path) {
  const ref = storage.ref(path);
  await ref.put(file);
  return ref.getDownloadURL();
}

function setEditMode(recipe) {
  currentEditId = recipe.id;
  currentHeroImageUrl = recipe.heroImage || null;
  currentPhotos = recipe.photos || [];

  document.getElementById('ingredientsList').innerHTML = '';
  (recipe.ingredients || []).forEach(ing => addIngredientRow(ing.name, ing.amount));
  if (!recipe.ingredients?.length) addIngredientRow();

  document.getElementById('vinegarAmount').value = recipe.vinegar || '';
  document.getElementById('waterAmount').value   = recipe.water   || '';
  document.getElementById('vinegarUnit').value   = recipe.vinegarUnit || 'ml';
  document.getElementById('waterUnit').value     = recipe.waterUnit   || 'ml';
  updateRatioDisplay();

  document.getElementById('photosLink').value = recipe.photosLink || '';

  const preview = document.getElementById('heroPreview');
  preview.innerHTML = '';
  if (recipe.heroImage) {
    const img = document.createElement('img');
    img.src = recipe.heroImage;
    preview.appendChild(img);
  }

  document.getElementById('formTitle').textContent   = 'Edit Recipe';
  document.getElementById('submitBtn').textContent   = 'Update Recipe';
  document.getElementById('cancelEditBtn').style.display = 'block';

  document.querySelector('.panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetForm() {
  currentEditId = null;
  currentHeroImageUrl = null;
  currentPhotos = [];
  document.getElementById('recipeForm').reset();
  document.getElementById('ingredientsList').innerHTML = '';
  document.getElementById('heroPreview').innerHTML = '';
  document.getElementById('vwDisplay').textContent = 'V:W = —';
  addIngredientRow();
  document.getElementById('formTitle').textContent   = 'Add Recipe';
  document.getElementById('submitBtn').textContent   = 'Add Recipe';
  document.getElementById('cancelEditBtn').style.display = 'none';
  document.getElementById('formMsg').textContent = '';
}

async function loadRecipes() {
  const snapshot = await db.collection('recipes').orderBy('createdAt').get();
  const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const list = document.getElementById('recipeList');

  if (!recipes.length) {
    list.innerHTML = '<p class="empty-state">No recipes yet. Add one on the left.</p>';
    return;
  }

  list.innerHTML = '';
  recipes.forEach(recipe => {
    const item = document.createElement('div');
    item.className = 'recipe-item';

    const thumb = document.createElement('div');
    thumb.className = 'recipe-thumb';
    if (recipe.heroImage) {
      const img = document.createElement('img');
      img.src = recipe.heroImage;
      img.alt = 'Recipe';
      thumb.appendChild(img);
    } else {
      thumb.innerHTML = '<span class="no-img">No image</span>';
    }

    const info = document.createElement('div');
    info.className = 'recipe-info';

    if (recipe.ingredients?.length) {
      const ings = document.createElement('div');
      ings.className = 'recipe-ings';
      ings.textContent = recipe.ingredients.map(i => `${i.name}: ${i.amount}`).join(' · ');
      info.appendChild(ings);
    }

    const vw = document.createElement('div');
    vw.className = 'recipe-vw';
    vw.textContent = `V:W = ${calcVWRatio(recipe.vinegar, recipe.water)}`;
    info.appendChild(vw);

    const actions = document.createElement('div');
    actions.className = 'recipe-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => setEditMode(recipe));

    const delBtn = document.createElement('button');
    delBtn.className = 'delete-btn';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => deleteRecipe(recipe.id));

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    item.appendChild(thumb);
    item.appendChild(info);
    item.appendChild(actions);
    list.appendChild(item);
  });
}

async function deleteRecipe(id) {
  if (!confirm('Delete this recipe?')) return;
  if (currentEditId === id) resetForm();
  await db.collection('recipes').doc(id).delete();
  loadRecipes();
}

// Hero image preview
document.getElementById('heroImageInput').addEventListener('change', e => {
  const file = e.target.files[0];
  const preview = document.getElementById('heroPreview');
  preview.innerHTML = '';
  if (file) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.alt = 'Preview';
    preview.appendChild(img);
  }
});

document.getElementById('vinegarAmount').addEventListener('input', updateRatioDisplay);
document.getElementById('waterAmount').addEventListener('input', updateRatioDisplay);
document.getElementById('addIngredientBtn').addEventListener('click', () => addIngredientRow());
document.getElementById('cancelEditBtn').addEventListener('click', resetForm);

// Form submit — handles both Add and Edit
document.getElementById('recipeForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msgEl = document.getElementById('formMsg');
  msgEl.style.color = '#27ae60';
  msgEl.textContent = 'Saving…';

  try {
    const heroFile = document.getElementById('heroImageInput').files[0];
    const photoFiles = Array.from(document.getElementById('photosInput').files);

    let heroImageUrl = currentHeroImageUrl;
    let photos = currentPhotos;

    if (heroFile) {
      heroImageUrl = await uploadFile(heroFile, `heroes/${Date.now()}_${heroFile.name.replace(/\s/g, '_')}`);
    }

    if (photoFiles.length) {
      photos = [];
      for (const file of photoFiles) {
        const url = await uploadFile(file, `photos/${Date.now()}_${file.name.replace(/\s/g, '_')}`);
        photos.push(url);
      }
    }

    const recipeData = {
      heroImage: heroImageUrl || null,
      ingredients: getIngredients(),
      vinegar: parseFloat(document.getElementById('vinegarAmount').value) || 0,
      water: parseFloat(document.getElementById('waterAmount').value) || 0,
      vinegarUnit: document.getElementById('vinegarUnit').value || 'ml',
      waterUnit: document.getElementById('waterUnit').value || 'ml',
      photosLink: document.getElementById('photosLink').value,
      photos,
    };

    const isEditing = !!currentEditId;

    if (isEditing) {
      await db.collection('recipes').doc(currentEditId).update(recipeData);
    } else {
      recipeData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('recipes').add(recipeData);
    }

    msgEl.textContent = isEditing ? 'Recipe updated!' : 'Recipe added!';
    setTimeout(() => { msgEl.textContent = ''; }, 2500);
    resetForm();
    loadRecipes();
  } catch (err) {
    msgEl.style.color = '#c0392b';
    msgEl.textContent = 'Error saving recipe.';
    console.error(err);
  }
});

// Init
addIngredientRow();
loadRecipes();
