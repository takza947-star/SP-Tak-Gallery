let selectedFrames = [];
let lastClickedFrame = null;
let rangeModeActive = false;
let rangeStartFrame = null;
const MASTER_CURATION_VERSION = '20260905_v10';
const savedVersion = localStorage.getItem('sp_tak_master_version');
const savedMarks = localStorage.getItem('sp_tak_gallery_marks');

let marks = {};
try {
  // If version changed, or local marks are missing or empty, auto-populate with Master Curation
  if (savedVersion !== MASTER_CURATION_VERSION || !savedMarks || savedMarks === '{}' || savedMarks === '[]') {
    marks = Object.assign({}, window.DEFAULT_MASTER_MARKS || {});
    localStorage.setItem('sp_tak_gallery_marks', JSON.stringify(marks));
    localStorage.setItem('sp_tak_master_version', MASTER_CURATION_VERSION);
  } else {
    marks = JSON.parse(savedMarks);
    if (Object.keys(marks).length === 0 && window.DEFAULT_MASTER_MARKS) {
      marks = Object.assign({}, window.DEFAULT_MASTER_MARKS);
    }
  }
} catch(e) {
  marks = Object.assign({}, window.DEFAULT_MASTER_MARKS || {});
}

function loadDefaultMasterMarks() {
  if (!window.DEFAULT_MASTER_MARKS || Object.keys(window.DEFAULT_MASTER_MARKS).length === 0) {
    showToast('⚠️ ไม่พบข้อมูล Master Curation ในระบบ');
    return;
  }
  const count = Object.keys(window.DEFAULT_MASTER_MARKS).length;
  if (confirm(`ต้องการโหลดข้อมูล Master Curation ทั้งหมด (${count} ช่วงที่คัดไว้) มาทับรายการในเครื่องนี้ใช่หรือไม่?`)) {
    marks = Object.assign({}, window.DEFAULT_MASTER_MARKS);
    localStorage.setItem('sp_tak_gallery_marks', JSON.stringify(marks));
    localStorage.setItem('sp_tak_master_version', MASTER_CURATION_VERSION);
    restoreMarksUI();
    updateBasketBadge();
    renderBasketList();
    showToast(`✅ โหลดข้อมูล Master Curation (${count} ช่วง) เรียบร้อยแล้ว`);
  }
}

function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (typeof imported !== 'object' || imported === null) {
          throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
        }
        marks = imported;
        localStorage.setItem('sp_tak_gallery_marks', JSON.stringify(marks));
        restoreMarksUI();
        updateBasketBadge();
        renderBasketList();
        showToast(`✅ นำเข้าข้อมูลมาร์กสำเร็จ (${Object.keys(marks).length} รายการ)`);
      } catch(err) {
        alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

window.addEventListener('DOMContentLoaded', () => {
  restoreMarksUI();
  updateBasketBadge();
  if (typeof initIntervalCuration === 'function') {
    initIntervalCuration();
  } else if (typeof initCanonicalCuration === 'function') {
    initCanonicalCuration();
  }
});

function toggleRangeMode() {
  rangeModeActive = !rangeModeActive;
  rangeStartFrame = null;
  const btn = document.getElementById('btn-range-mode');
  const status = document.getElementById('range-status');
  
  if (rangeModeActive) {
    btn.classList.add('active');
    status.innerText = 'เปิด (แตะเริ่ม ➔ แตะจบ)';
  } else {
    btn.classList.remove('active');
    status.innerText = 'ปิด';
    document.querySelectorAll('.range-anchor').forEach(el => el.classList.remove('range-anchor'));
  }
}

function switchTab(prodCode) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    if (b.getAttribute('onclick') && b.getAttribute('onclick').includes(`'${prodCode}'`)) {
      b.classList.add('active');
    }
  });
  document.querySelectorAll('.prod-section').forEach(s => s.classList.remove('active'));
  const targetSec = document.getElementById('sec_' + prodCode);
  if (targetSec) targetSec.classList.add('active');
  if (prodCode === 'washer') {
    if (typeof renderIntervalCards === 'function') {
      renderIntervalCards();
    } else if (typeof renderCanonicalCards === 'function') {
      renderCanonicalCards();
    }
  }
}

function handleFrameClick(e, prod, folder, sec, label, idx) {
  const el = e.currentTarget;
  
  // 1. Mobile Range Mode
  if (rangeModeActive) {
    if (!rangeStartFrame || rangeStartFrame.dataset.folder !== folder) {
      document.querySelectorAll('.range-anchor').forEach(c => c.classList.remove('range-anchor'));
      rangeStartFrame = el;
      el.classList.add('range-anchor');
      if (!selectedFrames.includes(el)) {
        selectedFrames.push(el);
        el.classList.add('selected');
      }
    } else {
      const startIdx = parseInt(rangeStartFrame.dataset.idx);
      const endIdx = idx;
      const minI = Math.min(startIdx, endIdx);
      const maxI = Math.max(startIdx, endIdx);
      
      const grid = el.parentElement;
      const allCards = Array.from(grid.querySelectorAll('.frame-item'));
      
      for (let i = minI; i <= maxI; i++) {
        const card = allCards[i];
        if (!selectedFrames.includes(card)) {
          selectedFrames.push(card);
          card.classList.add('selected');
        }
      }
      rangeStartFrame.classList.remove('range-anchor');
      rangeStartFrame = null;
    }
    updateFloatingBar();
    return;
  }
  
  // 2. PC Shift + Click
  if (e.shiftKey && lastClickedFrame && lastClickedFrame.dataset.folder === folder) {
    const startIdx = parseInt(lastClickedFrame.dataset.idx);
    const endIdx = idx;
    const minI = Math.min(startIdx, endIdx);
    const maxI = Math.max(startIdx, endIdx);
    
    const grid = el.parentElement;
    const allCards = Array.from(grid.querySelectorAll('.frame-item'));
    
    for (let i = minI; i <= maxI; i++) {
      const card = allCards[i];
      if (!selectedFrames.includes(card)) {
        selectedFrames.push(card);
        card.classList.add('selected');
      }
    }
  } else {
    // Single Click toggle
    if (selectedFrames.includes(el)) {
      selectedFrames = selectedFrames.filter(item => item !== el);
      el.classList.remove('selected');
    } else {
      selectedFrames.push(el);
      el.classList.add('selected');
    }
  }
  
  lastClickedFrame = el;
  updateFloatingBar();
}

function updateFloatingBar() {
  const bar = document.getElementById('floating-bar');
  const countEl = document.getElementById('sel-count');
  const rangeEl = document.getElementById('sel-range');
  const durEl = document.getElementById('sel-dur');
  
  if (selectedFrames.length === 0) {
    bar.classList.remove('show');
    return;
  }
  
  selectedFrames.sort((a, b) => parseFloat(a.dataset.sec) - parseFloat(b.dataset.sec));
  const first = selectedFrames[0];
  const last = selectedFrames[selectedFrames.length - 1];
  
  const minSec = parseFloat(first.dataset.sec);
  const maxSec = parseFloat(last.dataset.sec);
  const totalDur = (maxSec - minSec + 2.0).toFixed(1);
  
  countEl.innerText = selectedFrames.length;
  rangeEl.innerText = `${first.dataset.label} - ${last.dataset.label}`;
  durEl.innerText = `${totalDur}s`;
  
  bar.classList.add('show');
}

function selectAllInFile(prod, folder) {
  const cardId = `${prod}_${folder}`;
  const grid = document.getElementById(`grid_${cardId}`);
  if (!grid) return;
  
  grid.querySelectorAll('.frame-item').forEach(card => {
    if (!selectedFrames.includes(card)) {
      selectedFrames.push(card);
      card.classList.add('selected');
    }
  });
  updateFloatingBar();
}

function clearFileSelection(prod, folder) {
  const cardId = `${prod}_${folder}`;
  const grid = document.getElementById(`grid_${cardId}`);
  if (!grid) return;
  
  grid.querySelectorAll('.frame-item').forEach(card => {
    selectedFrames = selectedFrames.filter(c => c !== card);
    card.classList.remove('selected', 'range-anchor');
  });
  updateFloatingBar();
}

