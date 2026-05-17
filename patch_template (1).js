#!/usr/bin/env node
/**
 * patch_template.js
 * Run from OfficeSmart folder: node patch_template.js
 * 
 * What it does:
 * 1. Adds support for ?d= (base64 encoded data) in office-tour-TEMPLATE.html
 * 2. Updates admin.html tour link to point to office-tour-TEMPLATE.html
 * 3. Updates admin.html to support image/blueprint drag & drop
 */

const fs = require('fs');

// ── Patch office-tour-TEMPLATE.html ──────────────────────────────────────

let template = fs.readFileSync('office-tour-TEMPLATE.html', 'utf8');

// 1. After omLinkedClientId declaration, add URL-data loader
const OLD_LINKED = `var omLinkedClientId = (function () {
  try {
    var sp = new URLSearchParams(location.search || '');
    return sp.get('client') || sp.get('cid') || '';
  } catch (e) {
    return '';
  }
})();`;

const NEW_LINKED = `var omLinkedClientId = (function () {
  try {
    var sp = new URLSearchParams(location.search || '');
    return sp.get('client') || sp.get('cid') || '';
  } catch (e) {
    return '';
  }
})();

// ── URL-encoded data support (?d=base64) ──
var __urlData = null;
(function() {
  try {
    var sp = new URLSearchParams(location.search || '');
    var d = sp.get('d');
    if (d) {
      __urlData = JSON.parse(decodeURIComponent(escape(atob(d))));
      // Override properties immediately from URL data
      if (__urlData && Array.isArray(__urlData.props) && __urlData.props.length) {
        properties = __urlData.props;
        // Map images
        __urlData.props.forEach(function(p) {
          if (Array.isArray(p.images) && p.images.length) {
            IMGS[p.id] = p.images;
            if (!p.img) p.img = p.images[0];
          }
          // Map blueprint
          if (p.blueprint) p._blueprint = p.blueprint;
        });
      }
    }
  } catch(e) { console.error('[url-data]', e); }
})();`;

if (template.includes(OLD_LINKED)) {
  template = template.replace(OLD_LINKED, NEW_LINKED);
  console.log('✅ Patch 1: URL-data loader added');
} else {
  console.log('❌ Patch 1 failed: could not find omLinkedClientId declaration');
}

// 2. Patch omClientBundlePromise to skip JSONBin when ?d= is present
const OLD_BUNDLE = `var omClientBundlePromise = Promise.all([
  omReadJSONBin(JSONBIN_BINS.clients, { clients: [] }),
  omReadJSONBin(JSONBIN_BINS.properties, { properties: [], images: {} }),
  omReadJSONBin(JSONBIN_BINS.tours, { byClient: {}, meta: {} })
]).then(function (records) {
  omApplyRemoteData(records);
  return records;
}).catch(function (err) {
  console.error(err);
  return null;
});`;

const NEW_BUNDLE = `var omClientBundlePromise = __urlData ? (function() {
  // Data loaded from URL — skip JSONBin entirely
  if (__urlData.clientName) {
    omLinkedClient = {
      id: __urlData.clientId || 'url',
      name: __urlData.clientName,
      password: __urlData.password || '',
      tourOpened: false,
      favCount: 0
    };
  }
  if (__urlData.notes) {
    omLinkedTour = { notes: __urlData.notes };
  }
  return Promise.resolve(null);
})() : Promise.all([
  omReadJSONBin(JSONBIN_BINS.clients, { clients: [] }),
  omReadJSONBin(JSONBIN_BINS.properties, { properties: [], images: {} }),
  omReadJSONBin(JSONBIN_BINS.tours, { byClient: {}, meta: {} })
]).then(function (records) {
  omApplyRemoteData(records);
  return records;
}).catch(function (err) {
  console.error(err);
  return null;
});`;

