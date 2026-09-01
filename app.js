const STORAGE_KEY = "sp-tak-gallery-review-v1";

// `shots` is provided by shots.js
if (typeof shots === "undefined") {
  window.shots = [];
}

const filters = {
  product: "all",
  status: "all",
  search: "",
};

let review = loadReview();
let toastTimer;

const elements = {
  gallery: document.querySelector("#gallery"),
  emptyState: document.querySelector("#emptyState"),
  shotTemplate: document.querySelector("#shotTemplate"),
  searchInput: document.querySelector("#searchInput"),
  productFilters: document.querySelector("#productFilters"),
  statusFilters: document.querySelector("#statusFilters"),
  selectedCount: document.querySelector("#selectedCount"),
  totalStat: document.querySelector("#totalStat"),
  keepStat: document.querySelector("#keepStat"),
  banStat: document.querySelector("#banStat"),
  pendingStat: document.querySelector("#pendingStat"),
  summaryDialog: document.querySelector("#summaryDialog"),
  summaryContent: document.querySelector("#summaryContent"),
  previewDialog: document.querySelector("#previewDialog"),
  previewImage: document.querySelector("#previewImage"),
  previewProduct: document.querySelector("#previewProduct"),
  previewTitle: document.querySelector("#previewTitle"),
  previewTimecode: document.querySelector("#previewTimecode"),
  toast: document.querySelector("#toast"),
};

function emptyDecision() {
  return { status: "", note: "" };
}

function loadReview() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return shots.reduce((result, shot) => {
      const saved = parsed[shot.id];
      result[shot.id] = {
        status: saved?.status === "keep" || saved?.status === "ban" ? saved.status : "",
        note: typeof saved?.note === "string" ? saved.note.slice(0, 120) : "",
      };
      return result;
    }, {});
  } catch {
    return Object.fromEntries(shots.map((shot) => [shot.id, emptyDecision()]));
  }
}

function saveReview() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(review));
}

function matchesFilters(shot) {
  const decision = review[shot.id] || emptyDecision();
  const status = decision.status || "pending";
  const searchText = `${shot.id} ${shot.productName} ${shot.title} ${decision.note}`.toLocaleLowerCase("th");
  return (filters.product === "all" || shot.product === filters.product)
    && (filters.status === "all" || status === filters.status)
    && (!filters.search || searchText.includes(filters.search));
}

function render() {
  elements.gallery.replaceChildren();
  const visibleShots = shots.filter(matchesFilters);

  visibleShots.forEach((shot) => {
    const card = elements.shotTemplate.content.firstElementChild.cloneNode(true);
    const decision = review[shot.id] || emptyDecision();
    const image = card.querySelector(".shot-image");
    const keepButton = card.querySelector(".keep-button");
    const banButton = card.querySelector(".ban-button");
    const noteInput = card.querySelector(".note-input");

    card.dataset.shotId = shot.id;
    card.dataset.state = decision.status;
    const imgEl = image.querySelector(".shot-thumb");
    if (imgEl) {
      imgEl.src = shot.image;
      imgEl.alt = shot.title;
    }
    image.querySelector(".timecode").textContent = shot.timecode;
    card.querySelector(".product-name").textContent = shot.productName;
    card.querySelector(".shot-title").textContent = shot.title;
    card.querySelector(".shot-meta").textContent = `${shot.id} · ${shot.duration}`;
    card.querySelector(".status-dot").ariaLabel = decision.status === "keep"
      ? "เก็บแล้ว"
      : decision.status === "ban" ? "แบนแล้ว" : "รอตรวจ";
    noteInput.value = decision.note;
    keepButton.classList.toggle("is-active", decision.status === "keep");
    banButton.classList.toggle("is-active", decision.status === "ban");
    keepButton.setAttribute("aria-pressed", String(decision.status === "keep"));
    banButton.setAttribute("aria-pressed", String(decision.status === "ban"));

    image.addEventListener("click", () => openPreview(shot));
    keepButton.addEventListener("click", () => setStatus(shot.id, "keep"));
    banButton.addEventListener("click", () => setStatus(shot.id, "ban"));
    noteInput.addEventListener("input", (event) => {
      review[shot.id].note = event.target.value;
      saveReview();
    });

    elements.gallery.append(card);
  });

  elements.emptyState.hidden = visibleShots.length !== 0;
  updateStats();
  refreshIcons();
}

function updateStats() {
  const keep = shots.filter((shot) => review[shot.id]?.status === "keep").length;
  const ban = shots.filter((shot) => review[shot.id]?.status === "ban").length;
  elements.totalStat.textContent = String(shots.length);
  elements.keepStat.textContent = String(keep);
  elements.banStat.textContent = String(ban);
  elements.pendingStat.textContent = String(shots.length - keep - ban);
  elements.selectedCount.textContent = String(keep + ban);
}

function setStatus(shotId, nextStatus) {
  const current = review[shotId]?.status || "";
  review[shotId].status = current === nextStatus ? "" : nextStatus;
  saveReview();
  render();
}

function setSegment(container, button) {
  container.querySelectorAll(".segment").forEach((segment) => {
    const active = segment === button;
    segment.classList.toggle("is-active", active);
    segment.setAttribute("aria-selected", String(active));
  });
}

