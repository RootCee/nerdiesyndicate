// M7.2 the Academy Library's reading panel: the guides chapter by chapter, the practice exams one
// question at a time with a scored review, the intro series and the ebook, and the directory. The
// state (LibraryReader) is plain data the tests drive; the panel draws it when there is a document.
// Practice only: nothing is stored or sent. Links open nerdieblaq.xyz (or YouTube) in a new tab.
import { ACADEMY_BOOKS, ACADEMY_EXAMS, ACADEMY_LINKS, ACADEMY_MEDIA, bookById, examById, mediaById, scoreExam } from './academy-content.js';

const STYLE = `
#libraryPanel{position:fixed;inset:0;z-index:60;display:none;align-items:center;justify-content:center;background:rgba(8,6,16,.6);font-family:'Barlow Condensed',system-ui,sans-serif;color:#f3eefc;padding:max(10px,env(safe-area-inset-top)) max(10px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(10px,env(safe-area-inset-left))}
#libraryPanel.on{display:flex}
#libraryPanel .lp-card{background:#1a1428;border:2px solid #c9a227;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.55);width:min(860px,100%);max-height:100%;display:flex;flex-direction:column;overflow:hidden}
#libraryPanel .lp-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid #3a2d5c;background:#140f22}
#libraryPanel .lp-kicker{font-size:13px;letter-spacing:.16em;color:#9fd8b8;text-transform:uppercase}
#libraryPanel h2{margin:2px 0 0;font-size:22px;letter-spacing:.04em;color:#e8c55a;line-height:1.1}
#libraryPanel .lp-x{flex:none;background:none;border:1px solid #5b4a86;color:#f3eefc;border-radius:8px;width:44px;height:44px;font-size:22px;cursor:pointer}
#libraryPanel .lp-body{display:grid;grid-template-columns:minmax(170px,230px) 1fr;min-height:0;flex:1}
#libraryPanel .lp-nav{border-right:1px solid #3a2d5c;overflow:auto;padding:8px;display:flex;flex-direction:column;gap:4px;background:#160f25}
#libraryPanel .lp-nav button{text-align:left;min-height:44px;padding:6px 10px;border-radius:8px;border:1px solid transparent;background:none;color:#d9cff2;font:500 16px/1.15 'Barlow Condensed',sans-serif;cursor:pointer}
#libraryPanel .lp-nav button.on{background:#2c2148;border-color:#6a55a3;color:#fff}
#libraryPanel .lp-main{overflow:auto;padding:16px 18px;min-width:0}
#libraryPanel .lp-main h3{margin:0 0 8px;font-size:24px;color:#fff}
#libraryPanel .lp-main p{margin:0 0 12px;font:400 17px/1.5 'Barlow',system-ui,sans-serif;color:#e7e0f4}
#libraryPanel .lp-main ul{margin:0 0 14px;padding-left:20px;font:400 16px/1.5 'Barlow',system-ui,sans-serif;color:#d9cff2}
#libraryPanel .lp-note{font-size:14px;color:#b7a9db;margin:6px 0 10px}
#libraryPanel .lp-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
#libraryPanel .lp-b{min-height:44px;padding:0 16px;border-radius:9px;border:1px solid #6a55a3;background:#3a2a63;color:#fff;font:600 16px 'Barlow Condensed',sans-serif;letter-spacing:.05em;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center}
#libraryPanel .lp-b.go{background:#1f8a4c;border-color:#39d67a}
#libraryPanel .lp-b.gold{background:#7a5d17;border-color:#e8c55a}
#libraryPanel .lp-b[disabled]{opacity:.45;cursor:default}
#libraryPanel .lp-opts{display:flex;flex-direction:column;gap:8px;margin:10px 0}
#libraryPanel .lp-opt{text-align:left;min-height:48px;padding:10px 12px;border-radius:10px;border:1px solid #5b4a86;background:#241a3c;color:#f3eefc;font:400 16px/1.35 'Barlow',system-ui,sans-serif;cursor:pointer}
#libraryPanel .lp-opt.sel{border-color:#e8c55a;background:#3a2d16}
#libraryPanel .lp-res{border:1px solid #3a2d5c;border-radius:10px;padding:10px 12px;margin:8px 0;background:#1f1733}
#libraryPanel .lp-res.ok{border-color:#2f9c62}#libraryPanel .lp-res.no{border-color:#b8434f}
#libraryPanel .lp-score{font-size:34px;font-weight:700;color:#e8c55a}
#libraryPanel .lp-progress{height:6px;border-radius:3px;background:#2c2148;overflow:hidden;margin:2px 0 12px}#libraryPanel .lp-progress i{display:block;height:100%;background:#39d67a}
#libraryPanel .lp-b:focus-visible,#libraryPanel .lp-opt:focus-visible,#libraryPanel .lp-x:focus-visible,#libraryPanel .lp-nav button:focus-visible{outline:3px solid #e8c55a;outline-offset:1px}
@media (max-width:700px),(max-height:520px) and (orientation:landscape){#libraryPanel .lp-body{grid-template-columns:1fr}#libraryPanel .lp-nav{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid #3a2d5c;padding:6px}#libraryPanel .lp-nav button{flex:none;min-height:40px}#libraryPanel .lp-main{padding:12px}}
`;

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// What the panel shows: { kind: 'book'|'exam'|'media'|'directory', id, chapter, question, answers, result }.
export class LibraryReader {
  constructor() { this.view = null; }
  openStation(id) {
    if (bookById(id)) this.view = { kind: 'book', id, chapter: 0 };
    else if (examById(id)) this.startExam(id);
    else if (mediaById(id)) this.view = { kind: 'media', id };
    else this.view = { kind: 'directory', id: 'directory' };
    return this.view;
  }
  close() { this.view = null; }
  chapter(n) { const b = bookById(this.view?.id); if (this.view?.kind === 'book' && b) this.view.chapter = Math.max(0, Math.min(b.chapters.length - 1, n)); }
  startExam(id) { this.view = { kind: 'exam', id, question: 0, answers: {}, result: null }; }
  choose(optionId) { const e = examById(this.view?.id); if (this.view?.kind !== 'exam' || this.view.result || !e) return; this.view.answers[e.questions[this.view.question].id] = optionId; }
  next() {
    const v = this.view, e = examById(v?.id); if (v?.kind !== 'exam' || v.result || !e) return;
    if (!v.answers[e.questions[v.question].id]) return;
    if (v.question + 1 < e.questions.length) v.question++; else v.result = scoreExam(e, v.answers);
  }
  back() { const v = this.view; if (v?.kind === 'exam' && !v.result && v.question > 0) v.question--; }
}

