let currentEditId = null;

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

function setEditMode(recipe) {
  currentEditId = recipe.id;

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
  const res = await fetch('/api/recipes');
  const recipes = await res.json();
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
  await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
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

  const formData = new FormData();
  const heroFile = document.getElementById('heroImageInput').files[0];
  if (heroFile) formData.append('heroImage', heroFile);

  const photoFiles = document.getElementById('photosInput').files;
  for (const f of photoFiles) formData.append('photos', f);

  formData.append('ingredients', JSON.stringify(getIngredients()));
  formData.append('vinegar',     document.getElementById('vinegarAmount').value);
  formData.append('water',       document.getElementById('waterAmount').value);
  formData.append('vinegarUnit', document.getElementById('vinegarUnit').value || 'ml');
  formData.append('waterUnit',   document.getElementById('waterUnit').value   || 'ml');
  formData.append('photosLink',  document.getElementById('photosLink').value);

  const isEditing = !!currentEditId;
  const url    = isEditing ? `/api/recipes/${currentEditId}` : '/api/recipes';
  const method = isEditing ? 'PUT' : 'POST';

  const res = await fetch(url, { method, body: formData });

  if (res.ok) {
    msgEl.textContent = isEditing ? 'Recipe updated!' : 'Recipe added!';
    setTimeout(() => { msgEl.textContent = ''; }, 2500);
    resetForm();
    loadRecipes();
  } else {
    msgEl.style.color = '#c0392b';
    msgEl.textContent = 'Error saving recipe.';
  }
});

// Init
addIngredientRow();
loadRecipes();