if (template.includes(OLD_BUNDLE)) {
  template = template.replace(OLD_BUNDLE, NEW_BUNDLE);
  console.log('✅ Patch 2: JSONBin bypass added');
} else {
  console.log('❌ Patch 2 failed: could not find omClientBundlePromise');
}

// 3. Patch login to use URL password when ?d= is present
const OLD_LOGIN = `    var clientPass = omLinkedClient && omLinkedClient.password ? String(omLinkedClient.password).trim() : '';
    if (!clientPass) clientPass = localStorage.getItem('client-pass') || CLIENT_PASSWORD || '';`;

const NEW_LOGIN = `    var clientPass = '';
    if (__urlData && __urlData.password) {
      clientPass = String(__urlData.password).trim();
    } else if (omLinkedClient && omLinkedClient.password) {
      clientPass = String(omLinkedClient.password).trim();
    }
    if (!clientPass) clientPass = localStorage.getItem('client-pass') || CLIENT_PASSWORD || '';`;

if (template.includes(OLD_LOGIN)) {
  template = template.replace(OLD_LOGIN, NEW_LOGIN);
  console.log('✅ Patch 3: URL password support added');
} else {
  console.log('❌ Patch 3 failed: could not find login password check');
}

// 4. Patch window.load to handle ?d= mode (skip JSONBin client check)
const OLD_LOAD = `  if (urlClient) {
    resetFavoritesForClientLink();
    if (!omLinkedClient) {
      alert('לא נמצאו נתוני לקוח ב-JSONBin עבור הקישור הזה.');
      showPanel('landing');
      return;
    }`;

const NEW_LOAD = `  if (urlClient || __urlData) {
    resetFavoritesForClientLink();
    if (!omLinkedClient && !__urlData) {
      alert('לא נמצאו נתוני לקוח ב-JSONBin עבור הקישור הזה.');
      showPanel('landing');
      return;
    }`;

if (template.includes(OLD_LOAD)) {
  template = template.replace(OLD_LOAD, NEW_LOAD);
  console.log('✅ Patch 4: load handler patched for URL mode');
} else {
  console.log('❌ Patch 4 failed');
}

// 5. Show tour notes banner if available from URL
const OLD_ENTER = `function enterApp() {
  if (onboardEnterTimer) {
    clearTimeout(onboardEnterTimer);
    onboardEnterTimer = null;
  }
  omAdminPingClientActivity();`;

const NEW_ENTER = `function enterApp() {
  if (onboardEnterTimer) {
    clearTimeout(onboardEnterTimer);
    onboardEnterTimer = null;
  }
  // Show notes from URL data
  if (__urlData && __urlData.notes) {
    try {
      var nb = document.createElement('div');
      nb.style.cssText = 'background:#f0fdf4;border-bottom:1px solid #bbf7d0;padding:10px 24px;font-size:14px;color:#065f46;line-height:1.5;';
      nb.textContent = '📝 ' + __urlData.notes;
      document.querySelector('.main') && document.querySelector('.main').prepend(nb);
    } catch(e) {}
  }
  omAdminPingClientActivity();`;

if (template.includes(OLD_ENTER)) {
  template = template.replace(OLD_ENTER, NEW_ENTER);
  console.log('✅ Patch 5: notes banner added');
} else {
  console.log('❌ Patch 5 failed');
}

fs.writeFileSync('office-tour-TEMPLATE.html', template);
console.log('\n✅ office-tour-TEMPLATE.html patched!');

// ── Patch admin.html ──────────────────────────────────────────────────────

let admin = fs.readFileSync('admin.html', 'utf8');

// 1. Update tour link to point to office-tour-TEMPLATE.html instead of client.html
admin = admin.replace(
  "var base = location.origin + location.pathname.replace(/\\/[^\\/]*$/,'');\n  var url = base+'/client.html?d='+encoded;",
  "var base = location.origin + location.pathname.replace(/\\/[^\\/]*$/,'');\n  var url = base+'/office-tour-TEMPLATE.html?d='+encoded;"
);
console.log('✅ Patch 6: admin tour link updated to office-tour-TEMPLATE.html');