function clearFileMarks(prod, folder) {
  const cardId = `${prod}_${folder}`;
  const grid = document.getElementById(`grid_${cardId}`);
  if (!grid) return;
  
  // Remove from marks dictionary
  Object.keys(marks).forEach(k => {
    if (marks[k].folder === folder && marks[k].prod === prod) {
      delete marks[k];
    }
  });
  localStorage.setItem('sp_tak_gallery_marks', JSON.stringify(marks));
  
  // Remove visual classes and tags
  grid.querySelectorAll('.frame-item').forEach(card => {
    selectedFrames = selectedFrames.filter(c => c !== card);
    card.classList.remove('selected', 'marked-approved', 'marked-banned', 'range-anchor');
    card.querySelectorAll('.tag-badge, .comment-bubble').forEach(b => b.remove());
  });
  
  updateFloatingBar();
  updateBasketBadge();
  renderBasketList();
  showToast(`ล้างมาร์กใน ${folder} เรียบร้อย`);
}

function clearActiveSelection() {
  selectedFrames.forEach(el => el.classList.remove('selected', 'range-anchor'));
  selectedFrames = [];
  lastClickedFrame = null;
  rangeStartFrame = null;
  updateFloatingBar();
}

function removeTagFromSelection() {
  if (selectedFrames.length === 0) return;
  
  const selectedIds = new Set(selectedFrames.map(el => el.id));
  
  // Remove from marks dictionary
  Object.keys(marks).forEach(key => {
    const m = marks[key];
    const hasOverlap = (m.frameIds && m.frameIds.some(fid => selectedIds.has(fid))) ||
      selectedFrames.some(el => {
        const sec = parseFloat(el.dataset.sec);
        return el.dataset.folder === m.folder && sec >= m.start && sec <= m.end;
      });
      
    if (hasOverlap) {
      if (m.frameIds) {
        m.frameIds.forEach(fid => {
          const el = document.getElementById(fid);
          if (el) {
            el.classList.remove('marked-approved', 'marked-banned');
            el.querySelectorAll('.tag-badge, .comment-bubble').forEach(b => b.remove());
          }
        });
      }
      delete marks[key];
    }
  });
  
  // Clean DOM on selected elements
  selectedFrames.forEach(el => {
    el.classList.remove('marked-approved', 'marked-banned');
    el.querySelectorAll('.tag-badge, .comment-bubble').forEach(b => b.remove());
  });
  
  localStorage.setItem('sp_tak_gallery_marks', JSON.stringify(marks));
  clearActiveSelection();
  updateBasketBadge();
  renderBasketList();
  showToast('🧹 ลบมาร์กของช็อตที่เลือกเรียบร้อย');
}

function applyTagToSelection(type) {
  if (selectedFrames.length === 0) return;
  const comment = document.getElementById('comment-input').value.trim();
  
  selectedFrames.sort((a, b) => parseFloat(a.dataset.sec) - parseFloat(b.dataset.sec));
  const first = selectedFrames[0];
  const last = selectedFrames[selectedFrames.length - 1];
  const prod = first.dataset.prod;
  const prodName = first.dataset.prodname;
  const file = first.dataset.file;
  const folder = first.dataset.folder;
  
  const startSec = parseFloat(first.dataset.sec);
  const endSec = parseFloat(last.dataset.sec);
  const key = `${prod}__${folder}__${startSec}_${endSec}`;
  
  marks[key] = {
    id: key,
    prod: prod,
    prodName: prodName,
    file: file,
    folder: folder,
    start: startSec,
    end: endSec,
    startLabel: first.dataset.label,
    endLabel: last.dataset.label,
    duration: parseFloat((endSec - startSec + 2.0).toFixed(1)),
    type: type, // APPROVED or BANNED
    comment: comment,
    frameIds: selectedFrames.map(el => el.id)
  };
  
  localStorage.setItem('sp_tak_gallery_marks', JSON.stringify(marks));
  
  selectedFrames.forEach(el => {
    el.classList.remove('marked-approved', 'marked-banned', 'range-anchor');
    el.classList.add(type === 'APPROVED' ? 'marked-approved' : 'marked-banned');
    
    el.querySelectorAll('.tag-badge, .comment-bubble').forEach(b => b.remove());
    
    const tagBadge = document.createElement('div');
    tagBadge.className = `tag-badge ${type.toLowerCase()}`;
    tagBadge.innerText = type === 'APPROVED' ? '✅ เอา' : '🚫 แบน';
    el.appendChild(tagBadge);
    
    if (comment) {
      const cBadge = document.createElement('div');
      cBadge.className = 'comment-bubble';
      cBadge.innerText = '💬';
      cBadge.title = comment;
      el.appendChild(cBadge);
    }
  });
  
  document.getElementById('comment-input').value = '';
  clearActiveSelection();
  updateBasketBadge();
  renderBasketList();
  showToast(type === 'APPROVED' ? 'บันทึกช็อตที่เลือก (Keep) แล้ว' : 'บันทึกช็อตที่สั่งแบน (Ban) แล้ว');
}

function restoreMarksUI() {
  Object.values(marks).forEach(m => {
    if (m.frameIds && m.frameIds.length > 0) {
      m.frameIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          applyMarkToElement(el, m);
        }
      });
    }
    // Fallback if IDs changed
    if (m.folder && m.start !== undefined && m.end !== undefined) {
      const folderEl = document.getElementById(`grid_${m.prod}_${m.folder}`);
      if (folderEl) {
        folderEl.querySelectorAll('.frame-item').forEach(el => {
          const sec = parseFloat(el.dataset.sec);
          if (sec >= m.start && sec <= m.end) {
            applyMarkToElement(el, m);
          }
        });
      }
    }
  });
}

function applyMarkToElement(el, m) {
  el.classList.remove('marked-approved', 'marked-banned');
  el.classList.add(m.type === 'APPROVED' ? 'marked-approved' : 'marked-banned');
  el.querySelectorAll('.tag-badge, .comment-bubble').forEach(b => b.remove());
  
  const tagBadge = document.createElement('div');
  tagBadge.className = `tag-badge ${m.type.toLowerCase()}`;
  tagBadge.innerText = m.type === 'APPROVED' ? '✅ เอา' : '🚫 แบน';
  el.appendChild(tagBadge);
  
  if (m.comment) {
    const cBadge = document.createElement('div');
    cBadge.className = 'comment-bubble';
    cBadge.innerText = '💬';
    cBadge.title = m.comment;
    el.appendChild(cBadge);
  }
}

function toggleBasket() {
  const modal = document.getElementById('basket-modal');
  const backdrop = document.getElementById('backdrop');
  modal.classList.toggle('open');
  backdrop.classList.toggle('show');
  if (modal.classList.contains('open')) {
    renderBasketList();
  }
}

function updateBasketBadge() {
  const total = Object.keys(marks).length;
  document.getElementById('total-marked-badge').innerText = total;
}

function renderBasketList() {
  const container = document.getElementById('basket-list');
  const items = Object.values(marks);
  
  if (items.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:40px 0; font-size:13px;">ยังไม่มีช็อตที่มาร์กไว้<br>แตะเลือกรูปแล้วกด "มาร์กเป็น เอา/แบน" ได้เลยครับ</div>';
    return;
  }
  
  let html = '';
  items.forEach(m => {
    const typeLabel = m.type === 'APPROVED' ? '✅ เอา (Keep)' : '🚫 แบน (Banned)';
    const typeClass = m.type === 'APPROVED' ? 'approved' : 'banned';
    
    html += `
      <div class="curated-item ${typeClass}">
        <button class="btn-remove-item" onclick="removeMark('${m.id}')">✕</button>
        <div class="curated-title">${typeLabel} - ${m.file}</div>
        <div class="curated-meta">⏱️ ช่วง: ${m.startLabel} ➔ ${m.endLabel} (~${m.duration}s) | ${m.prodName || m.prod}</div>
        ${m.comment ? `<div class="curated-comment">💬 หมายเหตุ: ${m.comment}</div>` : ''}
      </div>
    `;
  });
  container.innerHTML = html;
}

function removeMark(id) {
  const m = marks[id];
  if (m) {
    if (m.frameIds) {
      m.frameIds.forEach(fid => {
        const el = document.getElementById(fid);
        if (el) {
          el.classList.remove('marked-approved', 'marked-banned');
          el.querySelectorAll('.tag-badge, .comment-bubble').forEach(b => b.remove());
        }
      });
    }
    if (m.folder && m.start !== undefined && m.end !== undefined) {
      const folderEl = document.getElementById(`grid_${m.prod}_${m.folder}`);
      if (folderEl) {
        folderEl.querySelectorAll('.frame-item').forEach(el => {
          const sec = parseFloat(el.dataset.sec);
          if (sec >= m.start && sec <= m.end) {
            el.classList.remove('marked-approved', 'marked-banned');
            el.querySelectorAll('.tag-badge, .comment-bubble').forEach(b => b.remove());
          }
        });
      }
    }
    delete marks[id];
    localStorage.setItem('sp_tak_gallery_marks', JSON.stringify(marks));
    updateBasketBadge();
    renderBasketList();
    showToast('ลบรายการมาร์กออกแล้ว');
  }
}

