#!/usr/bin/env python3
"""
Run this script in your OfficeSmart folder to patch admin.html.
Usage: python3 patch_admin.py
"""
import re, sys, os

src = 'admin.html'
if not os.path.exists(src):
    print("ERROR: admin.html not found in current directory")
    sys.exit(1)

with open(src, 'r', encoding='utf-8') as f:
    html = f.read()

# ── 1. Add tour button in dashboard table row ──────────────────────────────
# Find the delete button td and add tour button before it
old_del_td = "'<td style=\"text-align:center;width:52px;\">' +\n        '<button type=\"button\" class=\"btn btn-danger btn-sm\" data-del-client=\"'"
new_del_td = """'<td style="text-align:center;">' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="openTourModal(\\''+escAttr(c.id)+'\\')">🏢 סיור</button>' +
        '</td>' +
        '<td style="text-align:center;width:52px;">' +
        '<button type="button" class="btn btn-danger btn-sm" data-del-client="'"""

if old_del_td in html:
    html = html.replace(old_del_td, new_del_td)
    print("✅ Patch 1: tour button added to dashboard rows")
else:
    # Try simpler match
    old2 = "'<td style=\"text-align:center;width:52px;\">' +\n        '<button type=\"button\" class=\"btn btn-danger btn-sm\" data-del-client=\"' +"
    if old2 in html:
        html = html.replace(old2, """'<td style="text-align:center;">' +
        '<button type="button" class="btn btn-primary btn-sm" onclick="openTourModal(\\'' + escAttr(c.id) + '\\')">🏢 סיור</button>' +
        '</td>' +
        '<td style="text-align:center;width:52px;">' +
        '<button type="button" class="btn btn-danger btn-sm" data-del-client="' +""")
        print("✅ Patch 1 (alt): tour button added")
    else:
        print("⚠️  Patch 1: could not find exact location — adding manually after WhatsApp button logic")
        # Fallback: inject after the WhatsApp button block
        html = html.replace(
            "' <button type=\"button\" class=\"btn btn-outline btn-sm\" data-edit-client=\"' + escAttr(c.id) + '\">ערוך</button>' +\n        '</td>' +",
            "' <button type=\"button\" class=\"btn btn-outline btn-sm\" data-edit-client=\"' + escAttr(c.id) + '\">ערוך</button>' +\n        ' <button type=\"button\" class=\"btn btn-primary btn-sm\" onclick=\"openTourModal(\\'' + escAttr(c.id) + '\\')\" >🏢 סיור</button>' +\n        '</td>' +"
        )
        print("✅ Patch 1 (fallback): tour button added after edit button")

