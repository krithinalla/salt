const COLS = 4;
let recipes = [];
let activeCell = null;
let activeRecipeId = null;
const cellDataMap = new Map();

async function init() {
  const snapshot = await db.collection('recipes').orderBy('createdAt').get();
  recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  renderGrid();
}

function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); }

function calcVWRatio(v, w) {
  if (!v || !w) return null;
  const g = gcd(Math.round(v * 100), Math.round(w * 100));
  return `${Math.round(v * 100) / g}:${Math.round(w * 100) / g}`;
}

function makeDashedLine(label, value) {
  const dashes = Math.max(2, 18 - label.length);
  return { prefix: '+ ', content: `${label}${'-'.repeat(dashes)}${value}` };
}

function makeIngLine(name, amount) {
  const cap = name.charAt(0).toUpperCase() + name.slice(1);
  if (!amount || !amount.toString().trim()) return { prefix: '+ ', content: cap };
  return makeDashedLine(cap, amount);
}

function buildIngLineEl(prefix, content) {
  const li = document.createElement('li');
  li.className = 'ing-line';
  const pre = document.createElement('span');
  pre.className = 'ing-prefix';
  pre.textContent = prefix;
  const cnt = document.createElement('span');
  cnt.className = 'ing-content';
  cnt.textContent = content;
  li.appendChild(pre);
  li.appendChild(cnt);
  return li;
}

// ── Render collapsed state into cell ──
function renderCollapsed(cell) {
  const data = cellDataMap.get(cell);
  if (!data) return;
  cell.innerHTML = '';
  cell.classList.remove('expanded');

  const num = document.createElement('div');
  num.className = 'cell-number';
  num.textContent = String(data.recipeNum).padStart(2, '0');
  cell.appendChild(num);

  if (data.recipe.heroImage) {
    const img = document.createElement('img');
    img.src = data.recipe.heroImage;
    img.className = 'hero-img';
    img.alt = 'Recipe';
    cell.appendChild(img);
  }
}

// ── Render expanded state into cell ──
function renderExpanded(cell) {
  const data = cellDataMap.get(cell);
  if (!data) return;
  const { recipe } = data;
  cell.innerHTML = '';
  cell.classList.add('expanded');

  const topRow = document.createElement('div');
  topRow.className = 'exp-top-row';

  const numEl = document.createElement('span');
  numEl.className = 'exp-top-num';
  numEl.textContent = String(data.recipeNum).padStart(2, '0');
  topRow.appendChild(numEl);

  if (recipe.date) {
    const dateEl = document.createElement('span');
    dateEl.className = 'exp-top-date';
    const d = new Date(recipe.date + 'T00:00:00');
    const day = d.getDate();
    const suffix = [,'st','nd','rd'][day % 100 < 11 || day % 100 > 13 ? day % 10 : 0] || 'th';
    dateEl.textContent = `${day}${suffix} ${d.toLocaleDateString('en-US', { month: 'long' }).toLowerCase()} ${d.getFullYear()}`;
    topRow.appendChild(dateEl);
  }

  cell.appendChild(topRow);

  if (recipe.heroImage) {
    const img = document.createElement('img');
    img.src = recipe.heroImage;
    img.className = 'exp-hero';
    img.alt = 'Recipe';
    cell.appendChild(img);
  }

  const header = document.createElement('div');
  header.className = 'exp-recipe-header';
  header.textContent = 'Recipe';
  cell.appendChild(header);

  if (recipe.ingredients?.length) {
    const ul = document.createElement('ul');
    ul.className = 'exp-ingredients';
    recipe.ingredients.forEach(ing => {
      const { prefix, content } = makeIngLine(ing.name, ing.amount);
      ul.appendChild(buildIngLineEl(prefix, content));
    });
    cell.appendChild(ul);
  }

  if (recipe.vinegar || recipe.water) {
    const vwDiv = document.createElement('div');
    vwDiv.className = 'exp-vw';

    const ratio = calcVWRatio(recipe.vinegar, recipe.water);
    if (ratio) {
      const r = document.createElement('div');
      r.className = 'exp-vw-ratio';
      r.textContent = `V:W = ${ratio}`;
      vwDiv.appendChild(r);
    }
    ['vinegar', 'water'].forEach(key => {
      if (recipe[key]) {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        const value = `${recipe[key]}${recipe[key + 'Unit'] || 'ml'}`;
        const { prefix, content } = makeDashedLine(label, value);
        const el = buildIngLineEl(prefix, content);
        el.className = 'ing-line exp-vw-line';
        vwDiv.appendChild(el);
      }
    });
    cell.appendChild(vwDiv);
  }

  if (recipe.photos?.length || recipe.photosLink) {
    const photosDiv = document.createElement('div');
    photosDiv.className = 'exp-photos';

    if (recipe.photosLink) {
      const link = document.createElement('a');
      link.href = recipe.photosLink;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'exp-photos-link';
      link.textContent = 'Photos ↗';
      photosDiv.appendChild(link);
    }

    if (recipe.photos?.length) {
      const thumbs = document.createElement('div');
      thumbs.className = 'exp-photo-thumbs';
      recipe.photos.forEach((src, i) => {
        const img = document.createElement('img');
        img.src = src;
        img.className = 'exp-photo-thumb';
        img.alt = 'Photo';
        img.addEventListener('click', e => {
          e.stopPropagation();
          openLightbox(recipe.photos, i);
        });
        thumbs.appendChild(img);
      });
      photosDiv.appendChild(thumbs);
    }

    cell.appendChild(photosDiv);
  }
}