function clearAllMarks() {
  if (!confirm('ต้องการล้างรายการที่มาร์กไว้ทั้งหมดใช่หรือไม่?')) return;
  marks = {};
  localStorage.removeItem('sp_tak_gallery_marks');
  document.querySelectorAll('.frame-item').forEach(el => {
    el.classList.remove('selected', 'marked-approved', 'marked-banned', 'range-anchor');
    el.querySelectorAll('.tag-badge, .comment-bubble').forEach(b => b.remove());
  });
  selectedFrames = [];
  lastClickedFrame = null;
  rangeStartFrame = null;
  updateFloatingBar();
  updateBasketBadge();
  renderBasketList();
  showToast('🗑️ ล้างรายการมาร์กทั้งหมดเรียบร้อย');
}

function copyCuratedPrompt() {
  const items = Object.values(marks);
  if (items.length === 0) {
    alert('ยังไม่มีรายการที่มาร์กไว้ครับ');
    return;
  }
  
  let prompt = `# 🎬 คำสั่งเลือกและแบนช็อตฟุตเทจ (SP Tak Curation)\n\n`;
  
  const approved = items.filter(i => i.type === 'APPROVED');
  const banned = items.filter(i => i.type === 'BANNED');
  
  if (approved.length > 0) {
    prompt += `## ✅ [ช็อตที่เลือกใช้ (Approved Shots)]:\n`;
    approved.forEach((a, idx) => {
      prompt += `${idx + 1}. ไฟล์: ${a.file} | ช่วง: ${a.start}s - ${a.end}s (~${a.duration}s)${a.comment ? ` | คำสั่ง: ${a.comment}` : ''}\n`;
    });
    prompt += `\n`;
  }
  
  if (banned.length > 0) {
    prompt += `## ❌ [ช็อตที่สั่งแบน ห้ามใช้เด็ดขาด (Banned Shots)]:\n`;
    banned.forEach((b, idx) => {
      prompt += `${idx + 1}. ไฟล์: ${b.file} | ช่วง: ${b.start}s - ${b.end}s${b.comment ? ` | เหตุผล: ${b.comment}` : ''}\n`;
    });
  }
  
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(prompt).then(() => {
      showToast('คัดลอกคำสั่งสำหรับส่งให้ AI เรียบร้อย!');
    });
  } else {
    alert(prompt);
  }
}