# ── 2. Add tour modal HTML before </body> ─────────────────────────────────
tour_modal = """
<!-- Modal: יצירת סיור ללקוח (URL-encoded, no JSONBin) -->
<div id="modal-tour" style="display:none;position:fixed;inset:0;z-index:1002;background:rgba(15,23,42,0.45);align-items:center;justify-content:center;padding:16px;overflow-y:auto;">
  <div style="background:#fff;border-radius:16px;max-width:600px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,0.18);margin:auto;">
    <div style="padding:18px 22px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
      <div>
        <div style="font-size:17px;font-weight:800;">🏢 סיור חדש</div>
        <div style="font-size:13px;color:#64748b;margin-top:2px;">ללקוח: <strong id="tm-client-name"></strong></div>
      </div>
      <button type="button" onclick="closeTourModal()" style="width:32px;height:32px;border-radius:50%;border:none;background:#f8fafc;cursor:pointer;font-size:18px;">×</button>
    </div>
    <div style="padding:16px 22px 20px;overflow-y:auto;flex:1;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
        <div>
          <label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">סיסמת כניסה ללקוח</label>
          <input id="tm-password" type="text" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:14px;" placeholder="לדוג׳ Cohen2024">
        </div>
        <div>
          <label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">הערות ללקוח</label>
          <input id="tm-notes" type="text" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:14px;" placeholder="אופציונלי">
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <div style="font-size:13px;font-weight:700;">נכסים לסיור</div>
        <button type="button" class="btn btn-primary btn-sm" onclick="openAddTourPropForm()">+ הוסף נכס</button>
      </div>
      <div id="tm-props-list"></div>
      <!-- טופס הוספת נכס -->
      <div id="tm-prop-form" style="display:none;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin-top:12px;">
        <div style="font-size:13px;font-weight:800;margin-bottom:12px;">פרטי הנכס</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div style="grid-column:1/-1;"><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">שם הנכס *</label><input id="tpf-name" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;" placeholder="מגדל שרונה 18"></div>
          <div style="grid-column:1/-1;"><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">כתובת</label><input id="tpf-address" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;"></div>
          <div><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">שטח (מ"ר)</label><input id="tpf-size" type="number" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;"></div>
          <div><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">מחיר למ"ר (₪)</label><input id="tpf-price" type="number" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;"></div>
          <div><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">דמי ניהול (₪/מ"ר)</label><input id="tpf-mgmt" type="number" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;"></div>
          <div><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">קומה</label><input id="tpf-floor" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;"></div>
          <div><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">זמינות</label><input id="tpf-avail" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;" placeholder="מיידית"></div>
          <div style="grid-column:1/-1;"><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">קישורי תמונות (שורה לכל תמונה)</label><textarea id="tpf-images" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;min-height:56px;resize:vertical;" placeholder="https://..."></textarea></div>
          <div style="grid-column:1/-1;"><label style="font-size:12px;font-weight:700;color:#64748b;display:block;margin-bottom:4px;">הערות</label><input id="tpf-notes" style="width:100%;padding:9px 12px;border:1px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:13px;"></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end;">
          <button type="button" class="btn btn-outline btn-sm" onclick="cancelAddProp()">ביטול</button>
          <button type="button" class="btn btn-primary btn-sm" onclick="confirmAddProp()">✓ הוסף לסיור</button>
        </div>
      </div>
      <div style="margin-top:20px;">
        <button type="button" class="btn btn-primary" onclick="generateTourLink()" style="width:100%;padding:13px;">🔗 צור קישור ללקוח</button>
      </div>
      <div id="tm-link-wrap" style="display:none;margin-top:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:14px;">
        <div style="font-size:12px;font-weight:700;color:#065f46;margin-bottom:8px;">✅ הקישור מוכן — שלח ללקוח</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
          <input id="tm-link-out" readonly style="flex:1;min-width:200px;padding:9px 12px;border:1px solid #bbf7d0;border-radius:8px;font-size:12px;background:#fff;font-family:monospace;">
          <button type="button" class="btn btn-primary btn-sm" onclick="copyTourLink()">📋 העתק</button>
          <a id="tm-link-open" href="#" target="_blank" class="btn btn-outline btn-sm">פתח ←</a>
        </div>
      </div>
    </div>
  </div>
</div>
"""

if '</body>' in html:
    html = html.replace('</body>', tour_modal + '\n</body>')
    print("✅ Patch 2: tour modal HTML added")
else:
    print("❌ Patch 2 failed: </body> not found")

