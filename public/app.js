
import { LOCALES, detectLocale, applyLocale } from "./i18n.js";

const langSelect = document.getElementById("langSelect");
const resultsEl = document.getElementById("results");
const input = document.getElementById("searchInput");
const goBtn = document.getElementById("goBtn");
const voiceBtn = document.getElementById("voiceBtn");
const imageInput = document.getElementById("imageInput");

document.getElementById("year").textContent = new Date().getFullYear();

// fill languages
const popular = ["tr","en","de","fr","ar"];
popular.forEach(code => {
  const o = document.createElement("option");
  o.value = code; o.textContent = new Intl.DisplayNames([code], {type:"language"}).of(code) || code.toUpperCase();
  langSelect.appendChild(o);
});

// set & apply locale
const initial = detectLocale();
langSelect.value = initial;
applyLocale(initial);

langSelect.addEventListener("change", () => applyLocale(langSelect.value));

async function search(q){
  resultsEl.innerHTML = `<div class="hint">⏳ Yükleniyor...</div>`;
  try{
    const res = await fetch("/api/search", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ query:q, locale: langSelect.value })
    }).then(r=>r.json());
    if(!res.ok) throw new Error("search-failed");
    render(res.results || []);
  }catch(e){
    resultsEl.innerHTML = `<div class="hint">Arama başarısız: ${e.message}</div>`;
  }
}

function render(list){
  if(!list.length){ resultsEl.innerHTML = `<div class="hint">Sonuç bulunamadı</div>`; return; }
  resultsEl.innerHTML = list.map(item => `
    <article class="card">
      <img src="${item.img || '/img/placeholder.jpg'}" alt="">
      <div class="title">${item.title}</div>
      <div class="meta">${item.merchant} • ${item.country}</div>
      <div class="meta"><b>${new Intl.NumberFormat(langSelect.value, { style:'currency', currency:item.currency||'USD' }).format(item.price)}</b></div>
      <a href="${item.url}" target="_blank" rel="noopener">Satıcıya git →</a>
    </article>
  `).join("");
}

// Wire search
goBtn.addEventListener("click", () => {
  const q = input.value.trim(); if(q) search(q);
});
input.addEventListener("keydown", (e)=>{ if(e.key==="Enter"){ goBtn.click(); } });

// Voice search via Web Speech API
let recognizer;
voiceBtn.addEventListener("click", ()=>{
  try{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SR){ alert("Tarayıcınız sesli aramayı desteklemiyor."); return; }
    recognizer = new SR();
    recognizer.lang = langSelect.value;
    recognizer.onresult = (ev)=>{
      const text = ev.results[0][0].transcript;
      input.value = text; goBtn.click();
    };
    recognizer.onerror = ()=> alert("Ses algılama hatası.");
    recognizer.start();
  }catch(e){
    alert("Sesli arama başlatılamadı.");
  }
});

// Image search
imageInput.addEventListener("change", async ()=>{
  const file = imageInput.files?.[0]; if(!file) return;
  const fd = new FormData(); fd.append("image", file);
  resultsEl.innerHTML = `<div class="hint">📷 Görsel yükleniyor...</div>`;
  try{
    const res = await fetch("/api/image-search", { method:"POST", body: fd }).then(r=>r.json());
    if(res.ok){
      input.value = "iphone 15 pro"; // demo purpose
      goBtn.click();
    }else{
      resultsEl.innerHTML = `<div class="hint">Görsel aramada hata: ${res.error||'bilinmiyor'}</div>`;
    }
  }catch(e){
    resultsEl.innerHTML = `<div class="hint">Görsel arama başarısız.</div>`;
  }
});