// 2. Add image + blueprint dropzones to the tour prop form
const OLD_IMAGES_FIELD = `          <div style="grid-column:1/-1;"><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">קישורי תמונות (שורה לכל תמונה)</label><textarea id="tpf-images" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;min-height:56px;resize:vertical;" placeholder="https://..."></textarea></div>`;

const NEW_IMAGES_FIELD = `          <div style="grid-column:1/-1;">
            <label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">תמונות (גרור קבצים או הדבק קישורים)</label>
            <div id="tpf-drop-images" style="border:2px dashed #e2e8f0;border-radius:8px;padding:16px;text-align:center;cursor:pointer;color:#94a3b8;font-size:13px;margin-bottom:8px;transition:border-color .2s;" ondragover="event.preventDefault();this.style.borderColor='#10B981'" ondragleave="this.style.borderColor='#e2e8f0'" ondrop="handleTpfDrop(event,'images')">
              📷 גרור תמונות לכאן
            </div>
            <div id="tpf-thumbs-images" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;"></div>
            <textarea id="tpf-images" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:12px;min-height:44px;resize:vertical;color:#64748b;" placeholder="או הדבק קישורי תמונות (שורה לכל אחת)..."></textarea>
          </div>
          <div style="grid-column:1/-1;">
            <label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:6px;">תשריט (גרור קובץ)</label>
            <div id="tpf-drop-blueprint" style="border:2px dashed #e2e8f0;border-radius:8px;padding:16px;text-align:center;cursor:pointer;color:#94a3b8;font-size:13px;margin-bottom:8px;transition:border-color .2s;" ondragover="event.preventDefault();this.style.borderColor='#10B981'" ondragleave="this.style.borderColor='#e2e8f0'" ondrop="handleTpfDrop(event,'blueprint')">
              📐 גרור תשריט לכאן (תמונה / PDF)
            </div>
            <div id="tpf-thumbs-blueprint" style="display:flex;flex-wrap:wrap;gap:6px;"></div>
          </div>`;

if (admin.includes(OLD_IMAGES_FIELD)) {
  admin = admin.replace(OLD_IMAGES_FIELD, NEW_IMAGES_FIELD);
  console.log('✅ Patch 7: image + blueprint dropzones added');
} else {
  console.log('❌ Patch 7 failed: could not find images field in tour form');
}

// 3. Add drag & drop JS + update confirmAddProp to include images from drop
const OLD_CONFIRM = `function confirmAddProp() {
    var name = document.getElementById('tpf-name').value.trim();
    if (!name) { alert('חובה שם נכס'); return; }
    var imgs = document.getElementById('tpf-images').value.trim();
    var images = imgs ? imgs.split('\\n').map(function(s){return s.trim();}).filter(Boolean) : [];
    _tourProps.push({ id:'tp_'+Date.now(), name:name, address:document.getElementById('tpf-address').value.trim(), size:document.getElementById('tpf-size').value.trim()||null, price:document.getElementById('tpf-price').value.trim()||null, mgmt:document.getElementById('tpf-mgmt').value.trim()||null, floor:document.getElementById('tpf-floor').value.trim()||null, availability:document.getElementById('tpf-avail').value.trim()||null, images:images, clientNotes:document.getElementById('tpf-notes').value.trim()||null });
    document.getElementById('tm-prop-form').style.display='none';
    _renderTourProps();
  }`;