# ── 3. Add JS functions before closing })(); ──────────────────────────────
tour_js = """
  // ══ TOUR CREATION (URL-encoded) ══
  var _tourClientId = null;
  var _tourProps = [];

  function openTourModal(cid) {
    _tourClientId = cid;
    _tourProps = [];
    var c = mergeDashboardClients().find(function(x){ return x.id === cid; });
    document.getElementById('tm-client-name').textContent = c ? (c.name || c.email) : cid;
    document.getElementById('tm-password').value = (c && c.password) ? c.password : '';
    document.getElementById('tm-notes').value = '';
    document.getElementById('tm-link-wrap').style.display = 'none';
    document.getElementById('tm-prop-form').style.display = 'none';
    _renderTourProps();
    document.getElementById('modal-tour').style.display = 'flex';
  }

  function closeTourModal() {
    document.getElementById('modal-tour').style.display = 'none';
    _tourClientId = null; _tourProps = [];
  }

  function _renderTourProps() {
    var host = document.getElementById('tm-props-list');
    if (!_tourProps.length) {
      host.innerHTML = '<p style="color:#64748b;font-size:13px;padding:8px 0;">אין נכסים עדיין — לחץ &ldquo;+ הוסף נכס&rdquo;</p>';
      return;
    }
    host.innerHTML = _tourProps.map(function(p, i) {
      return '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:6px;">' +
        '<div style="font-size:13px;"><strong>' + esc(p.name) + '</strong>' + (p.address ? ' · ' + esc(p.address) : '') + (p.size ? ' · ' + esc(String(p.size)) + ' מ"ר' : '') + '</div>' +
        '<button type="button" class="btn btn-danger btn-sm" onclick="removeTourProp(' + i + ')">הסר</button></div>';
    }).join('');
  }

  function removeTourProp(i) { _tourProps.splice(i, 1); _renderTourProps(); }

  function openAddTourPropForm() {
    document.getElementById('tm-prop-form').style.display = 'block';
    ['tpf-name','tpf-address','tpf-size','tpf-price','tpf-mgmt','tpf-floor','tpf-avail','tpf-images','tpf-notes'].forEach(function(id){ document.getElementById(id).value = ''; });
  }

  function cancelAddProp() { document.getElementById('tm-prop-form').style.display = 'none'; }

  function confirmAddProp() {
    var name = document.getElementById('tpf-name').value.trim();
    if (!name) { alert('חובה שם נכס'); return; }
    var imgsRaw = document.getElementById('tpf-images').value.trim();
    var images = imgsRaw ? imgsRaw.split('\\n').map(function(s){ return s.trim(); }).filter(Boolean) : [];
    _tourProps.push({
      id: 'tp_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
      name: name,
      address: document.getElementById('tpf-address').value.trim() || '',
      size: document.getElementById('tpf-size').value.trim() || null,
      price: document.getElementById('tpf-price').value.trim() || null,
      mgmt: document.getElementById('tpf-mgmt').value.trim() || null,
      floor: document.getElementById('tpf-floor').value.trim() || null,
      availability: document.getElementById('tpf-avail').value.trim() || null,
      images: images,
      clientNotes: document.getElementById('tpf-notes').value.trim() || null,
    });
    document.getElementById('tm-prop-form').style.display = 'none';
    _renderTourProps();
  }

  function generateTourLink() {
    if (!_tourProps.length) { alert('הוסף לפחות נכס אחד'); return; }
    var c = mergeDashboardClients().find(function(x){ return x.id === _tourClientId; });
    var password = document.getElementById('tm-password').value.trim();
    var notes = document.getElementById('tm-notes').value.trim();
    var payload = {
      clientId: _tourClientId,
      clientName: c ? (c.name || c.email) : '',
      password: password,
      notes: notes,
      props: _tourProps,
      ts: Date.now()
    };
    var encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    var base = location.origin + location.pathname.replace(/\\/[^\\/]*$/, '');
    var url = base + '/client.html?d=' + encoded;
    document.getElementById('tm-link-out').value = url;
    var openEl = document.getElementById('tm-link-open');
    if (openEl) openEl.href = url;
    document.getElementById('tm-link-wrap').style.display = 'block';
  }

  function copyTourLink() {
    var v = document.getElementById('tm-link-out').value;
    try { navigator.clipboard.writeText(v); } catch(e) {}
    alert('הקישור הועתק!');
  }
"""

closing = '})();'
if html.count(closing) == 1:
    html = html.replace(closing, tour_js + '\n' + closing)
    print("✅ Patch 3: tour JS functions added")
else:
    print("⚠️  Multiple/no closing IIFE found, count:", html.count(closing))
    # Try to insert before last occurrence
    last_idx = html.rfind(closing)
    if last_idx != -1:
        html = html[:last_idx] + tour_js + '\n' + html[last_idx:]
        print("✅ Patch 3 (last occurrence): tour JS added")

with open(src, 'w', encoding='utf-8') as f:
    f.write(html)

print("\n✅ admin.html patched successfully!")
print("Next: git add . && git commit -m 'add tour creation' && git push")