function downloadJSON() {
  const items = Object.values(marks);
  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    items: items
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `sp-tak-curation-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openZoom(src, title, time) {
  const modal = document.getElementById('preview-modal');
  const img = document.getElementById('preview-img');
  const titleEl = document.getElementById('preview-meta-title');
  const timeEl = document.getElementById('preview-meta-time');
  
  img.src = src;
  titleEl.innerText = title;
  timeEl.innerText = time;
  modal.classList.add('show');
}

function closePreview(e) {
  document.getElementById('preview-modal').classList.remove('show');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

// ==========================================
// Speech Recognition (Voice-to-Text ภาษาไทย)
// ==========================================
let recognition = null;
let isRecording = false;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('เบราว์เซอร์นี้ไม่รองรับ Web Speech API กรุณาเปิดผ่าน Google Chrome, Edge หรือ Safari บนมือถือครับ');
    return null;
  }
  const rec = new SpeechRecognition();
  rec.lang = 'th-TH';
  rec.continuous = true;
  rec.interimResults = true;
  
  rec.onstart = () => {
    isRecording = true;
    const btn = document.getElementById('btn-mic');
    const bar = document.getElementById('unified-input-bar');
    if (btn) {
      btn.classList.add('recording');
      btn.innerHTML = '<span class="mic-svg-icon">🔴</span><span class="mic-text">กำลังฟัง...</span>';
    }
    if (bar) {
      bar.classList.add('recording-active');
    }
    showToast('🎙️ กำลังฟังเสียงพูดภาษาไทย... พูดได้เลยครับ');
  };
  
  rec.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';
    for (let i = 0; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }
    const input = document.getElementById('comment-input');
    if (input) {
      input.value = (finalTranscript || interimTranscript).trim();
    }
  };
  
  rec.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    stopSpeechRecognition();
    if (event.error === 'not-allowed') {
      alert('กรุณากดอนุญาตให้เบราว์เซอร์เข้าถึงไมโครโฟน (Microphone Permission) เพื่อพูดสั่งการครับ');
    } else if (event.error !== 'no-speech') {
      showToast('เกิดข้อผิดพลาดในการฟังเสียง: ' + event.error);
    }
  };
  
  rec.onend = () => {
    stopSpeechRecognition();
  };
  
  return rec;
}

function toggleSpeechRecognition() {
  if (isRecording) {
    stopSpeechRecognition();
  } else {
    startSpeechRecognition();
  }
}

function startSpeechRecognition() {
  if (!recognition) {
    recognition = initSpeechRecognition();
  }
  if (!recognition) return;
  try {
    recognition.start();
  } catch (e) {
    console.warn(e);
  }
}

function stopSpeechRecognition() {
  isRecording = false;
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }
  const btn = document.getElementById('btn-mic');
  const bar = document.getElementById('unified-input-bar');
  if (btn) {
    btn.classList.remove('recording');
    btn.innerHTML = '<span class="mic-svg-icon">🎙️</span><span class="mic-text">พูดสั่งการ</span>';
  }
  if (bar) {
    bar.classList.remove('recording-active');
  }
}


// ==========================================================================


// ==========================================================================
// Kashiwa 2-Second Review Intervals Workbench (Human Decision Authority)
// ==========================================================================
const INTERVAL_STORAGE_KEY = 'sp_tak_interval_curation_kashiwa_v1';
let intervalCatalog = [];
let intervalFileFilter = 'ALL';
let intervalStatusFilter = 'ALL';
let intervalSearchQuery = '';
let intervalCurrentPage = 1;
let intervalPageSize = 60;
let activeIntervalVoiceId = null;
let intervalVoiceRec = null;
let activePlayingVideo = null;

function initIntervalCuration() {
  try {
    const raw = localStorage.getItem(INTERVAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        intervalCatalog = parsed;
      }
    }
  } catch(e) {
    console.warn('Error reading interval curation from localStorage:', e);
  }

  if (!intervalCatalog || intervalCatalog.length === 0) {
    if (window.KASHIWA_REVIEW_INTERVALS_V1 && Array.isArray(window.KASHIWA_REVIEW_INTERVALS_V1)) {
      intervalCatalog = JSON.parse(JSON.stringify(window.KASHIWA_REVIEW_INTERVALS_V1));
      try {
        localStorage.setItem(INTERVAL_STORAGE_KEY, JSON.stringify(intervalCatalog));
      } catch(e) {}
    }
  }

  renderIntervalDashboardCounts();
  renderIntervalCards();
}

function saveIntervalCuration(notify = false) {
  try {
    localStorage.setItem(INTERVAL_STORAGE_KEY, JSON.stringify(intervalCatalog));
  } catch(e) {
    console.error('Failed to save interval curation to localStorage:', e);
  }
  renderIntervalDashboardCounts();
}

function renderIntervalDashboardCounts() {
  if (!intervalCatalog || intervalCatalog.length === 0) return;

  let approved = 0;
  let banned = 0;
  let unreviewed = 0;
  let hasNote = 0;
  let oldOverlap = 0;

  intervalCatalog.forEach(it => {
    const st = it.current_status || 'UNREVIEWED';
    if (st === 'APPROVED') approved++;
    else if (st === 'BANNED') banned++;
    else unreviewed++;

    if (it.human_note_original && it.human_note_original.trim() !== '') hasNote++;
    if (it.historical_curation_hint && it.historical_curation_hint !== 'NONE') oldOverlap++;
  });

  const total = intervalCatalog.length;
  const reviewed = approved + banned;
  const pct = total > 0 ? ((reviewed / total) * 100).toFixed(1) : '0.0';

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setEl('int-count-all', total);
  setEl('int-count-app', approved);
  setEl('int-count-ban', banned);
  setEl('int-count-unrev', unreviewed);
  setEl('int-count-note', hasNote);
  setEl('int-count-old', oldOverlap);

  const progText = document.getElementById('int-progress-text');
  if (progText) progText.innerText = `📊 ความคืบหน้าการตรวจ: ${reviewed} / ${total} ช่วง (${pct}%)`;

  const remText = document.getElementById('int-remaining-text');
  if (remText) remText.innerText = `เหลืออีก ${unreviewed} ช่วง`;

  const barApp = document.getElementById('int-progress-bar-app');
  if (barApp) barApp.style.width = total > 0 ? `${(approved / total) * 100}%` : '0%';

  const barBan = document.getElementById('int-progress-bar-ban');
  if (barBan) barBan.style.width = total > 0 ? `${(banned / total) * 100}%` : '0%';
}

function setIntervalStatus(intervalId, newStatus) {
  if (!intervalCatalog || intervalCatalog.length === 0) {
    initIntervalCuration();
  }
  const item = intervalCatalog.find(it => it.review_interval_id === intervalId);
  if (!item) return;

  item.current_status = newStatus;
  item.reviewed_at = (newStatus === 'APPROVED' || newStatus === 'BANNED') ? new Date().toISOString() : null;

  try {
    localStorage.setItem(INTERVAL_STORAGE_KEY, JSON.stringify(intervalCatalog));
  } catch(e) {
    console.error('Failed to save to localStorage:', e);
  }

  renderIntervalDashboardCounts();

  // Update card in DOM if rendered
  const card = document.getElementById(`card_${intervalId}`);
  if (card) {
    card.classList.remove('status-approved', 'status-banned', 'status-unreviewed');
    const badge = document.getElementById(`badge_${intervalId}`);
    const btnApp = card.querySelector('.btn-int-approve');
    const btnBan = card.querySelector('.btn-int-ban');
    const btnUnrev = card.querySelector('.btn-int-unrev');

    if (btnApp) btnApp.classList.remove('active');
    if (btnBan) btnBan.classList.remove('active');
    if (btnUnrev) btnUnrev.classList.remove('active');

    if (newStatus === 'APPROVED') {
      card.classList.add('status-approved');
      if (badge) {
        badge.className = 'interval-status-badge badge-approved';
        badge.innerText = '✅ เอาแล้ว';
      }
      if (btnApp) btnApp.classList.add('active');
    } else if (newStatus === 'BANNED') {
      card.classList.add('status-banned');
      if (badge) {
        badge.className = 'interval-status-badge badge-banned';
        badge.innerText = '🚫 แบนแล้ว';
      }
      if (btnBan) btnBan.classList.add('active');
    } else {
      card.classList.add('status-unreviewed');
      if (badge) {
        badge.className = 'interval-status-badge badge-unreviewed';
        badge.innerText = '⏳ ยังไม่ตรวจ';
      }
      if (btnUnrev) btnUnrev.classList.add('active');
    }
  }

  const msg = newStatus === 'APPROVED' ? `✅ มาร์ก [${intervalId}] เอา (Approved)` :
              (newStatus === 'BANNED' ? `🚫 มาร์ก [${intervalId}] แบน (Banned)` : `⏳ รีเซ็ต [${intervalId}] เป็น ยังไม่ตรวจ`);
  showToast(msg);
}

function saveIntervalNote(intervalId, noteText) {
  if (!intervalCatalog || intervalCatalog.length === 0) initIntervalCuration();
  const item = intervalCatalog.find(it => it.review_interval_id === intervalId);
  if (!item) return;

  item.human_note_original = (noteText || '').trim();
  try {
    localStorage.setItem(INTERVAL_STORAGE_KEY, JSON.stringify(intervalCatalog));
  } catch(e) {}
  renderIntervalDashboardCounts();
}

function playIntervalPreview(intervalId) {
  const item = intervalCatalog.find(it => it.review_interval_id === intervalId);
  if (!item) return;

  const mediaWrap = document.getElementById(`media_${intervalId}`);
  if (!mediaWrap) return;

  // Pause previous video if playing
  if (activePlayingVideo && activePlayingVideo !== mediaWrap.querySelector('video')) {
    activePlayingVideo.pause();
    activePlayingVideo.style.display = 'none';
    const prevWrap = activePlayingVideo.parentElement;
    if (prevWrap) {
      const prevImg = prevWrap.querySelector('.interval-thumb');
      if (prevImg) prevImg.style.display = 'block';
      const prevBtn = prevWrap.querySelector('.btn-play-preview');
      if (prevBtn) prevBtn.innerText = '▶ ดูวิดีโอ 2 วิ';
    }
  }

  let vid = mediaWrap.querySelector('video');
  const img = mediaWrap.querySelector('.interval-thumb');
  const btn = mediaWrap.querySelector('.btn-play-preview');

  if (!vid) {
    vid = document.createElement('video');
    vid.id = `v_${intervalId}`;
    vid.className = 'interval-video';
    vid.playsInline = true;
    vid.preload = 'none';
    vid.src = item.proxy_video;
    mediaWrap.appendChild(vid);
  }

  activePlayingVideo = vid;
  if (img) img.style.display = 'none';
  vid.style.display = 'block';

  // Seek strictly to interval_start
  vid.currentTime = item.interval_start;
  vid.play().catch(e => console.warn('Play interrupted:', e));
  if (btn) btn.innerText = '⏸️ กำลังเล่น...';

  // Strict boundary: Pause at interval_end
  const onTimeUpdate = () => {
    if (vid.currentTime >= item.interval_end) {
      vid.pause();
      vid.removeEventListener('timeupdate', onTimeUpdate);
      vid.currentTime = item.interval_start;
      if (btn) btn.innerText = '🔄 เล่นซ้ำ 2 วิ';
    }
  };

  vid.addEventListener('timeupdate', onTimeUpdate);
}

function toggleIntervalVoice(intervalId) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('เบราว์เซอร์นี้ไม่รองรับ Web Speech API กรุณาเปิดบน Chrome หรือ Safari ครับ');
    return;
  }

  const btn = document.getElementById(`mic_${intervalId}`);
  const input = document.getElementById(`note_${intervalId}`);

  if (intervalVoiceRec && activeIntervalVoiceId === intervalId) {
    try { intervalVoiceRec.stop(); } catch(e) {}
    intervalVoiceRec = null;
    activeIntervalVoiceId = null;
    if (btn) btn.classList.remove('recording');
    return;
  }

  if (intervalVoiceRec) {
    try { intervalVoiceRec.stop(); } catch(e) {}
    if (activeIntervalVoiceId) {
      const prevBtn = document.getElementById(`mic_${activeIntervalVoiceId}`);
      if (prevBtn) prevBtn.classList.remove('recording');
    }
  }

  activeIntervalVoiceId = intervalId;
  intervalVoiceRec = new SpeechRecognition();
  intervalVoiceRec.lang = 'th-TH';
  intervalVoiceRec.continuous = false;
  intervalVoiceRec.interimResults = true;

  intervalVoiceRec.onstart = () => {
    if (btn) btn.classList.add('recording');
    showToast('🎙️ กำลังฟังเสียงภาษาไทย... พูดโน้ตได้เลยครับ');
  };

  intervalVoiceRec.onresult = (e) => {
    let result = '';
    for (let i = 0; i < e.results.length; i++) {
      result += e.results[i][0].transcript;
    }
    if (input) {
      input.value = result.trim();
      saveIntervalNote(intervalId, result.trim());
    }
  };

  intervalVoiceRec.onerror = (e) => {
    console.warn('Speech error:', e);
    if (btn) btn.classList.remove('recording');
  };

  intervalVoiceRec.onend = () => {
    if (btn) btn.classList.remove('recording');
    activeIntervalVoiceId = null;
    intervalVoiceRec = null;
  };

  try {
    intervalVoiceRec.start();
  } catch(e) {
    console.warn('Speech start error:', e);
  }
}

function onIntervalFileFilterChange(val) {
  intervalFileFilter = val;
  intervalCurrentPage = 1;
  renderIntervalCards();
}

function setIntervalFilter(filter) {
  intervalStatusFilter = filter;
  ['ALL', 'APPROVED', 'BANNED', 'UNREVIEWED', 'HAS_NOTE', 'OLD_OVERLAP'].forEach(f => {
    const btn = document.getElementById('int-btn-filter-' + f);
    if (btn) {
      if (f === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  intervalCurrentPage = 1;
  renderIntervalCards();
}

function onIntervalSearch(val) {
  intervalSearchQuery = (val || '').toLowerCase().trim();
  intervalCurrentPage = 1;
  renderIntervalCards();
}

function changeIntervalPage(delta) {
  intervalCurrentPage += delta;
  renderIntervalCards();
  window.scrollTo({ top: 350, behavior: 'smooth' });
}

function changeIntervalPageSize(val) {
  intervalPageSize = val === 'ALL' ? 99999 : parseInt(val);
  intervalCurrentPage = 1;
  renderIntervalCards();
}

function renderIntervalCards() {
  const container = document.getElementById('interval-washer-grid');
  if (!container) return;

  if (!intervalCatalog || intervalCatalog.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:40px; grid-column:1/-1;">กำลังโหลดข้อมูล 2-Second Review Intervals...</div>';
    return;
  }

  // Filter
  const filtered = intervalCatalog.filter(it => {
    // 1. File filter
    if (intervalFileFilter !== 'ALL') {
      if (it.file_index !== parseInt(intervalFileFilter)) return false;
    }

    // 2. Status filter
    const st = it.current_status || 'UNREVIEWED';
    if (intervalStatusFilter === 'APPROVED') {
      if (st !== 'APPROVED') return false;
    } else if (intervalStatusFilter === 'BANNED') {
      if (st !== 'BANNED') return false;
    } else if (intervalStatusFilter === 'UNREVIEWED') {
      if (st !== 'UNREVIEWED') return false;
    } else if (intervalStatusFilter === 'HAS_NOTE') {
      if (!it.human_note_original || it.human_note_original.trim() === '') return false;
    } else if (intervalStatusFilter === 'OLD_OVERLAP') {
      if (!it.historical_curation_hint || it.historical_curation_hint === 'NONE') return false;
    }

    // 3. Search query
    if (intervalSearchQuery) {
      const q = intervalSearchQuery;
      const sStart = `${it.interval_start}`;
      const sEnd = `${it.interval_end}`;
      const idMatch = (it.review_interval_id || '').toLowerCase().includes(q);
      const fileMatch = (it.source_file || '').toLowerCase().includes(q);
      const semMatch = (it.semantic_hint || '').toLowerCase().includes(q);
      const noteMatch = (it.human_note_original || '').toLowerCase().includes(q);
      const histMatch = (it.historical_note || '').toLowerCase().includes(q);
      const tagMatch = Array.isArray(it.semantic_tags) && it.semantic_tags.some(t => t.toLowerCase().includes(q));
      if (!idMatch && !fileMatch && !semMatch && !noteMatch && !histMatch && !tagMatch && !sStart.includes(q) && !sEnd.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / intervalPageSize));
  if (intervalCurrentPage > totalPages) intervalCurrentPage = totalPages;
  if (intervalCurrentPage < 1) intervalCurrentPage = 1;

  // Pagination UI Update
  const prevBtn = document.getElementById('btn-page-prev');
  const nextBtn = document.getElementById('btn-page-next');
  const pageInd = document.getElementById('interval-page-indicator');
  if (prevBtn) prevBtn.disabled = (intervalCurrentPage <= 1);
  if (nextBtn) nextBtn.disabled = (intervalCurrentPage >= totalPages);
  if (pageInd) pageInd.innerText = `หน้า ${intervalCurrentPage} / ${totalPages} (${totalCount} ช่วง)`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="color:var(--text-muted); text-align:center; padding:50px 20px; grid-column:1/-1; background:#141722; border-radius:12px; border:1px solid #23283a;">
        <div style="font-size:26px; margin-bottom:10px;">🔍</div>
        <div style="font-size:15px; font-weight:700; color:#fff;">ไม่พบช่วงเวลาที่ตรงกับเงื่อนไขการค้นหา</div>
        <div style="font-size:12px; margin-top:6px; color:#8c98b3;">ลองเปลี่ยนตัวกรองไฟล์ หรือล้างคำค้นหาดูครับ</div>
      </div>
    `;
    return;
  }

  // Slice for page
  const startIdx = (intervalCurrentPage - 1) * intervalPageSize;
  const pageItems = filtered.slice(startIdx, startIdx + intervalPageSize);

  let html = '';
  pageItems.forEach(it => {
    const st = it.current_status || 'UNREVIEWED';
    const isApp = (st === 'APPROVED');
    const isBan = (st === 'BANNED');

    const cardClass = isApp ? 'status-approved' : (isBan ? 'status-banned' : 'status-unreviewed');
    const badgeClass = isApp ? 'badge-approved' : (isBan ? 'badge-banned' : 'badge-unreviewed');
    const badgeText = isApp ? '✅ เอาแล้ว' : (isBan ? '🚫 แบนแล้ว' : '⏳ ยังไม่ตรวจ');

    const sMin = Math.floor(it.interval_start / 60);
    const sSec = Math.floor(it.interval_start % 60);
    const eMin = Math.floor(it.interval_end / 60);
    const eSec = Math.floor(it.interval_end % 60);
    const timeRangeStr = `${String(sMin).padStart(2, '0')}:${String(sSec).padStart(2, '0')} ➔ ${String(eMin).padStart(2, '0')}:${String(eSec).padStart(2, '0')}`;

    // Semantic hint box
    let semHtml = '';
    if (it.semantic_hint || (it.semantic_tags && it.semantic_tags.length > 0)) {
      const tagsStr = (it.semantic_tags || []).map(t => `#${escapeHtml(t)}`).join(' ');
      semHtml = `
        <div class="interval-semantic-hint">
          <span class="hint-label">🎬 Semantic Hint:</span>
          <span>${escapeHtml(it.semantic_hint || '')} ${tagsStr ? `<span style="color:var(--accent-blue); font-size:10.5px;">${tagsStr}</span>` : ''}</span>
        </div>
      `;
    }

    // Historical hint box
    let histHtml = '';
    if (it.historical_curation_hint && it.historical_curation_hint !== 'NONE') {
      const isOldApp = (it.historical_curation_hint === 'OLD_APPROVED_OVERLAP');
      const pillClass = isOldApp ? 'pill-old-app' : 'pill-old-ban';
      const pillText = isOldApp ? '📜 ประวัติเดิม: เอา' : '📜 ประวัติเดิม: แบน';
      histHtml = `
        <div class="interval-history-hint">
          <span class="history-pill ${pillClass}">${pillText}</span>
          <span>${escapeHtml(it.historical_note || '')}</span>
        </div>
      `;
    }

    const curNoteVal = escapeHtml(it.human_note_original || '');

    html += `
      <div class="interval-card ${cardClass}" id="card_${it.review_interval_id}">
        <!-- Media Container -->
        <div class="interval-media-wrap" id="media_${it.review_interval_id}">
          <div class="interval-timecode-badge">⏱️ ${timeRangeStr} (${it.interval_duration.toFixed(1)}s)</div>
          <div class="interval-status-badge ${badgeClass}" id="badge_${it.review_interval_id}">${badgeText}</div>
          <img class="interval-thumb" src="${it.thumbnail}" alt="${it.review_interval_id}" loading="lazy">
          <button type="button" class="btn-play-preview" onclick="playIntervalPreview('${it.review_interval_id}')">
            ▶ ดูวิดีโอ 2 วิ
          </button>
        </div>

        <!-- Body & Controls -->
        <div class="interval-card-body">
          <div class="interval-btn-group">
            <button type="button" class="btn-int-action btn-int-approve ${isApp ? 'active' : ''}" onclick="setIntervalStatus('${it.review_interval_id}', 'APPROVED')">
              ✅ เอา
            </button>
            <button type="button" class="btn-int-action btn-int-ban ${isBan ? 'active' : ''}" onclick="setIntervalStatus('${it.review_interval_id}', 'BANNED')">
              🚫 แบน
            </button>
            <button type="button" class="btn-int-action btn-int-unrev ${(!isApp && !isBan) ? 'active' : ''}" onclick="setIntervalStatus('${it.review_interval_id}', 'UNREVIEWED')">
              ⏳ ยังไม่ตรวจ
            </button>
          </div>

          ${semHtml}
          ${histHtml}

          <div class="interval-source-info" title="${escapeHtml(it.source_file)}">
            <span>📁 ไฟล์ ${String(it.file_index).padStart(2, '0')}: ${escapeHtml(it.source_file)}</span>
          </div>

          <!-- Note & Speech-to-Text -->
          <div class="interval-note-row">
            <input type="text" 
                   class="interval-note-input" 
                   id="note_${it.review_interval_id}" 
                   placeholder="พิมพ์โน้ต หรือกดไมค์พูดไทย..." 
                   value="${curNoteVal}" 
                   onchange="saveIntervalNote('${it.review_interval_id}', this.value)">
            <button type="button" 
                    class="btn-int-mic" 
                    id="mic_${it.review_interval_id}" 
                    onclick="toggleIntervalVoice('${it.review_interval_id}')" 
                    title="เปิดไมค์เพื่อพูดโน้ตเป็นภาษาไทย">
              🎙️
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function exportHumanCuratedIntervals() {
  // CRITICAL: Always read current state directly from LocalStorage
  let sourceCatalog = [];
  try {
    const raw = localStorage.getItem(INTERVAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        sourceCatalog = parsed;
        intervalCatalog = parsed;
      }
    }
  } catch(e) {
    console.error('Error reading interval LocalStorage:', e);
  }

  if (sourceCatalog.length === 0 && intervalCatalog && intervalCatalog.length > 0) {
    sourceCatalog = intervalCatalog;
  }

  if (sourceCatalog.length === 0 && window.KASHIWA_REVIEW_INTERVALS_V1) {
    sourceCatalog = JSON.parse(JSON.stringify(window.KASHIWA_REVIEW_INTERVALS_V1));
  }

  if (sourceCatalog.length === 0) {
    alert('ไม่มีข้อมูลช่วงเวลา Review Intervals ที่จะส่งออกครับ');
    return;
  }

  const summary = {
    total_intervals: sourceCatalog.length,
    approved: 0,
    banned: 0,
    unreviewed: 0
  };

  const curatedIntervals = sourceCatalog.map(it => {
    const st = it.current_status || 'UNREVIEWED';
    if (st === 'APPROVED') summary.approved++;
    else if (st === 'BANNED') summary.banned++;
    else summary.unreviewed++;

    return {
      review_interval_id: it.review_interval_id,
      source_file: it.source_file,
      source_sha256: it.source_sha256,
      interval_start: it.interval_start,
      interval_end: it.interval_end,
      interval_duration: it.interval_duration,
      human_status: st,
      human_note_original: it.human_note_original || '',
      reviewed_at: it.reviewed_at || null
    };
  });

  const exportPayload = {
    catalog_version: 'Kashiwa 2-Second Review Intervals v1',
    exported_at: new Date().toISOString(),
    total_intervals: curatedIntervals.length,
    summary: summary,
    curated_intervals: curatedIntervals
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'human_curated_intervals.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  showToast(`📥 ส่งออก human_curated_intervals.json สำเร็จ (เอา ${summary.approved} / แบน ${summary.banned} / ยังไม่ตรวจ ${summary.unreviewed})`);
}

function resetKashiwaIntervalCuration() {
  if (!confirm('ต้องการรีเซ็ตผลการตรวจ 2-Second Review Intervals ทั้งหมด 1,010 ช่วงกลับเป็น [UNREVIEWED] ใช่หรือไม่?')) {
    return;
  }
  if (window.KASHIWA_REVIEW_INTERVALS_V1) {
    intervalCatalog = JSON.parse(JSON.stringify(window.KASHIWA_REVIEW_INTERVALS_V1));
  } else {
    intervalCatalog.forEach(it => {
      it.current_status = 'UNREVIEWED';
      it.human_note_original = '';
      it.reviewed_at = null;
    });
  }
  try {
    localStorage.setItem(INTERVAL_STORAGE_KEY, JSON.stringify(intervalCatalog));
  } catch(e) {}
  renderIntervalDashboardCounts();
  renderIntervalCards();
  showToast('🔄 รีเซ็ตผลการตรวจทั้งหมดเป็น UNREVIEWED เรียบร้อย');
}


// Kashiwa Canonical Shot Catalog v2 & Curation Manager (Clean Status Contract)
const CANONICAL_STORAGE_KEY = 'sp_tak_canonical_curation_kashiwa_v5';
let canonicalCatalog = [];
let canonicalActiveFilter = 'ALL';
let canonicalSearchQuery = '';
let cardVoiceRec = null;
let activeVoiceShotId = null;

function initCanonicalCuration() {
  try {
    const saved = localStorage.getItem(CANONICAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        canonicalCatalog = parsed;
      }
    }
  } catch(e) {
    console.warn('Error reading canonical curation from localStorage:', e);
  }

  if (!canonicalCatalog || canonicalCatalog.length === 0) {
    if (window.KASHIWA_CANONICAL_CATALOG_V2 && Array.isArray(window.KASHIWA_CANONICAL_CATALOG_V2)) {
      canonicalCatalog = JSON.parse(JSON.stringify(window.KASHIWA_CANONICAL_CATALOG_V2));
      saveCanonicalCuration(false);
    }
  }

  renderCanonicalDashboardCounts();
  renderCanonicalCards();
}

function saveCanonicalCuration(notify = true) {
  try {
    localStorage.setItem(CANONICAL_STORAGE_KEY, JSON.stringify(canonicalCatalog));
  } catch(e) {
    console.error('Failed to save canonical curation to localStorage:', e);
  }
  renderCanonicalDashboardCounts();
}

function renderCanonicalDashboardCounts() {
  if (!canonicalCatalog || canonicalCatalog.length === 0) return;
  let curApproved = 0;
  let curBanned = 0;
  let curUnreviewed = 0;
  let migApproved = 0;
  let migBanned = 0;
  let conflicts = 0;

  canonicalCatalog.forEach(s => {
    const st = s.human_status || 'UNREVIEWED';
    const mig = s.migrated_status || 'UNREVIEWED';

    if (st === 'APPROVED') curApproved++;
    else if (st === 'BANNED') curBanned++;
    else curUnreviewed++;

    if (mig === 'MIGRATED_APPROVED') migApproved++;
    else if (mig === 'MIGRATED_BANNED') migBanned++;

    if (s.semantic_conflict) conflicts++;
  });

  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.innerText = val;
  };

  setEl('c-count-all', canonicalCatalog.length);
  setEl('c-count-cur-app', curApproved);
  setEl('c-count-cur-ban', curBanned);
  setEl('c-count-cur-unrev', curUnreviewed);
  setEl('c-count-mig-app', migApproved);
  setEl('c-count-mig-ban', migBanned);
  setEl('c-count-conflicts', conflicts);
}

function setCanonicalFilter(filter) {
  canonicalActiveFilter = filter;
  ['ALL', 'CUR_APPROVED', 'CUR_BANNED', 'CUR_UNREVIEWED', 'MIG_APPROVED', 'MIG_BANNED', 'CONFLICTS'].forEach(f => {
    const btn = document.getElementById('c-btn-filter-' + f);
    if (btn) {
      if (f === filter) btn.classList.add('active');
      else btn.classList.remove('active');
    }
  });
  renderCanonicalCards();
}

function onCanonicalSearch(query) {
  canonicalSearchQuery = (query || '').toLowerCase().trim();
  renderCanonicalCards();
}

function renderCanonicalCards() {
  const container = document.getElementById('canonical-washer-grid');
  if (!container) return;

  if (!canonicalCatalog || canonicalCatalog.length === 0) {
    container.innerHTML = '<div style="color:var(--text-muted); text-align:center; padding:40px; grid-column:1/-1;">กำลังโหลดข้อมูล Canonical Catalog v2...</div>';
    return;
  }

  const filtered = canonicalCatalog.filter(s => {
    const st = s.human_status || 'UNREVIEWED';
    const mig = s.migrated_status || 'UNREVIEWED';

    // 1. Status Filter
    if (canonicalActiveFilter === 'CUR_APPROVED') {
      if (st !== 'APPROVED') return false;
    } else if (canonicalActiveFilter === 'CUR_BANNED') {
      if (st !== 'BANNED') return false;
    } else if (canonicalActiveFilter === 'CUR_UNREVIEWED') {
      if (st !== 'UNREVIEWED') return false;
    } else if (canonicalActiveFilter === 'MIG_APPROVED') {
      if (mig !== 'MIGRATED_APPROVED') return false;
    } else if (canonicalActiveFilter === 'MIG_BANNED') {
      if (mig !== 'MIGRATED_BANNED') return false;
    } else if (canonicalActiveFilter === 'CONFLICTS') {
      if (!s.semantic_conflict) return false;
    }

    // 2. Search Query Filter
    if (canonicalSearchQuery) {
      const idMatch = (s.canonical_shot_id || '').toLowerCase().includes(canonicalSearchQuery);
      const actionMatch = (s.actual_visual_action || '').toLowerCase().includes(canonicalSearchQuery);
      const fileMatch = (s.source_file || '').toLowerCase().includes(canonicalSearchQuery);
      const tagMatch = Array.isArray(s.semantic_tags) && s.semantic_tags.some(t => t.toLowerCase().includes(canonicalSearchQuery));
      const noteMatch = (s.human_note_original || '').toLowerCase().includes(canonicalSearchQuery);
      const oldNoteMatch = (s.migrated_human_note_original || '').toLowerCase().includes(canonicalSearchQuery);
      const reasonMatch = (s.conflict_reason || '').toLowerCase().includes(canonicalSearchQuery);
      if (!idMatch && !actionMatch && !fileMatch && !tagMatch && !noteMatch && !oldNoteMatch && !reasonMatch) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:50px 20px; grid-column:1/-1; background:#151822; border-radius:12px; border:1px solid #262b3d;">
      <div style="font-size:24px; margin-bottom:10px;">🔍</div>
      <div style="font-size:14px; font-weight:600; color:#fff;">ไม่พบช็อตฟุตเทจที่ตรงกับตัวกรอง</div>
      <div style="font-size:12px; margin-top:4px;">ลองเปลี่ยนตัวกรองสถานะ หรือล้างคำค้นหาดูครับ</div>
    </div>`;
    return;
  }

  let html = '';
  filtered.forEach(s => {
    const curStatus = s.human_status || 'UNREVIEWED';
    const migStatus = s.migrated_status || 'UNREVIEWED';
    const isCurApproved = curStatus === 'APPROVED';
    const isCurBanned = curStatus === 'BANNED';
    const isCurUnreviewed = curStatus === 'UNREVIEWED';

    let statusLabel = '⏳ ยังไม่ตรวจ (UNREVIEWED)';
    let statusClass = 'unreviewed';
    if (isCurApproved) {
      statusLabel = '✅ ตรวจแล้ว: เอา (APPROVED)';
      statusClass = 'approved';
    } else if (isCurBanned) {
      statusLabel = '🚫 ตรวจแล้ว: แบน (BANNED)';
      statusClass = 'banned';
    }

    let migPillHtml = '';
    if (migStatus === 'MIGRATED_APPROVED') {
      migPillHtml = '<span class="c-migrated-pill migrated_approved">📜 ประวัติเดิม: MIGRATED_APPROVED (Prior Evidence เท่านั้น)</span>';
    } else if (migStatus === 'MIGRATED_BANNED') {
      migPillHtml = '<span class="c-migrated-pill migrated_banned">⚠️ ประวัติเดิม: MIGRATED_BANNED (คำเตือน: ติดขาตั้งกล้อง/ของรก)</span>';
    } else {
      migPillHtml = '<span class="c-migrated-pill unreviewed">📜 ประวัติเดิม: UNREVIEWED (ยังไม่เคยตรวจ)</span>';
    }

    const tagsHtml = (s.semantic_tags || []).map(t => `<span class="c-tag">#${escapeHtml(t)}</span>`).join('');
    const shaShort = (s.source_sha256 || '').slice(0, 10);
    const startStr = Number(s.source_start).toFixed(2);
    const endStr = Number(s.source_end).toFixed(2);
    const durStr = Number(s.source_duration).toFixed(1);
    const curNoteVal = s.human_note_original ? escapeHtml(s.human_note_original) : '';
    const oldNoteVal = s.migrated_human_note_original ? escapeHtml(s.migrated_human_note_original) : '';

    const reviewedTimeStr = s.reviewed_at ? `<span style="font-size:10px; color:#2ecc71;" title="ตรวจเมื่อ: ${escapeHtml(s.reviewed_at)}">🕒 ตรวจยืนยันแล้ว: ${new Date(s.reviewed_at).toLocaleTimeString('th-TH')}</span>` : '';

    // Semantic Conflict Alert Box
    let conflictHtml = '';
    if (s.semantic_conflict) {
      conflictHtml = `
        <div class="c-conflict-alert">
          <div class="c-conflict-header">
            <span class="c-conflict-icon">⚠️</span>
            <b>ข้อมูลเดิมกับภาพที่ตรวจล่าสุดไม่ตรงกัน กรุณาตรวจใหม่</b>
          </div>
          <div class="c-conflict-desc">${escapeHtml(s.conflict_reason || 'Human Note ไม่สอดคล้องกับ Actual Visual Action')}</div>
        </div>
      `;
    }

    // Old Migrated Human Note Box
    let oldNoteHtml = '';
    if (oldNoteVal) {
      oldNoteHtml = `
        <div class="c-old-note-box">
          <div class="c-old-note-label">📜 โน้ตเดิม (Migrated Human Note):</div>
          <div class="c-old-note-content">${oldNoteVal}</div>
        </div>
      `;
    }

    const cardStatusBorderClass = isCurApproved ? 'status-approved' : (isCurBanned ? 'status-banned' : (s.semantic_conflict ? 'status-conflict' : 'status-unreviewed'));

    html += `
      <div class="canonical-card ${cardStatusBorderClass}" id="card_${s.canonical_shot_id}">
        <!-- Video Player & Preview -->
        <div class="c-card-media-wrap">
          <video id="vid_${s.canonical_shot_id}"
                 poster="${s.preview_thumbnail}"
                 preload="none"
                 playsinline
                 controls
                 loop
                 muted
                 src="${s.preview_video || `assets/previews/washer/${s.canonical_shot_id}.mp4`}">
          </video>
          <div class="c-badge-top-left">${s.framing || 'shot'} • ${s.quality || 'HD'}</div>
          <div class="c-status-badge ${statusClass}">${statusLabel}</div>
          <div class="c-badge-bottom-bar">
            <span>⏱️ ${startStr}s ➔ ${endStr}s</span>
            <span>ความยาว ${durStr}s</span>
          </div>
        </div>

        <!-- Details & Metadata -->
        <div class="c-card-body">
          <div class="c-card-id-row">
            <span class="c-card-id">${escapeHtml(s.canonical_shot_id)}</span>
            <span class="c-seg-id">${escapeHtml(s.segment_id || '')}</span>
          </div>

          <div class="c-migrated-row">
            ${migPillHtml}
          </div>

          <div class="c-card-action"><b>🎬 ภาพจริง:</b> ${escapeHtml(s.actual_visual_action || '')}</div>

          <div class="c-card-tags">
            ${tagsHtml}
          </div>

          <!-- Secondary Physical Master Info -->
          <div class="c-card-source" title="Physical Master: ${escapeHtml(s.source_file)} (${escapeHtml(s.source_sha256)})">
            <span>📁</span>
            <span class="c-source-filename">${escapeHtml(s.source_file)}</span>
            <span class="c-sha-tag" title="SHA-256: ${escapeHtml(s.source_sha256)}">${shaShort}...</span>
          </div>

          <!-- Conflict Warning Alert (If any) -->
          ${conflictHtml}

          <!-- Old Human Note (Separated) -->
          ${oldNoteHtml}

          <!-- Current Human Note & Voice-to-Text -->
          <div class="c-note-box">
            <div class="c-note-label">
              <span>💬 โน้ตใหม่จากการตรวจรอบนี้ (human_note_original):</span>
              ${reviewedTimeStr}
            </div>
            <div class="c-note-input-row">
              <input type="text" 
                     class="c-note-input" 
                     id="note_${s.canonical_shot_id}" 
                     value="${curNoteVal}" 
                     placeholder="พิมพ์สั่งการ หรือกดไมค์เพื่อพูดภาษาไทย..." 
                     onchange="updateCanonicalNote('${s.canonical_shot_id}', this.value)"
                     autocomplete="off">
              <button type="button" 
                      class="c-btn-mic" 
                      id="mic_${s.canonical_shot_id}" 
                      onclick="toggleCardVoiceRecord('${s.canonical_shot_id}')" 
                      title="กดไมค์เพื่อพูดบันทึกเสียงภาษาไทยลงช่องนี้ทันที">
                🎙️
              </button>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="c-actions-row">
            <button class="c-btn-status btn-approve ${isCurApproved ? 'active' : ''}" 
                    onclick="setCanonicalStatus('${s.canonical_shot_id}', 'APPROVED')" 
                    title="อนุมัติให้ระบบดึงช็อตนี้ไปใช้ได้ (Eligible for Stage 5)">
              ✅ เอา (Approve)
            </button>
            <button class="c-btn-status btn-ban ${isCurBanned ? 'active' : ''}" 
                    onclick="setCanonicalStatus('${s.canonical_shot_id}', 'BANNED')" 
                    title="สั่งแบน ห้ามหยิบช็อตนี้ไปใช้เด็ดขาด (Hard Exclusion)">
              🚫 แบน (Ban)
            </button>
            <button class="c-btn-status btn-unrev ${isCurUnreviewed ? 'active' : ''}" 
                    onclick="setCanonicalStatus('${s.canonical_shot_id}', 'UNREVIEWED')" 
                    title="ยังไม่ตรวจ (ห้ามหยิบไปใช้จนกว่าจะได้รับการตรวจ)">
              ⏳ ยังไม่ตรวจ
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function setCanonicalStatus(canonicalShotId, newStatus) {
  // 1. Ensure canonicalCatalog is loaded from LocalStorage
  if (!canonicalCatalog || canonicalCatalog.length === 0) {
    try {
      const raw = localStorage.getItem(CANONICAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          canonicalCatalog = parsed;
        }
      }
    } catch(e) {}
  }
  if (!canonicalCatalog || canonicalCatalog.length === 0) {
    if (window.KASHIWA_CANONICAL_CATALOG_V2 && Array.isArray(window.KASHIWA_CANONICAL_CATALOG_V2)) {
      canonicalCatalog = JSON.parse(JSON.stringify(window.KASHIWA_CANONICAL_CATALOG_V2));
    }
  }

  const item = canonicalCatalog.find(s => s.canonical_shot_id === canonicalShotId);
  if (!item) {
    console.warn('Canonical item not found:', canonicalShotId);
    return;
  }

  // Strict: only update human_status and reviewed_at, never overwrite migrated_status
  item.human_status = newStatus;
  item.reviewed_at = (newStatus === 'APPROVED' || newStatus === 'BANNED') ? new Date().toISOString() : null;

  // Immediate LocalStorage persistence
  try {
    localStorage.setItem(CANONICAL_STORAGE_KEY, JSON.stringify(canonicalCatalog));
  } catch(e) {
    console.error('Failed to save canonical curation to localStorage:', e);
  }

  renderCanonicalDashboardCounts();
  renderCanonicalCards();

  const toastMsg = newStatus === 'APPROVED' ? `✅ ช็อต [${canonicalShotId}] ได้รับการตรวจยืนยัน: เอา (APPROVED)` :
                   newStatus === 'BANNED'   ? `🚫 ช็อต [${canonicalShotId}] ได้รับการตรวจยืนยัน: แบน (BANNED)` :
                                              `⏳ รีเซ็ต [${canonicalShotId}] เป็นยังไม่ตรวจ (UNREVIEWED)`;
  showToast(toastMsg);
}

function updateCanonicalNote(canonicalShotId, newNote) {
  const item = canonicalCatalog.find(s => s.canonical_shot_id === canonicalShotId);
  if (!item) return;

  item.human_note_original = (newNote || '').trim();
  item.reviewed_at = new Date().toISOString();
  saveCanonicalCuration(false);
  showToast(`💾 บันทึกโน้ตใหม่ [${canonicalShotId}] เรียบร้อย`);
}

function toggleCardVoiceRecord(canonicalShotId) {
  if (activeVoiceShotId === canonicalShotId && cardVoiceRec) {
    stopCardVoiceRecord();
    return;
  }

  if (cardVoiceRec) {
    stopCardVoiceRecord();
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('เบราว์เซอร์นี้ไม่รองรับ Web Speech API กรุณาเปิดผ่าน Google Chrome หรือ Edge ครับ');
    return;
  }

  cardVoiceRec = new SpeechRecognition();
  cardVoiceRec.lang = 'th-TH';
  cardVoiceRec.continuous = false;
  cardVoiceRec.interimResults = true;
  activeVoiceShotId = canonicalShotId;

  const micBtn = document.getElementById('mic_' + canonicalShotId);
  const inputEl = document.getElementById('note_' + canonicalShotId);

  cardVoiceRec.onstart = () => {
    if (micBtn) micBtn.classList.add('recording');
    showToast(`🎙️ กำลังฟังเสียงสำหรับ [${canonicalShotId}]... พูดได้เลยครับ`);
  };

  cardVoiceRec.onresult = (event) => {
    let transcript = '';
    for (let i = 0; i < event.results.length; ++i) {
      transcript += event.results[i][0].transcript;
    }
    if (inputEl) {
      inputEl.value = transcript.trim();
    }
  };

  cardVoiceRec.onerror = (event) => {
    console.warn('Voice recording error:', event.error);
    stopCardVoiceRecord();
    if (event.error === 'not-allowed') {
      alert('กรุณาอนุญาตให้เบราว์เซอร์เข้าถึงไมโครโฟนเพื่อบันทึกเสียงครับ');
    }
  };

  cardVoiceRec.onend = () => {
    if (inputEl && activeVoiceShotId) {
      updateCanonicalNote(activeVoiceShotId, inputEl.value);
    }
    stopCardVoiceRecord();
  };

  try {
    cardVoiceRec.start();
  } catch(err) {
    console.error('Failed to start voice recognition:', err);
    stopCardVoiceRecord();
  }
}

function stopCardVoiceRecord() {
  if (cardVoiceRec) {
    try { cardVoiceRec.stop(); } catch(e) {}
    cardVoiceRec = null;
  }
  if (activeVoiceShotId) {
    const micBtn = document.getElementById('mic_' + activeVoiceShotId);
    if (micBtn) micBtn.classList.remove('recording');
    activeVoiceShotId = null;
  }
}

function resetKashiwaCurationToDefault() {
  if (!window.KASHIWA_CANONICAL_CATALOG_V2 || !Array.isArray(window.KASHIWA_CANONICAL_CATALOG_V2)) {
    alert('ไม่พบข้อมูล KASHIWA_CANONICAL_CATALOG_V2 ในระบบ');
    return;
  }
  const count = window.KASHIWA_CANONICAL_CATALOG_V2.length;
  if (confirm(`ต้องการรีเซ็ตผลการ Curation ของ Kashiwa ทั้งหมด (${count} ช็อต) กลับเป็นค่าเริ่มต้น (Current Unreviewed: 32 ช็อต / ประวัติเดิมเอา: 17 / ประวัติเดิมแบน: 3) ใช่หรือไม่?`)) {
    canonicalCatalog = JSON.parse(JSON.stringify(window.KASHIWA_CANONICAL_CATALOG_V2));
    saveCanonicalCuration(false);
    renderCanonicalDashboardCounts();
    renderCanonicalCards();
    showToast(`✅ รีเซ็ตผล Curation เป็นค่าตั้งต้นเรียบร้อย (${count} ช็อต)`);
  }
}

function exportHumanCuratedCatalog() {
  // CRITICAL: Always read current state directly from LocalStorage
  let sourceCatalog = [];
  try {
    const raw = localStorage.getItem(CANONICAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        sourceCatalog = parsed;
        canonicalCatalog = parsed; // sync in-memory catalog
      }
    }
  } catch(e) {
    console.error('Error reading from localStorage during export:', e);
  }

  if (sourceCatalog.length === 0 && canonicalCatalog && canonicalCatalog.length > 0) {
    sourceCatalog = canonicalCatalog;
  }

  if (sourceCatalog.length === 0 && window.KASHIWA_CANONICAL_CATALOG_V2 && Array.isArray(window.KASHIWA_CANONICAL_CATALOG_V2)) {
    sourceCatalog = JSON.parse(JSON.stringify(window.KASHIWA_CANONICAL_CATALOG_V2));
  }

  if (sourceCatalog.length === 0) {
    alert('ไม่มีข้อมูลช็อต Canonical ที่จะส่งออกครับ');
    return;
  }

  const summary = {
    current_approved: 0,
    current_banned: 0,
    current_unreviewed: 0,
    migrated_approved: 0,
    migrated_banned: 0,
    semantic_conflicts: 0
  };

  const curatedSegments = sourceCatalog.map(seg => {
    const st = seg.human_status || 'UNREVIEWED';
    const mig = seg.migrated_status || 'UNREVIEWED';

    if (st === 'APPROVED') summary.current_approved++;
    else if (st === 'BANNED') summary.current_banned++;
    else summary.current_unreviewed++;

    if (mig === 'MIGRATED_APPROVED') summary.migrated_approved++;
    else if (mig === 'MIGRATED_BANNED') summary.migrated_banned++;

    if (seg.semantic_conflict) summary.semantic_conflicts++;

    return {
      canonical_shot_id: seg.canonical_shot_id,
      source_file: seg.source_file,
      source_sha256: seg.source_sha256,
      source_start: seg.source_start,
      source_end: seg.source_end,
      human_status: st,
      migrated_status: mig,
      human_note_original: seg.human_note_original || '',
      migrated_human_note_original: seg.migrated_human_note_original || '',
      semantic_conflict: Boolean(seg.semantic_conflict),
      conflict_reason: seg.conflict_reason || null,
      reviewed_at: seg.reviewed_at || null
    };
  });

  const exportPayload = {
    catalog_version: 'Kashiwa Canonical Shot Catalog v2',
    exported_at: new Date().toISOString(),
    total_segments: curatedSegments.length,
    summary: summary,
    curated_shot_segments: curatedSegments
  };

  const jsonStr = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'human_curated_catalog.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  showToast(`📥 ส่งออก human_curated_catalog.json สำเร็จ (ตรวจเอา ${summary.current_approved} / ตรวจแบน ${summary.current_banned} / ยังไม่ตรวจ ${summary.current_unreviewed})`);
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