function closeExpanded() {
  if (activeCell) {
    renderCollapsed(activeCell);
    activeCell = null;
    activeRecipeId = null;
  }
}

function renderGrid() {
  const wrapper = document.getElementById('gridWrapper');
  wrapper.innerHTML = '';
  cellDataMap.clear();
  activeCell = null;
  activeRecipeId = null;

  const numRows = Math.max(Math.ceil(recipes.length / COLS) + 1, 2);

  for (let col = 0; col < COLS; col++) {
    const colEl = document.createElement('div');
    colEl.className = 'grid-col';

    for (let row = 0; row < numRows; row++) {
      const recipeIdx = row * COLS + col;
      const recipe = recipeIdx < recipes.length ? recipes[recipeIdx] : null;

      const cell = document.createElement('div');
      cell.className = 'grid-cell' + (recipe ? '' : ' empty');

      if (recipe) {
        const recipeNum = recipeIdx + 1;
        cellDataMap.set(cell, { recipe, recipeNum });

        const num = document.createElement('div');
        num.className = 'cell-number';
        num.textContent = String(recipeNum).padStart(2, '0');
        cell.appendChild(num);

        if (recipe.heroImage) {
          const img = document.createElement('img');
          img.src = recipe.heroImage;
          img.className = 'hero-img';
          img.alt = 'Recipe';
          cell.appendChild(img);
        }

        cell.addEventListener('click', e => {
          e.stopPropagation();
          if (activeRecipeId === recipe.id) {
            closeExpanded();
          } else {
            closeExpanded();
            activeCell = cell;
            activeRecipeId = recipe.id;
            renderExpanded(cell);
          }
        });
      }

      colEl.appendChild(cell);
    }

    wrapper.appendChild(colEl);
  }
}

document.addEventListener('click', closeExpanded);

let lightboxPhotos = [];
let lightboxIndex = 0;

function openLightbox(photos, index) {
  lightboxPhotos = photos;
  lightboxIndex = index;
  document.getElementById('lightboxImg').src = photos[index];
  document.getElementById('lightbox').classList.add('active');
}

function closeLightbox() {
  document.getElementById('lightbox').classList.remove('active');
}

document.getElementById('lightbox').addEventListener('click', closeLightbox);

document.addEventListener('keydown', e => {
  const lb = document.getElementById('lightbox');
  if (!lb.classList.contains('active')) return;
  if (e.key === 'ArrowRight') {
    lightboxIndex = (lightboxIndex + 1) % lightboxPhotos.length;
    document.getElementById('lightboxImg').src = lightboxPhotos[lightboxIndex];
  } else if (e.key === 'ArrowLeft') {
    lightboxIndex = (lightboxIndex - 1 + lightboxPhotos.length) % lightboxPhotos.length;
    document.getElementById('lightboxImg').src = lightboxPhotos[lightboxIndex];
  } else if (e.key === 'Escape') {
    closeLightbox();
  }
});

init();