const NEW_CONFIRM = `// Drag & drop storage for current prop form
  var _tpfDropImages = [];
  var _tpfDropBlueprint = null;

  function handleTpfDrop(e, type) {
    e.preventDefault();
    var dropEl = e.currentTarget;
    dropEl.style.borderColor = '#e2e8f0';
    var files = Array.from(e.dataTransfer.files);
    if (!files.length) return;
    files.forEach(function(file) {
      var reader = new FileReader();
      reader.onload = function(ev) {
        var dataUrl = ev.target.result;
        if (type === 'images') {
          _tpfDropImages.push(dataUrl);
          var thumb = document.createElement('img');
          thumb.src = dataUrl;
          thumb.style.cssText = 'width:56px;height:42px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;';
          document.getElementById('tpf-thumbs-images').appendChild(thumb);
        } else {
          _tpfDropBlueprint = dataUrl;
          var thumbEl = document.getElementById('tpf-thumbs-blueprint');
          thumbEl.innerHTML = '';
          var img = document.createElement('img');
          img.src = dataUrl;
          img.style.cssText = 'width:80px;height:60px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;';
          thumbEl.appendChild(img);
        }
      };
      reader.readAsDataURL(file);
    });
  }
  window.handleTpfDrop = handleTpfDrop;

  function confirmAddProp() {
    var name = document.getElementById('tpf-name').value.trim();
    if (!name) { alert('חובה שם נכס'); return; }
    var imgs = document.getElementById('tpf-images').value.trim();
    var urlImages = imgs ? imgs.split('\\n').map(function(s){return s.trim();}).filter(Boolean) : [];
    var allImages = _tpfDropImages.concat(urlImages);
    _tourProps.push({
      id:'tp_'+Date.now(),
      name:name,
      address:document.getElementById('tpf-address').value.trim(),
      size:document.getElementById('tpf-size').value.trim()||null,
      price:document.getElementById('tpf-price').value.trim()||null,
      mgmt:document.getElementById('tpf-mgmt').value.trim()||null,
      floor:document.getElementById('tpf-floor').value.trim()||null,
      availability:document.getElementById('tpf-avail').value.trim()||null,
      images:allImages,
      img: allImages[0]||null,
      blueprint: _tpfDropBlueprint||null,
      clientNotes:document.getElementById('tpf-notes').value.trim()||null
    });
    _tpfDropImages = [];
    _tpfDropBlueprint = null;
    document.getElementById('tm-prop-form').style.display='none';
    _renderTourProps();
  }`;

if (admin.includes(OLD_CONFIRM)) {
  admin = admin.replace(OLD_CONFIRM, NEW_CONFIRM);
  console.log('✅ Patch 8: drag & drop JS + confirmAddProp updated');
} else {
  console.log('❌ Patch 8 failed: confirmAddProp not found');
}

// 4. Clear drop state when form opens
const OLD_OPEN_FORM = `function openAddTourPropForm() {
    document.getElementById('tm-prop-form').style.display = 'block';
    ['tpf-name','tpf-address','tpf-size','tpf-price','tpf-mgmt','tpf-floor','tpf-avail','tpf-images','tpf-notes'].forEach(function(id){ document.getElementById(id).value=''; });
  }`;

const NEW_OPEN_FORM = `function openAddTourPropForm() {
    _tpfDropImages = [];
    _tpfDropBlueprint = null;
    document.getElementById('tm-prop-form').style.display = 'block';
    ['tpf-name','tpf-address','tpf-size','tpf-price','tpf-mgmt','tpf-floor','tpf-avail','tpf-images','tpf-notes'].forEach(function(id){ document.getElementById(id).value=''; });
    var ti = document.getElementById('tpf-thumbs-images'); if(ti) ti.innerHTML='';
    var tb = document.getElementById('tpf-thumbs-blueprint'); if(tb) tb.innerHTML='';
  }`;

if (admin.includes(OLD_OPEN_FORM)) {
  admin = admin.replace(OLD_OPEN_FORM, NEW_OPEN_FORM);
  console.log('✅ Patch 9: form reset updated');
} else {
  console.log('❌ Patch 9 failed');
}

fs.writeFileSync('admin.html', admin);
console.log('\n✅ admin.html patched!');
console.log('\nRun: git add . && git commit -m "url-data + drag drop" && git push');
