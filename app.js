let selectedFrames = [];
let lastClickedFrame = null;
let rangeModeActive = false;
let rangeStartFrame = null;
let marks = JSON.parse(localStorage.getItem('sp_tak_gallery_marks') || '{}');

window.addEventListener('DOMContentLoaded', () => {
  restoreMarksUI();
  updateBasketBadge();
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