export class LibraryPanel {
  // onOpen(open): the game pauses movement and releases the pointer lock while the panel is open
  constructor({ mobile = false, onOpen = () => {}, document: doc = globalThis.document, openLink = (href) => globalThis.open?.(href, '_blank', 'noopener') } = {}) {
    Object.assign(this, { mobile, onOpen, doc, openLink }); this.reader = new LibraryReader(); this.isOpen = false;
  }
  get open() { return this.isOpen; }
  openStation(id) { this.reader.openStation(id); this.#setOpen(true); }
  close() { if (this.isOpen) { this.reader.close(); this.#setOpen(false); } }
  #setOpen(open) { this.isOpen = open; this.#ensureDom(); this.root?.classList.toggle('on', open); if (open) this.render(); this.onOpen(open); }
  #ensureDom() {
    if (this.root || !this.doc) return;
    const d = this.doc, style = d.createElement('style'); style.textContent = STYLE; d.head.appendChild(style);
    const root = d.createElement('div'); root.id = 'libraryPanel'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Academy Library');
    root.innerHTML = '<div class="lp-card"><div class="lp-head"><div><div class="lp-kicker"></div><h2></h2></div><button class="lp-x" type="button" aria-label="Close">×</button></div><div class="lp-body"><nav class="lp-nav" aria-label="Sections"></nav><div class="lp-main" aria-live="polite"></div></div></div>';
    d.body.appendChild(root); this.root = root;
    this.el = { kicker: root.querySelector('.lp-kicker'), title: root.querySelector('h2'), nav: root.querySelector('.lp-nav'), main: root.querySelector('.lp-main') };
    root.querySelector('.lp-x').addEventListener('click', () => this.close());
    // one delegated handler: every control carries data-act (and data-arg)
    root.addEventListener('click', (e) => { const t = e.target.closest('[data-act]'); if (t && !t.disabled) this.#act(t.dataset.act, t.dataset.arg); });
    for (const type of ['keydown', 'keyup']) root.addEventListener(type, (e) => { if (e.code !== 'Escape') e.stopPropagation(); });
  }
  #act(act, arg) {
    const r = this.reader;
    if (act === 'chapter') r.chapter(Number(arg));
    else if (act === 'station') r.openStation(arg);
    else if (act === 'choose') r.choose(arg);
    else if (act === 'next') r.next();
    else if (act === 'back') r.back();
    else if (act === 'retake') r.startExam(r.view.id);
    else if (act === 'link') { this.openLink(arg); return; }
    this.render();
  }
  render() {
    if (!this.el || !this.reader.view) return;
    const v = this.reader.view, { kicker, title, nav, main } = this.el;
    const linkBtn = (href, label, cls = '') => `<button class="lp-b ${cls}" type="button" data-act="link" data-arg="${esc(href)}">${esc(label)} ↗</button>`;
    const stationBtn = (id, label, cls = '') => `<button class="lp-b ${cls}" type="button" data-act="station" data-arg="${esc(id)}">${esc(label)}</button>`;
    if (v.kind === 'book') {
      const b = bookById(v.id), c = b.chapters[v.chapter];
      kicker.textContent = `${b.shelf} · Guide`; title.textContent = b.title;
      nav.innerHTML = b.chapters.map((ch, i) => `<button type="button" class="${i === v.chapter ? 'on' : ''}" data-act="chapter" data-arg="${i}">${i + 1}. ${esc(ch.title)}</button>`).join('');
      main.innerHTML = `<h3>${esc(c.title)}</h3><p>${esc(c.body)}</p><ul>${c.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
        <div class="lp-note">Chapter ${v.chapter + 1} of ${b.chapters.length} · from the Academy's official guide</div>
        <div class="lp-actions"><button class="lp-b" type="button" data-act="chapter" data-arg="${v.chapter - 1}" ${v.chapter ? '' : 'disabled'}>‹ Previous</button>
        ${v.chapter + 1 < b.chapters.length ? `<button class="lp-b go" type="button" data-act="chapter" data-arg="${v.chapter + 1}">Next chapter ›</button>` : stationBtn(b.exam, 'Take the practice exam', 'go')}
        ${linkBtn(b.pdf, 'Guide PDF')}</div>`;
    } else if (v.kind === 'exam') {
      const e = examById(v.id);
      kicker.textContent = 'Testing Room · Practice exam'; title.textContent = e.title;
      nav.innerHTML = e.questions.map((q, i) => `<button type="button" class="${!v.result && i === v.question ? 'on' : ''}" disabled>${i + 1}. ${v.answers[q.id] ? (v.result ? (v.result.results[i].correct ? '✓' : '✗') : '•') : '○'} Question ${i + 1}</button>`).join('');
      if (v.result) {
        const R = v.result;
        main.innerHTML = `<div class="lp-score">${R.score} / ${R.total}</div><p>${R.passed ? `Passed: you would clear the ${e.passThreshold}-of-${R.total} bar.` : `Not yet: the bar is ${e.passThreshold} of ${R.total}. Read the guide and try again.`}</p>
          ${e.questions.map((q, i) => { const r = R.results[i], chosen = q.options.find((o) => o.id === r.chosen), right = q.options.find((o) => o.id === q.correct); return `<div class="lp-res ${r.correct ? 'ok' : 'no'}"><strong>${i + 1}. ${esc(q.prompt)}</strong><p>${r.correct ? '✓' : '✗'} ${esc(chosen?.label || '')}${r.correct ? '' : `<br>Answer: ${esc(right.label)}`}</p><div class="lp-note">${esc(q.explanation)}</div></div>`; }).join('')}
          <div class="lp-note">Practice only: nothing is recorded. Certification, and its soulbound credential, is on nerdieblaq.xyz.</div>
          <div class="lp-actions"><button class="lp-b" type="button" data-act="retake">Retake</button>${stationBtn(e.book, 'Read the guide')}${linkBtn(ACADEMY_LINKS.certify, 'Get certified on nerdieblaq.xyz', 'gold')}</div>`;
      } else {
        const q = e.questions[v.question], chosen = v.answers[q.id];
        main.innerHTML = `<div class="lp-note">Question ${v.question + 1} of ${e.questions.length}</div><div class="lp-progress"><i style="width:${(v.question / e.questions.length) * 100}%"></i></div>
          <h3>${esc(q.prompt)}</h3><div class="lp-opts" role="radiogroup">${q.options.map((o) => `<button type="button" role="radio" aria-checked="${chosen === o.id}" class="lp-opt ${chosen === o.id ? 'sel' : ''}" data-act="choose" data-arg="${esc(o.id)}">${esc(o.id.toUpperCase())}. ${esc(o.label)}</button>`).join('')}</div>
          <div class="lp-actions"><button class="lp-b" type="button" data-act="back" ${v.question ? '' : 'disabled'}>‹ Back</button><button class="lp-b go" type="button" data-act="next" ${chosen ? '' : 'disabled'}>${v.question + 1 < e.questions.length ? 'Next ›' : 'Finish'}</button></div>`;
      }
    } else if (v.kind === 'media') {
      const m = mediaById(v.id);
      kicker.textContent = m.kind === 'video' ? 'Media Wall' : 'The Gallery · Reading nook'; title.textContent = m.title;
      nav.innerHTML = ACADEMY_MEDIA.map((x) => `<button type="button" class="${x.id === v.id ? 'on' : ''}" data-act="station" data-arg="${x.id}">${esc(x.title)}</button>`).join('');
      main.innerHTML = `<p>${esc(m.blurb)}</p><div class="lp-note">Opens in a new tab.</div><div class="lp-actions">${linkBtn(m.href, m.action, 'go')}</div>`;
    } else {
      kicker.textContent = 'Front desk'; title.textContent = 'Academy Directory';
      nav.innerHTML = '';
      main.innerHTML = `<p>Welcome to the Nerdie Blaq Academy Library. Everything here is free, and it all comes from the Academy on nerdieblaq.xyz.</p>
        <h3>Guides</h3><div class="lp-actions">${ACADEMY_BOOKS.map((b) => stationBtn(b.id, b.title)).join('')}</div>
        <h3 style="margin-top:14px">Practice exams</h3><div class="lp-actions">${ACADEMY_EXAMS.map((e) => stationBtn(e.id, e.title)).join('')}</div>
        <h3 style="margin-top:14px">Watch and read</h3><div class="lp-actions">${ACADEMY_MEDIA.map((m) => stationBtn(m.id, m.title)).join('')}</div>
        <div class="lp-note" style="margin-top:14px">Where things are: the guides on the lecterns by the aisle, the exams in the Testing Room, the intro series on the media wall, the ebook up the stairs in the Gallery.</div>
        <div class="lp-actions">${linkBtn(ACADEMY_LINKS.academy, 'The Academy on nerdieblaq.xyz')}${linkBtn(ACADEMY_LINKS.certify, 'Get certified', 'gold')}</div>`;
    }
    main.scrollTop = 0;
  }
}
