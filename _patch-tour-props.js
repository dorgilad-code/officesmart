const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'office-tour-TEMPLATE.html');
const s = fs.readFileSync(file, 'utf8');

const start = s.indexOf('let properties = [');
if (start === -1) throw new Error('let properties = [ not found');

const tourComment = '// Prefer tour-specific properties (per client). Fall back to global import.';
const tcFull = s.indexOf(tourComment);
if (tcFull === -1) throw new Error('tour comment not found');

const afterCatch = '\n} catch (e) {}\n\nvar nearbyPlacesCache';
const m = s.indexOf(afterCatch, tcFull);
if (m === -1) throw new Error('tour try/catch end not found');
const keepStart = m + '\n} catch (e) {}\n\n'.length;

const newInit = `let properties = [];

(function () {
  try {
    var __cid = '';
    try {
      var __sp = new URLSearchParams(location.search || '');
      __cid = __sp.get('client') || __sp.get('cid') || '';
    } catch (eCid) {}

    if (__cid) {
      var __map = JSON.parse(localStorage.getItem('om-client-tour-props') || '{}') || {};
      var __arr = __map[__cid];
      properties = Array.isArray(__arr) && __arr.length ? __arr.slice() : [];
      if (properties.length) {
        try { localStorage.setItem('tour-properties', JSON.stringify(properties)); } catch (eSet) {}
      }
    } else {
      var raw = localStorage.getItem('om-admin-properties');
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) properties = arr.slice();
      }
    }
  } catch (e) {}
})();

`;

const imgsOnlyIife = `(function () {
  try {
    var rawI = localStorage.getItem('om-admin-imgs');
    if (rawI) {
      var extra = JSON.parse(rawI);
      if (extra && typeof extra === 'object') {
        Object.keys(extra).forEach(function (k) {
          IMGS[k] = extra[k];
        });
      }
    }
  } catch (e) {}
})();

`;

const out = s.slice(0, start) + newInit + imgsOnlyIife + s.slice(keepStart);
fs.writeFileSync(file, out, 'utf8');
console.log('Patched OK', s.length, '->', out.length);