function buildExport() {
  const reviewedAt = new Date().toISOString();
  return {
    version: 1,
    source: "SP Tak Gallery demo",
    reviewedAt,
    keep: shots.filter((shot) => review[shot.id].status === "keep").map(exportShot),
    ban: shots.filter((shot) => review[shot.id].status === "ban").map(exportShot),
    pending: shots.filter((shot) => !review[shot.id].status).map(exportShot),
  };
}

function exportShot(shot) {
  return {
    id: shot.id,
    product: shot.productName,
    title: shot.title,
    timecode: shot.timecode,
    note: review[shot.id].note.trim(),
  };
}

function exportAsText(data) {
  const lines = ["# 🎬 สรุปผลการคัดเลือกช็อต (SP Tak Shot Review)", ""];
  if (data.keep.length > 0) {
    lines.push(`## ✅ ช็อตที่เลือกใช้ (Keep: ${data.keep.length} ช็อต)`);
    data.keep.forEach((item) => {
      lines.push(`- [${item.product}] ${item.id} @ ${item.timecode} | ${item.title}${item.note ? ` (หมายเหตุ: ${item.note})` : ""}`);
    });
    lines.push("");
  }
  if (data.ban.length > 0) {
    lines.push(`## ❌ ช็อตที่สั่งแบน (Ban: ${data.ban.length} ช็อต)`);
    data.ban.forEach((item) => {
      lines.push(`- [${item.product}] ${item.id} @ ${item.timecode} | ${item.title}${item.note ? ` (เหตุผล: ${item.note})` : ""}`);
    });
    lines.push("");
  }
  if (data.pending.length > 0) {
    lines.push(`## ⏳ ช็อตที่รอตรวจ (${data.pending.length} ช็อต)`);
    data.pending.forEach((item) => {
      lines.push(`- [${item.product}] ${item.id} @ ${item.timecode} | ${item.title}`);
    });
    lines.push("");
  }
  return lines.join("\n").trim();
}

function renderSummary() {
  const data = buildExport();
  elements.summaryContent.replaceChildren();
  [["เก็บ (Keep)", data.keep, "keep"], ["แบน (Ban)", data.ban, "ban"], ["รอตรวจ", data.pending, "pending"]]
    .forEach(([label, items, state]) => {
      const section = document.createElement("section");
      section.className = "summary-block";
      const heading = document.createElement("h3");
      heading.textContent = `${label} (${items.length})`;
      section.append(heading);

      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "summary-empty";
        empty.textContent = "ไม่มีรายการ";
        section.append(empty);
      } else {
        const list = document.createElement("ul");
        items.forEach((item) => {
          const listItem = document.createElement("li");
          const details = document.createElement("span");
          const title = document.createElement("strong");
          const timecode = document.createElement("span");
          title.textContent = `${item.id} · ${item.title}`;
          timecode.textContent = item.timecode;
          details.append(title);
          if (item.note) {
            const note = document.createElement("span");
            note.className = "summary-note";
            note.textContent = item.note;
            details.append(note);
          }
          listItem.dataset.state = state;
          listItem.append(details, timecode);
          list.append(listItem);
        });
        section.append(list);
      }
      elements.summaryContent.append(section);
    });
}

function openPreview(shot) {
  elements.previewImage.innerHTML = `<img src="${shot.image}" alt="${shot.title}">`;
  elements.previewProduct.textContent = shot.productName;
  elements.previewTitle.textContent = shot.title;
  elements.previewTimecode.textContent = shot.timecode;
  elements.previewDialog.showModal();
}

async function copySummary() {
  const text = exportAsText(buildExport());
  try {
    await navigator.clipboard.writeText(text);
    showToast("คัดลอกสรุปสำหรับส่งให้ AI แล้ว");
  } catch {
    showToast("ไม่สามารถคัดลอกได้อัตโนมัติ");
  }
}

function downloadSummary() {
  const data = buildExport();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `sp-tak-review-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resetReview() {
  if (!window.confirm("ล้างผลการคัดและหมายเหตุทั้งหมดหรือไม่")) return;
  review = Object.fromEntries(shots.map((shot) => [shot.id, emptyDecision()]));
  saveReview();
  renderSummary();
  render();
  showToast("ล้างผลการตรวจแล้ว");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 1800);
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

elements.productFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-product]");
  if (!button) return;
  filters.product = button.dataset.product;
  setSegment(elements.productFilters, button);
  render();
});

elements.statusFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-status]");
  if (!button) return;
  filters.status = button.dataset.status;
  setSegment(elements.statusFilters, button);
  render();
});

elements.searchInput.addEventListener("input", (event) => {
  filters.search = event.target.value.trim().toLocaleLowerCase("th");
  render();
});

document.querySelector("#openSummary").addEventListener("click", () => {
  renderSummary();
  elements.summaryDialog.showModal();
});
document.querySelector("#copyReview").addEventListener("click", copySummary);
document.querySelector("#downloadReview").addEventListener("click", downloadSummary);
document.querySelector("#resetReview").addEventListener("click", resetReview);

[elements.summaryDialog, elements.previewDialog].forEach((dialog) => {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
});

render();
