// ── Storage abstraction ─────────────────────────────────────────────────────
const store = {
  async get(key) {
    if (window.electronAPI) return await window.electronAPI.storeGet(key);
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  async set(key, val) {
    if (window.electronAPI) return await window.electronAPI.storeSet(key, val);
    localStorage.setItem(key, JSON.stringify(val));
  },
  async delete(key) {
    if (window.electronAPI) return await window.electronAPI.storeDelete(key);
    localStorage.removeItem(key);
  }
};

// ── State ───────────────────────────────────────────────────────────────────
let novels = [];
let activeNovelId   = null;
let activeChapterId = null;
let settings = { font: 'lora', fontSize: 18, lineHeight: 200, moyuMin: 10, theme: 'morning', glassAlpha: 0.62, ambientSound: '', audioVolume: 40, textColor: '', panelWidth: 680, lang: 'zh' };
const DEFAULT_PANEL_WIDTH = 680;
let isNovelFormat   = false;

// Timer
let timerInterval     = null;
let sessionSeconds    = 0;
let totalSecondsToday = 0;
let chapterSeconds    = 0;
let todayWordCount    = 0;
let lastSavedWordCount = 0;
let timerRunning      = false;

// Moyu
let moyuInterval  = null;
let moyuRemaining = 0;

// New-novel creation picks (reset each time modal opens)
let _newNovelFont = 'lora';
let _newNovelMode = 'prose';

// ── Font definitions ─────────────────────────────────────────────────────────
const FONTS = [
  // English
  // English
  { key: 'lora',     name: 'Lora',           family: "'Lora', 'Noto Serif SC', serif",                 preview: 'Lora — The Story Begins' },
  { key: 'crimson',  name: 'Crimson',        family: "'Crimson Text', 'Noto Serif SC', serif",          preview: 'Crimson — Once upon a time' },
  { key: 'playfair', name: 'Playfair',       family: "'Playfair Display', 'Noto Serif SC', serif",      preview: 'Playfair — A Tale of Two Cities' },
  { key: 'garamond', name: 'Garamond',       family: "'EB Garamond', 'Noto Serif SC', serif",           preview: 'Garamond — In a world of words' },
  // Chinese
  { key: 'notosc',   name: '思源宋体',       family: "'Noto Serif SC', serif",                          preview: '思源宋体 — 宋刻古籍字形' },
  { key: 'notosans', name: '思源黑体',       family: "'Noto Sans SC', 'PingFang SC', sans-serif",       preview: '思源黑体 — 现代简洁感' },
  { key: 'mashan',   name: '马善正楷',       family: "'Ma Shan Zheng', 'Noto Serif SC', serif",         preview: '马善正楷 — 书法韵味悠长' },
  { key: 'kaiti',    name: '楷体',           family: "'STKaiti', 'KaiTi', 'Noto Serif SC', serif",      preview: '楷体 — 端正典雅正楷' },
  { key: 'fangsong', name: '仿宋',           family: "'STFangsong', 'FangSong', 'Noto Serif SC', serif", preview: '仿宋 — 书报印刷气息' },
];

// ── Theme definitions ────────────────────────────────────────────────────────
const THEMES = [
  { key: 'morning', label: '午后书房', enLabel: 'Afternoon', previewClass: 'theme-morning-preview', canvas: false },
  { key: 'mint',    label: '清晨薄荷', enLabel: 'Morning Mint', previewClass: 'theme-mint-preview', canvas: false },
  { key: 'sakura',  label: '樱花春日', enLabel: 'Sakura',    previewClass: 'theme-sakura-preview',  canvas: false },
  { key: 'custom',  label: '自定义…',  enLabel: 'Custom…',   previewClass: 'theme-custom-preview',  canvas: false },
];

// ── Internationalisation ──────────────────────────────────────────────────────
const STRINGS = {
  zh: {
    'btn-bg':'🌙 背景','btn-font':'Aa 字体','btn-prose':'随笔模式','btn-novel':'小说模式',
    'btn-export':'⬆ 导出','btn-moyu':'🐾 摸鱼',
    'panel-settings':'字体与排版','label-font':'字体','label-size':'字号','label-lineh':'行距',
    'label-panel-w':'文档宽度','hint-panel-w':'（拖拽面板左右边缘调整）','btn-reset-w':'恢复默认',
    'label-text-color':'正文字色','label-moyu-img':'摸鱼形象','btn-pick-moyu':'📁 上传图片 / GIF',
    'btn-clear-moyu':'清除','label-moyu-time':'摸鱼时长（分钟）',
    'panel-theme':'背景 · 声音 · 视觉','label-scene':'场景背景','label-theme':'色调主题',
    'hint-theme':'影响侧边栏 / 面板配色','label-glass':'毛玻璃透明度','hint-glass':'（右滑更透明）',
    'label-sound':'环境音效','label-vol':'音量',
    'panel-export':'导出','export-desc':'选择导出格式',
    'export-txt':'📄 纯文本 .txt','export-md':'📝 Markdown .md','export-html':'🌐 HTML 排版 .html',
    'panel-outline':'大纲','outline-hint':'记录故事结构、人物设定、情节要点，随时查阅。',
    'outline-placeholder':'在这里写大纲、人物设定、世界观…','btn-save-outline':'保存大纲',
    'panel-new-novel':'新建小说','label-title':'书名','title-placeholder':'我的小说',
    'label-ch1-title':'第一章标题','ch1-placeholder':'第一章 序章',
    'label-writing-font':'写作字体','label-writing-mode':'写作模式',
    'mode-prose':'随笔模式','mode-prose-desc':'左对齐 · 无缩进',
    'mode-novel':'小说模式','mode-novel-desc':'首行缩进 · 两端对齐',
    'btn-start-writing':'开始创作 ✦',
    'empty-text':'新建一部小说，开始创作','btn-start':'＋ 新建小说',
    'write-placeholder':'在这里开始写作…','chapter-placeholder':'章节标题',
    'moyu-label':'好好休息 🍵','moyu-cancel':'提前结束',
    'add-chapter':'＋ 新建章节','no-novel-label':'请选择或新建小说',
    'ch-count':(n)=>`${n} 章`,'word-badge':(n)=>`${n} 字`,
    'mute':'静音','add-sound':'添加音频文件…','sound-empty':'在 sound/ 文件夹放入 MP3 文件即可显示',
    'playing':'▶ 播放中','clear-scene':'清除','import-scene':'导入',
    'stats-total-words':'总字数','stats-total-time':'总时长','stats-chs':'章节数',
    'stats-ch-col':'章节','stats-wc-col':'字数','stats-dur-col':'时长',
    'stats-suffix':' · 写作统计','outline-suffix':' · 大纲',
    'toast-saved':'已保存 ✓','toast-outline-saved':'大纲已保存 ✓',
    'toast-break-end':'休息结束，继续加油！✨','toast-importing':'正在导入…',
    'toast-imported':(n)=>`已导入 ${n} 个文件 ✓`,
    'toast-audio-loaded':'音频已加载 ✓','toast-bg-set':'自定义背景已设置 ✓',
    'toast-video-bg':'视频背景已设置 ✓ （重启后需重新选择）',
    'toast-moyu-updated':'摸鱼形象已更新 ✓','toast-moyu-cleared':'已清除自定义摸鱼形象',
    'toast-no-path':'无法获取文件路径','toast-adding':'正在添加…',
    'toast-sound-added':(name)=>`已添加：${name} ✓`,
    'toast-sound-fail':'添加失败，请检查文件权限',
    'toast-no-novel':'请先打开一部小说',
    'toast-auto-sound':(name)=>`自动播放：${name}`,
    'chapnotes-label':'章纲','chapnotes-placeholder':'本章提纲、场景备注…',
    'panel-chars':'角色卡','chars-hint':'记录角色设定、性格、背景，随时查阅。',
    'btn-add-char':'＋ 添加角色','card-char-name-ph':'角色名称','card-char-desc-ph':'性格、背景、外貌、能力…',
    'panel-worlds':'世界卡','worlds-hint':'记录世界设定、场景、历史背景，构建你的世界观。',
    'btn-add-world':'＋ 添加世界','card-world-name-ph':'世界 / 地点名称','card-world-desc-ph':'地理、历史、规则、氛围…',
    'chars-suffix':' · 角色卡','worlds-suffix':' · 世界卡',
    'toast-export-ok':'导出成功 ✓','toast-min-ch':'至少保留一个章节',
    'confirm-del-ch':'删除该章节？内容无法恢复。',
    'confirm-del-novel':'删除整部小说及所有章节？无法恢复。',
    'confirm-del-scene':(n)=>`删除「${n}」？`,'confirm-del-sound':(n)=>`删除「${n}」？`,
    'audio-no-file':'未加载（支持 MP3 / OGG / WAV）',
    'app-name':'乐安流文',
    'untitled-novel':'未命名小说',
    'ch-default-title':(n) => n === 1 ? '第一章' : `第${n}章`,
  },
  en: {
    'btn-bg':'🌙 Scenes','btn-font':'Aa Font','btn-prose':'Essay','btn-novel':'Novel',
    'btn-export':'⬆ Export','btn-moyu':'🐾 Break',
    'panel-settings':'Typography','label-font':'Font','label-size':'Size','label-lineh':'Line Height',
    'label-panel-w':'Panel Width','hint-panel-w':'(Drag panel edge to resize)','btn-reset-w':'Reset',
    'label-text-color':'Text Color','label-moyu-img':'Break Image','btn-pick-moyu':'📁 Upload Image / GIF',
    'btn-clear-moyu':'Clear','label-moyu-time':'Break Duration (min)',
    'panel-theme':'Scene · Sound · Visual','label-scene':'Scene','label-theme':'Theme',
    'hint-theme':'Sidebar & panel color','label-glass':'Glass Opacity','hint-glass':'(Slide right to blur more)',
    'label-sound':'Ambient Sound','label-vol':'Volume',
    'panel-export':'Export','export-desc':'Choose export format',
    'export-txt':'📄 Plain Text .txt','export-md':'📝 Markdown .md','export-html':'🌐 HTML Layout .html',
    'panel-outline':'Outline','outline-hint':'Record plot structure, characters, and key points for easy reference.',
    'outline-placeholder':'Write your outline, characters, worldbuilding…','btn-save-outline':'Save Outline',
    'panel-new-novel':'New Novel','label-title':'Title','title-placeholder':'My Novel',
    'label-ch1-title':'First Chapter Title','ch1-placeholder':'Chapter 1: Prologue',
    'label-writing-font':'Writing Font','label-writing-mode':'Writing Mode',
    'mode-prose':'Essay','mode-prose-desc':'Left-aligned · No indent',
    'mode-novel':'Novel','mode-novel-desc':'First-line indent · Justified',
    'btn-start-writing':'Start Writing ✦',
    'empty-text':'Create a new novel to begin writing','btn-start':'＋ New Novel',
    'write-placeholder':'Start writing here…','chapter-placeholder':'Chapter Title',
    'moyu-label':'Take a break 🍵','moyu-cancel':'End Early',
    'add-chapter':'＋ New Chapter','no-novel-label':'Select or create a novel',
    'ch-count':(n)=>`${n} ch`,'word-badge':(n)=>`${n} words`,
    'mute':'Mute','add-sound':'Add audio file…','sound-empty':'Drop MP3 files into sound/ folder',
    'playing':'▶ Playing','clear-scene':'Clear','import-scene':'Import',
    'stats-total-words':'Total Words','stats-total-time':'Total Time','stats-chs':'Chapters',
    'stats-ch-col':'Chapter','stats-wc-col':'Words','stats-dur-col':'Duration',
    'stats-suffix':' · Writing Stats','outline-suffix':' · Outline',
    'toast-saved':'Saved ✓','toast-outline-saved':'Outline saved ✓',
    'toast-break-end':'Break over — keep writing! ✨','toast-importing':'Importing…',
    'toast-imported':(n)=>`Imported ${n} file${n>1?'s':''} ✓`,
    'toast-audio-loaded':'Audio loaded ✓','toast-bg-set':'Custom background set ✓',
    'toast-video-bg':'Video background set ✓ (re-select after restart)',
    'toast-moyu-updated':'Break image updated ✓','toast-moyu-cleared':'Custom break image cleared',
    'toast-no-path':'Cannot get file path','toast-adding':'Adding…',
    'toast-sound-added':(name)=>`Added: ${name} ✓`,
    'toast-sound-fail':'Failed to add — check file permissions',
    'toast-no-novel':'Please open a novel first',
    'toast-auto-sound':(name)=>`Auto-playing: ${name}`,
    'chapnotes-label':'Ch. Notes','chapnotes-placeholder':'Chapter outline, scene notes…',
    'panel-chars':'Characters','chars-hint':'Record character settings, personalities, and backstories.',
    'btn-add-char':'＋ Add Character','card-char-name-ph':'Character name','card-char-desc-ph':'Personality, backstory, appearance, abilities…',
    'panel-worlds':'Worlds','worlds-hint':'Record world settings, locations, and lore.',
    'btn-add-world':'＋ Add World','card-world-name-ph':'World / Location name','card-world-desc-ph':'Geography, history, rules, atmosphere…',
    'chars-suffix':' · Characters','worlds-suffix':' · Worlds',
    'toast-export-ok':'Exported ✓','toast-min-ch':'At least one chapter required',
    'confirm-del-ch':'Delete this chapter? This cannot be undone.',
    'confirm-del-novel':'Delete this entire novel? This cannot be undone.',
    'confirm-del-scene':(n)=>`Delete "${n}"?`,'confirm-del-sound':(n)=>`Delete "${n}"?`,
    'audio-no-file':'No file loaded (MP3 / OGG / WAV)',
    'app-name':'Serene Flow',
    'untitled-novel':'Untitled Novel',
    'ch-default-title':(n) => n === 1 ? 'Chapter 1' : `Chapter ${n}`,
  }
};

const SCENE_NAME_EN = {
  '下雨': 'Rain', '大海': 'Ocean', '大雪': 'Snow',
  '屋内': 'Indoor', '森林小溪': 'Forest Stream',
};

function t(key, ...args) {
  const lang = settings.lang || 'zh';
  const s = (STRINGS[lang] || STRINGS.zh)[key] ?? STRINGS.zh[key] ?? key;
  return typeof s === 'function' ? s(...args) : s;
}

function applyLang() {
  const lang = settings.lang || 'zh';
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.dataset.i18n;
    const s = (STRINGS[lang] || STRINGS.zh)[key] ?? STRINGS.zh[key];
    if (typeof s === 'string') node.textContent = s;
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(node => {
    const key = node.dataset.i18nPh;
    const s = (STRINGS[lang] || STRINGS.zh)[key] ?? STRINGS.zh[key];
    if (typeof s === 'string') node.setAttribute('placeholder', s);
  });
  const fmtBtn = document.getElementById('formatBtn');
  if (fmtBtn) fmtBtn.textContent = isNovelFormat ? t('btn-novel') : t('btn-prose');
  const langBtn = document.getElementById('langBtn');
  if (langBtn) langBtn.textContent = lang === 'zh' ? 'EN' : '中';
  renderThemeGrid();
}

// ── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  novels   = (await store.get('novels'))   || [];
  settings = (await store.get('settings')) || settings;
  if (!settings.lang) settings.lang = 'zh';

  const todayKey  = today();
  const todayData = (await store.get('stats_' + todayKey)) || { words: 0, seconds: 0 };
  totalSecondsToday  = todayData.seconds;
  todayWordCount     = todayData.words;
  lastSavedWordCount = todayWordCount;

  applySettings();
  applyLang();
  _initCanvas();
  if (settings.theme === 'custom') await applyCustomBg();
  renderNovels();
  renderThemeGrid();
  renderFontOptions();
  renderNewNovelFontPicker();
  bindEvents();
  updateChapterTimeDisplay();
  updateWordCount();

  // Load custom moyu image
  const moyuImg = await store.get('moyuImage');
  if (moyuImg) _applyMoyuImage(moyuImg);

  // Pre-load scene, sound and moyu video
  await Promise.all([loadSceneList(), loadSoundList(), loadMoyuVideo()]);
  if (settings.activeScene) {
    const s = _sceneList.find(s => s.path === settings.activeScene);
    if (s) applyScene(s, true);
  }

  // Restore ambient audio
  const savedAudioPath = await store.get('ambientAudioPath');
  if (savedAudioPath) {
    settings.ambientSound = savedAudioPath;
    const name = savedAudioPath.split('/').pop();
    _updateAudioLabel(name);
    const volSlider = document.getElementById('audioVolumeSlider');
    if (volSlider) {
      volSlider.value = settings.audioVolume ?? 40;
      document.getElementById('audioVolumeVal').textContent = (settings.audioVolume ?? 40) + '%';
    }
    startAmbientSound(savedAudioPath);
  }

  // Kill any lingering particle overlay from old sessions
  _stopOverlay();

  if (novels.length === 0) {
    showWelcome();
  } else {
    hideWelcome();
    const lastId   = await store.get('lastNovelId');
    const lastChId = await store.get('lastChapterId');
    const novel    = novels.find(n => n.id === lastId) || novels[0];
    if (novel) openNovel(novel.id, lastChId);
  }

  startAutoSave();
}

// ── Render sidebar ─────────────────────────────────────────────────────────
function renderNovels() {
  const list = document.getElementById('novelList');
  list.innerHTML = '';

  novels.forEach(novel => {
    const totalWords = novel.chapters.reduce((s, c) => s + countWords(c.content), 0);
    const totalSecs  = novel.chapters.reduce((s, c) => s + (c.timeSeconds || 0), 0);
    const timeLabel  = totalSecs > 0 ? ' · ⏱ ' + fmtTime(totalSecs) : '';

    const item = el('div', 'novel-item' + (novel.id === activeNovelId ? ' active' : ''));
    item.innerHTML = `
      <div class="novel-item-row">
        <div style="min-width:0;flex:1">
          <div class="novel-item-title">${esc(novel.title)}</div>
          <div class="novel-item-meta">${t('ch-count', novel.chapters.length)} · ${t('word-badge', totalWords)}${timeLabel}</div>
        </div>
        <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
          <button class="item-stats-btn" data-nid="${novel.id}" title="写作统计">📊</button>
          <button class="item-del-btn"   data-nid="${novel.id}" title="删除小说">×</button>
        </div>
      </div>`;

    item.querySelector('.item-stats-btn').addEventListener('click', e => {
      e.stopPropagation(); showNovelStats(novel.id);
    });
    item.querySelector('.item-del-btn').addEventListener('click', e => {
      e.stopPropagation(); deleteNovel(novel.id);
    });
    item.addEventListener('click', () => openNovel(novel.id));
    list.appendChild(item);

    if (novel.id === activeNovelId) {
      novel.chapters.forEach(ch => {
        const ci = el('div', 'chapter-item' + (ch.id === activeChapterId ? ' active' : ''));
        const chTime = ch.timeSeconds ? fmtTime(ch.timeSeconds) : '';
        ci.innerHTML = `<span class="ch-title-text">${esc(ch.title)}</span>
          <span style="display:flex;align-items:center;gap:4px;flex-shrink:0">
            ${chTime ? `<span class="ch-time">${chTime}</span>` : ''}
            <button class="item-del-btn" title="删除章节">×</button>
          </span>`;
        ci.querySelector('.item-del-btn').addEventListener('click', e => {
          e.stopPropagation(); deleteChapter(novel.id, ch.id);
        });
        ci.addEventListener('click', e => { e.stopPropagation(); openChapter(novel.id, ch.id); });
        list.appendChild(ci);
      });

      const addBtn = el('button', 'add-chapter-btn');
      addBtn.textContent = t('add-chapter');
      addBtn.addEventListener('click', e => { e.stopPropagation(); addChapter(novel.id); });
      list.appendChild(addBtn);
    }
  });
}

// ── Novel / chapter operations ───────────────────────────────────────────────
function openNovel(novelId, chapterId) {
  activeNovelId = novelId;
  const novel = novels.find(n => n.id === novelId);
  if (!novel) return;

  // Apply per-novel font and format if set
  if (novel.font) {
    settings.font = novel.font;
    applySettings();
  }
  if (novel.format !== undefined) {
    isNovelFormat = (novel.format === 'novel');
    document.body.classList.toggle('format-novel', isNovelFormat);
    document.getElementById('formatBtn').classList.toggle('active', isNovelFormat);
    document.getElementById('formatBtn').textContent = isNovelFormat ? t('btn-novel') : t('btn-prose');
  }

  const ch = chapterId ? novel.chapters.find(c => c.id === chapterId) : novel.chapters[0];
  if (ch) openChapter(novelId, ch.id);
  else renderNovels();
  store.set('lastNovelId', novelId);
}

function openChapter(novelId, chapterId) {
  saveCurrentChapter();
  saveChapterNotes();
  saveChapterTime();
  stopTimer();

  activeNovelId   = novelId;
  activeChapterId = chapterId;
  const novel = novels.find(n => n.id === novelId);
  const ch    = novel?.chapters.find(c => c.id === chapterId);
  if (!novel || !ch) return;

  document.getElementById('currentNovelLabel').textContent = novel.title;
  const titleInput          = document.getElementById('chapterTitleInput');
  titleInput.value          = ch.title;
  titleInput.disabled       = false;
  const area                = document.getElementById('writingArea');
  area.contentEditable      = 'true';
  area.innerText            = ch.content || '';
  // If empty, clear any stray <br> browsers insert
  if (!ch.content) area.innerHTML = '';

  chapterSeconds = ch.timeSeconds || 0;
  updateWordCount();
  updateChapterTimeDisplay();
  loadChapterNotes(chapterId);
  document.getElementById('chNotesWidget').classList.remove('hidden');
  renderNovels();
  store.set('lastNovelId',   novelId);
  store.set('lastChapterId', chapterId);
  startTimer();
  area.focus();
}

function saveCurrentChapter() {
  if (!activeNovelId || !activeChapterId) return;
  const novel = novels.find(n => n.id === activeNovelId);
  const ch    = novel?.chapters.find(c => c.id === activeChapterId);
  if (!ch) return;
  ch.content = document.getElementById('writingArea').innerText || '';
  ch.title   = document.getElementById('chapterTitleInput').value || ch.title;
}

function addChapter(novelId) {
  const novel = novels.find(n => n.id === novelId);
  if (!novel) return;
  const idx = novel.chapters.length + 1;
  const ch  = { id: uid(), title: t('ch-default-title', idx), content: '', timeSeconds: 0 };
  novel.chapters.push(ch);
  saveNovels();
  openChapter(novelId, ch.id);
}

async function createNovel(title, firstChapterTitle, fontKey, format) {
  const novel = {
    id: uid(),
    title:   title || t('untitled-novel'),
    font:    fontKey || settings.font,
    format:  format || 'prose',
    chapters: [{ id: uid(), title: firstChapterTitle || t('ch-default-title', 1), content: '', timeSeconds: 0 }],
    createdAt: Date.now()
  };
  novels.unshift(novel);
  await saveNovels();
  hideWelcome();
  openNovel(novel.id, novel.chapters[0].id);
}

async function saveNovels() {
  saveCurrentChapter();
  await store.set('novels', novels);
  renderNovels();
}

// ── Timer ─────────────────────────────────────────────────────────────────────
function startTimer() {
  if (timerRunning) return;
  timerRunning   = true;
  timerInterval  = setInterval(async () => {
    sessionSeconds++;
    totalSecondsToday++;
    chapterSeconds++;
    updateChapterTimeDisplay();
    if (sessionSeconds % 15 === 0) {
      saveChapterTime();
      await saveStats();
    }
  }, 1000);
}

function stopTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
}

function saveChapterTime() {
  if (!activeNovelId || !activeChapterId) return;
  const novel = novels.find(n => n.id === activeNovelId);
  const ch    = novel?.chapters.find(c => c.id === activeChapterId);
  if (ch) { ch.timeSeconds = chapterSeconds; store.set('novels', novels); }
}

function updateChapterTimeDisplay() {
  const badge = document.getElementById('chapterTimeBadge');
  if (badge) badge.textContent = '⏱ ' + fmtTime(chapterSeconds);
}

async function saveStats() {
  await store.set('stats_' + today(), { words: todayWordCount, seconds: totalSecondsToday });
}

// ── Word count ────────────────────────────────────────────────────────────────
function updateWordCount() {
  const content = document.getElementById('writingArea').innerText || '';
  const count   = countWords(content);
  document.getElementById('wordCountBadge').textContent = t('word-badge', count);
  const delta = count - lastSavedWordCount;
  if (delta > 0) {
    todayWordCount    += delta;
    lastSavedWordCount = count;
  }
}

function countWords(text) {
  if (!text) return 0;
  return text.replace(/\s/g, '').length;
}

// ── Stats panel ───────────────────────────────────────────────────────────────
function showNovelStats(novelId) {
  const novel = novels.find(n => n.id === novelId);
  if (!novel) return;

  document.getElementById('statsPanelTitle').textContent = `${novel.title}${t('stats-suffix')}`;

  const totalWords = novel.chapters.reduce((s, c) => s + countWords(c.content), 0);
  const totalSecs  = novel.chapters.reduce((s, c) => s + (c.timeSeconds || 0), 0);

  const rows = novel.chapters.map(ch => {
    const w = countWords(ch.content);
    const sec = ch.timeSeconds || 0;
    return `<tr>
      <td class="stats-td">${esc(ch.title)}</td>
      <td class="stats-td stats-num">${t('word-badge', w)}</td>
      <td class="stats-td stats-num">${sec > 0 ? fmtTime(sec) : '—'}</td>
    </tr>`;
  }).join('');

  document.getElementById('statsBody').innerHTML = `
    <div class="stats-summary">
      <div class="stats-item"><span class="stats-val">${totalWords}</span><span class="stats-key">${t('stats-total-words')}</span></div>
      <div class="stats-item"><span class="stats-val">${fmtTime(totalSecs)}</span><span class="stats-key">${t('stats-total-time')}</span></div>
      <div class="stats-item"><span class="stats-val">${novel.chapters.length}</span><span class="stats-key">${t('stats-chs')}</span></div>
    </div>
    <table class="stats-table">
      <thead><tr>
        <th class="stats-th">${t('stats-ch-col')}</th>
        <th class="stats-th stats-num">${t('stats-wc-col')}</th>
        <th class="stats-th stats-num">${t('stats-dur-col')}</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;

  document.getElementById('statsOverlay').classList.remove('hidden');
}

// ── Outline ───────────────────────────────────────────────────────────────────
async function openOutline() {
  const novel = novels.find(n => n.id === activeNovelId);
  const title = novel ? novel.title : t('panel-outline');
  document.getElementById('outlinePanelTitle').textContent = title + t('outline-suffix');

  const key     = activeNovelId ? 'outline_' + activeNovelId : null;
  const content = key ? ((await store.get(key)) || '') : '';
  document.getElementById('outlineArea').value = content;
  document.getElementById('outlineOverlay').classList.remove('hidden');
  document.getElementById('outlineArea').focus();
}

async function saveOutline() {
  if (!activeNovelId) { showToast(t('toast-no-novel')); return; }
  const key     = 'outline_' + activeNovelId;
  const content = document.getElementById('outlineArea').value;
  await store.set(key, content);
  showToast(t('toast-outline-saved'));
}

// ── Chapter notes ─────────────────────────────────────────────────────────────
async function loadChapterNotes(chapterId) {
  const content = (await store.get('chapnotes_' + chapterId)) || '';
  document.getElementById('chNotesArea').value = content;
}

async function saveChapterNotes() {
  if (!activeChapterId) return;
  const content = document.getElementById('chNotesArea').value;
  await store.set('chapnotes_' + activeChapterId, content);
}

// ── Character & World Cards ───────────────────────────────────────────────────
let _cardsPanel = { type: 'chars', data: [] };

async function openCharsPanel() {
  if (!activeNovelId) { showToast(t('toast-no-novel')); return; }
  const novel = novels.find(n => n.id === activeNovelId);
  document.getElementById('charsPanelTitle').textContent =
    (novel ? novel.title + t('chars-suffix') : t('panel-chars'));
  _cardsPanel = { type: 'chars', data: (await store.get('chars_' + activeNovelId)) || [] };
  renderCards();
  document.getElementById('charsOverlay').classList.remove('hidden');
}

async function openWorldsPanel() {
  if (!activeNovelId) { showToast(t('toast-no-novel')); return; }
  const novel = novels.find(n => n.id === activeNovelId);
  document.getElementById('worldsPanelTitle').textContent =
    (novel ? novel.title + t('worlds-suffix') : t('panel-worlds'));
  _cardsPanel = { type: 'worlds', data: (await store.get('worlds_' + activeNovelId)) || [] };
  renderCards();
  document.getElementById('worldsOverlay').classList.remove('hidden');
}

function renderCards() {
  const listId = _cardsPanel.type === 'chars' ? 'charsList' : 'worldsList';
  const listEl = document.getElementById(listId);
  if (!listEl) return;
  const namePh = t('card-' + (_cardsPanel.type === 'chars' ? 'char' : 'world') + '-name-ph');
  const descPh = t('card-' + (_cardsPanel.type === 'chars' ? 'char' : 'world') + '-desc-ph');

  listEl.innerHTML = '';
  if (_cardsPanel.data.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'cards-empty';
    empty.textContent = _cardsPanel.type === 'chars'
      ? (settings.lang === 'zh' ? '还没有角色，点击上方按钮添加' : 'No characters yet — click above to add one')
      : (settings.lang === 'zh' ? '还没有世界，点击上方按钮添加' : 'No worlds yet — click above to add one');
    listEl.appendChild(empty);
    return;
  }

  _cardsPanel.data.forEach((card, idx) => {
    const item = document.createElement('div');
    item.className = 'card-item';

    const header = document.createElement('div');
    header.className = 'card-item-header';

    const nameInput = document.createElement('input');
    nameInput.className = 'card-name-input';
    nameInput.value = card.name;
    nameInput.placeholder = namePh;

    const chevron = document.createElement('span');
    chevron.className = 'card-chevron';
    chevron.textContent = '▾';

    const delBtn = document.createElement('button');
    delBtn.className = 'card-del-btn';
    delBtn.textContent = '×';
    delBtn.title = settings.lang === 'zh' ? '删除' : 'Delete';

    header.append(nameInput, chevron, delBtn);

    const body = document.createElement('div');
    body.className = 'card-item-body';
    body.style.display = 'none';

    const descArea = document.createElement('textarea');
    descArea.className = 'card-desc-area';
    descArea.value = card.desc;
    descArea.placeholder = descPh;
    body.appendChild(descArea);

    item.append(header, body);
    listEl.appendChild(item);

    // Toggle expand
    header.addEventListener('click', e => {
      if (e.target === nameInput || e.target === delBtn) return;
      const open = body.style.display !== 'none';
      body.style.display = open ? 'none' : 'block';
      item.classList.toggle('open', !open);
      if (!open) descArea.focus();
    });

    // Save name
    nameInput.addEventListener('input', () => {
      _cardsPanel.data[idx].name = nameInput.value;
      _saveCards();
    });
    nameInput.addEventListener('keydown', e => e.stopPropagation());

    // Save desc
    descArea.addEventListener('input', () => {
      _cardsPanel.data[idx].desc = descArea.value;
      _saveCards();
    });
    descArea.addEventListener('keydown', e => e.stopPropagation());

    // Delete
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      _cardsPanel.data.splice(idx, 1);
      store.set(_cardsPanel.type + '_' + activeNovelId, _cardsPanel.data);
      renderCards();
    });
  });
}

let _cardsSaveTimer = null;
function _saveCards() {
  clearTimeout(_cardsSaveTimer);
  _cardsSaveTimer = setTimeout(() => {
    if (activeNovelId)
      store.set(_cardsPanel.type + '_' + activeNovelId, _cardsPanel.data);
  }, 600);
}

async function addCard() {
  if (!activeNovelId) { showToast(t('toast-no-novel')); return; }
  _cardsPanel.data.push({ id: uid(), name: '', desc: '' });
  await store.set(_cardsPanel.type + '_' + activeNovelId, _cardsPanel.data);
  renderCards();
  // Auto-expand the new (last) card
  const listId = _cardsPanel.type === 'chars' ? 'charsList' : 'worldsList';
  const items = document.getElementById(listId).querySelectorAll('.card-item');
  const last = items[items.length - 1];
  if (last) {
    const body = last.querySelector('.card-item-body');
    body.style.display = 'block';
    last.classList.add('open');
    last.querySelector('.card-name-input').focus();
  }
}

// ── Moyu ─────────────────────────────────────────────────────────────────────
let _moyuVideoPath = '';

async function loadMoyuVideo() {
  if (!window.electronAPI) return;
  const files = await window.electronAPI.listMoyu();
  if (files.length > 0) _moyuVideoPath = files[0].path;
}

function startMoyu() {
  stopTimer();
  moyuRemaining = settings.moyuMin * 60;

  const vid = document.getElementById('moyuVideo');
  if (_moyuVideoPath) {
    vid.src = _fileURL(_moyuVideoPath);
    vid.load();
    vid.play().catch(() => {});
  }

  document.getElementById('moyuOverlay').classList.remove('hidden');
  updateMoyuTimer();
  moyuInterval = setInterval(() => {
    moyuRemaining--;
    updateMoyuTimer();
    if (moyuRemaining <= 0) endMoyu();
  }, 1000);
}

function endMoyu() {
  clearInterval(moyuInterval);
  const vid = document.getElementById('moyuVideo');
  vid.pause(); vid.src = '';
  document.getElementById('moyuOverlay').classList.add('hidden');
  if (activeChapterId) startTimer();
  showToast(t('toast-break-end'));
}

function updateMoyuTimer() {
  const m = Math.floor(moyuRemaining / 60);
  const s = moyuRemaining % 60;
  document.getElementById('moyuTimer').textContent = `${pad(m)}:${pad(s)}`;
}

// ── Export ────────────────────────────────────────────────────────────────────
async function exportAs(fmt) {
  const novel = novels.find(n => n.id === activeNovelId);
  if (!novel) return;
  saveCurrentChapter();

  const titleStr = novel.title;
  let content = '';

  if (fmt === 'txt') {
    content = novel.chapters.map(ch =>
      `${ch.title}\n${'─'.repeat(20)}\n\n${ch.content}\n\n`
    ).join('');
    await doExport(content, `${titleStr}.txt`, [{ name: 'Text', extensions: ['txt'] }]);
  } else if (fmt === 'md') {
    content = `# ${titleStr}\n\n` + novel.chapters.map(ch =>
      `## ${ch.title}\n\n${ch.content}\n\n`
    ).join('');
    await doExport(content, `${titleStr}.md`, [{ name: 'Markdown', extensions: ['md'] }]);
  } else if (fmt === 'html') {
    const body = novel.chapters.map(ch => {
      const ps = ch.content.split(/\n+/).filter(Boolean)
        .map(p => `  <p>${esc(p)}</p>`).join('\n');
      return `<section>\n  <h2>${esc(ch.title)}</h2>\n${ps}\n</section>`;
    }).join('\n\n');
    content = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>${esc(titleStr)}</title>
<style>
  body { max-width: 680px; margin: 60px auto; font-family: 'Noto Serif SC', Georgia, serif;
         font-size: 18px; line-height: 2; color: #222; background: #faf9f6; padding: 0 20px; }
  h1 { text-align: center; font-size: 28px; margin-bottom: 48px; }
  h2 { font-size: 20px; margin: 48px 0 24px; }
  p  { text-indent: 2em; margin: 0 0 8px; }
</style>
</head>
<body>
<h1>${esc(titleStr)}</h1>
${body}
</body>
</html>`;
    await doExport(content, `${titleStr}.html`, [{ name: 'HTML', extensions: ['html'] }]);
  }
  closeAllPanels();
  showToast(t('toast-export-ok'));
}

async function doExport(content, filename, filters) {
  if (window.electronAPI) {
    await window.electronAPI.exportFile({ content, filename, filters });
  } else {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    a.download = filename;
    a.click();
  }
}

// ── Settings & appearance ─────────────────────────────────────────────────────
function applySettings() {
  const f = FONTS.find(f => f.key === settings.font) || FONTS[0];
  document.documentElement.style.setProperty('--font-family', f.family);
  document.documentElement.style.setProperty('--font-size',   settings.fontSize + 'px');
  document.documentElement.style.setProperty('--line-height', (settings.lineHeight / 100).toFixed(1));
  const alpha = settings.glassAlpha ?? 0.62;
  document.documentElement.style.setProperty('--glass-alpha', alpha);
  const slider1 = document.getElementById('fontSizeSlider');
  if (slider1) { slider1.value = settings.fontSize; document.getElementById('fontSizeVal').textContent = settings.fontSize + 'px'; }
  const slider2 = document.getElementById('lineHeightSlider');
  if (slider2) { slider2.value = settings.lineHeight; document.getElementById('lineHeightVal').textContent = (settings.lineHeight / 100).toFixed(1); }
  // Glass slider: value 0-85 → alpha 0.9-0.05 (right = more transparent)
  const sliderG = document.getElementById('glassAlphaSlider');
  const alphaToSlider = a => Math.round((0.9 - a) / 0.85 * 85);
  if (sliderG) { sliderG.value = alphaToSlider(alpha); document.getElementById('glassAlphaVal').textContent = alphaToSlider(alpha) + '%'; }
  applyTheme(settings.theme || 'morning');
  applyTextColor(settings.textColor || '');
  applyPanelWidth(settings.panelWidth ?? DEFAULT_PANEL_WIDTH);
  // Sync audio volume sliders
  const vol = settings.audioVolume ?? 40;
  const volEl = document.getElementById('audioVolumeSlider');
  if (volEl) { volEl.value = vol; document.getElementById('audioVolumeVal').textContent = vol + '%'; }
  const botVol = document.getElementById('bottomVolSlider');
  if (botVol) { botVol.value = vol; _syncVolIcon(vol); }
}

// ── Ambient audio ─────────────────────────────────────────────────────────────
function _ambientEl() { return document.getElementById('ambientAudio'); }

function startAmbientSound(filePath) {
  const el = _ambientEl();
  if (!filePath) { el.pause(); el.src = ''; return; }
  el.src = filePath.startsWith('file://') ? filePath : _fileURL(filePath);
  el.volume = (settings.audioVolume ?? 40) / 100;
  el.play().catch(() => {});
}

function stopAmbientSound() {
  const el = _ambientEl();
  el.pause(); el.src = '';
}

// ── Text color ────────────────────────────────────────────────────────────────
const TEXT_COLOR_PRESETS = [
  { label: '自动', value: '' },
  { label: '白色', value: '#ffffff' },
  { label: '暖白', value: '#fff5dc' },
  { label: '浅灰', value: '#c8c8c8' },
  { label: '深棕', value: '#1c140c' },
];

function applyTextColor(color) {
  const area = document.getElementById('writingArea');
  if (!area) return;
  if (color) area.style.color = color;
  else area.style.removeProperty('color');
}

function _syncVolIcon(v) {
  const el = document.getElementById('volIcon');
  if (!el) return;
  el.textContent = v === 0 ? '🔇' : v < 40 ? '🔉' : '🔊';
}

function applyPanelWidth(w) {
  document.documentElement.style.setProperty('--panel-width', w + 'px');
  const val = document.getElementById('panelWidthVal');
  if (val) val.textContent = Math.round(w) + 'px';
}

function renderTextColorRow() {
  const row = document.getElementById('textColorRow');
  if (!row) return;
  row.innerHTML = '';

  TEXT_COLOR_PRESETS.forEach(c => {
    const sw = document.createElement('button');
    sw.className = 'text-color-swatch' + (settings.textColor === c.value ? ' active' : '');
    sw.title = c.label;
    if (c.value) {
      sw.style.background = c.value;
      sw.style.border = c.value === '#ffffff' || c.value === '#fff5dc' || c.value === '#c8c8c8'
        ? '2px solid rgba(128,128,128,0.3)' : '2px solid transparent';
    } else {
      sw.style.background = 'linear-gradient(135deg, #1c140c 50%, #ffffff 50%)';
    }
    if (settings.textColor === c.value) sw.style.borderColor = 'var(--accent)';
    sw.addEventListener('click', () => {
      settings.textColor = c.value;
      store.set('settings', settings);
      applyTextColor(c.value);
      renderTextColorRow();
    });
    row.appendChild(sw);
  });

  // Custom color picker button
  const customBtn = document.createElement('button');
  customBtn.className = 'text-color-custom';
  customBtn.title = '自定义颜色';
  customBtn.textContent = '自定义';
  const colorInp = document.createElement('input');
  colorInp.type = 'color';
  colorInp.value = (settings.textColor && /^#[0-9a-f]{6}$/i.test(settings.textColor))
    ? settings.textColor : '#ffffff';
  colorInp.style.cssText = 'position:absolute;opacity:0;width:0;height:0;pointer-events:none';
  colorInp.addEventListener('input', e => {
    settings.textColor = e.target.value;
    store.set('settings', settings);
    applyTextColor(e.target.value);
    renderTextColorRow();
  });
  customBtn.style.position = 'relative';
  customBtn.appendChild(colorInp);
  customBtn.addEventListener('click', () => colorInp.click());
  row.appendChild(customBtn);
}

function pickAmbientAudio() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'audio/mpeg,audio/ogg,audio/wav,audio/flac,audio/*';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    const filePath = file.path || '';
    if (filePath) {
      await store.set('ambientAudioPath', filePath);
      settings.ambientSound = filePath;
      _updateAudioLabel(file.name);
      startAmbientSound(filePath);
      store.set('settings', settings);
      showToast(t('toast-audio-loaded'));
    }
  };
  inp.click();
}

function _updateAudioLabel(name) {
  const el = document.getElementById('audioFileLabel');
  if (el) el.textContent = name ? '▶ ' + name : t('audio-no-file');
}

// ── Particle overlay canvas ───────────────────────────────────────────────────
let _ovCanvas = null, _ovCtx = null, _ovRaf = null;

function _initOverlay() {
  if (_ovCanvas) return;
  _ovCanvas = document.createElement('canvas');
  _ovCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;display:none';
  document.body.insertBefore(_ovCanvas, document.getElementById('sidebar'));
  _ovCtx = _ovCanvas.getContext('2d');
  const resize = () => { _ovCanvas.width = window.innerWidth; _ovCanvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);
}

function _stopOverlay() {
  cancelAnimationFrame(_ovRaf); _ovRaf = null;
  if (_ovCtx) _ovCtx.clearRect(0, 0, _ovCanvas.width, _ovCanvas.height);
  if (_ovCanvas) _ovCanvas.style.display = 'none';
}

function _startSnowOverlay() {
  _initOverlay();
  const flakes = Array.from({length: 140}, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.8 + Math.random() * 2.2,
    vy: 0.0009 + Math.random() * 0.0018,
    vx: (Math.random() - 0.5) * 0.0003,
    op: 0.35 + Math.random() * 0.55,
  }));
  _ovCanvas.style.display = 'block';
  let t = 0;
  const loop = () => {
    _ovRaf = requestAnimationFrame(loop);
    const w = _ovCanvas.width, h = _ovCanvas.height;
    _ovCtx.clearRect(0, 0, w, h);
    t++;
    // Warm fire glow at bottom-left corner
    const flicker = 0.07 + 0.025 * Math.sin(t * 0.13) + 0.012 * Math.sin(t * 0.39);
    const fg = _ovCtx.createRadialGradient(w * 0.18, h * 0.82, 0, w * 0.18, h * 0.82, w * 0.45);
    fg.addColorStop(0,   `rgba(255,150,30,${flicker})`);
    fg.addColorStop(0.4, `rgba(200,80,10,${flicker * 0.45})`);
    fg.addColorStop(1,   'rgba(0,0,0,0)');
    _ovCtx.fillStyle = fg;
    _ovCtx.fillRect(0, 0, w, h);
    // Snowflakes
    flakes.forEach(f => {
      f.y += f.vy;
      f.x += f.vx + Math.sin(t * 0.016 + f.y * 9) * 0.00013;
      if (f.y > 1.02) { f.y = -0.02; f.x = Math.random(); }
      if (f.x < 0) f.x = 1; if (f.x > 1) f.x = 0;
      _ovCtx.globalAlpha = f.op;
      _ovCtx.fillStyle = 'rgba(220,235,255,1)';
      _ovCtx.beginPath();
      _ovCtx.arc(f.x * w, f.y * h, f.r, 0, Math.PI * 2);
      _ovCtx.fill();
    });
    _ovCtx.globalAlpha = 1;
  };
  loop();
}

function _startRainOverlay() {
  _initOverlay();
  const drops = Array.from({length: 200}, () => ({
    x: Math.random(), y: Math.random(),
    len: 0.02 + Math.random() * 0.035,
    vy: 0.016 + Math.random() * 0.012,
    op: 0.1 + Math.random() * 0.3,
  }));
  _ovCanvas.style.display = 'block';
  const loop = () => {
    _ovRaf = requestAnimationFrame(loop);
    const w = _ovCanvas.width, h = _ovCanvas.height;
    _ovCtx.clearRect(0, 0, w, h);
    drops.forEach(d => {
      d.y += d.vy; d.x += d.vy * 0.1;
      if (d.y > 1 + d.len) { d.y = -d.len; d.x = Math.random(); }
      if (d.x > 1) d.x = 0;
      _ovCtx.globalAlpha = d.op;
      _ovCtx.strokeStyle = 'rgba(160,200,230,1)';
      _ovCtx.lineWidth = 0.8;
      _ovCtx.beginPath();
      _ovCtx.moveTo(d.x * w, d.y * h);
      _ovCtx.lineTo((d.x + d.vy * 0.1) * w, (d.y + d.len) * h);
      _ovCtx.stroke();
    });
    _ovCtx.globalAlpha = 1;
  };
  loop();
}

function applyParticleOverlay(type) {
  _stopOverlay();
  if (type === 'snow') _startSnowOverlay();
  else if (type === 'rain') _startRainOverlay();
}

// ── Canvas background system ──────────────────────────────────────────────────
let _bgCanvas = null, _bgCtx = null, _bgRaf = null;

function _initCanvas() {
  if (_bgCanvas) return;
  _bgCanvas = document.createElement('canvas');
  _bgCanvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;display:none';
  document.body.prepend(_bgCanvas);
  _bgCtx = _bgCanvas.getContext('2d');
  const resize = () => { _bgCanvas.width = window.innerWidth; _bgCanvas.height = window.innerHeight; };
  resize();
  window.addEventListener('resize', resize);
}

function _stopCanvas() {
  cancelAnimationFrame(_bgRaf);
  _bgRaf = null;
  if (_bgCtx) _bgCtx.clearRect(0, 0, _bgCanvas.width, _bgCanvas.height);
  if (_bgCanvas) _bgCanvas.style.display = 'none';
}

function _canvasFrame(drawFn) {
  _bgCanvas.style.display = 'block';
  let t = 0;
  function loop() {
    _bgRaf = requestAnimationFrame(loop);
    drawFn(_bgCtx, _bgCanvas.width, _bgCanvas.height, ++t);
  }
  loop();
}

function _startCabin() {
  const flakes = Array.from({length: 110}, () => ({
    x: Math.random(), y: Math.random(),
    r: 0.7 + Math.random() * 2,
    vy: 0.0007 + Math.random() * 0.0013,
    vx: (Math.random() - 0.5) * 0.00025,
  }));
  const trees = [
    {x:0.04,h:0.55,w:0.09},{x:0.18,h:0.45,w:0.08},{x:0.30,h:0.60,w:0.10},
    {x:0.50,h:0.48,w:0.08},{x:0.65,h:0.58,w:0.09},{x:0.80,h:0.42,w:0.07},{x:0.92,h:0.52,w:0.08},
  ];

  _canvasFrame((ctx, W, H, t) => {
    // ── Dark interior walls ──
    ctx.fillStyle = '#140a03';
    ctx.fillRect(0, 0, W, H);

    // Warm wall wash from fireplace side
    const wallWash = ctx.createLinearGradient(0, 0, W * 0.55, 0);
    wallWash.addColorStop(0, 'rgba(60,25,5,0.9)');
    wallWash.addColorStop(1, 'rgba(10,5,2,0.0)');
    ctx.fillStyle = wallWash; ctx.fillRect(0, 0, W, H);

    // ── Wood floor ──
    const floorY = H * 0.70;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
    floorGrad.addColorStop(0, '#3d1f0a');
    floorGrad.addColorStop(1, '#1a0a03');
    ctx.fillStyle = floorGrad; ctx.fillRect(0, floorY, W, H - floorY);
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
      const py = floorY + (H - floorY) * (i / 7);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W, py); ctx.stroke();
    }

    // ── Window (right side, large arched) ──
    const wx = W * 0.50, wy = H * 0.04, ww = W * 0.46, wh = H * 0.60;
    ctx.save();
    ctx.beginPath();
    ctx.rect(wx + 4, wy + 4, ww - 8, wh - 8);
    ctx.clip();

    // Night sky gradient
    const sky = ctx.createLinearGradient(0, wy, 0, wy + wh);
    sky.addColorStop(0, '#060a14'); sky.addColorStop(0.7, '#0a1020'); sky.addColorStop(1, '#12182e');
    ctx.fillStyle = sky; ctx.fillRect(wx, wy, ww, wh);

    // Distant mountain silhouette
    ctx.fillStyle = '#0d1520';
    ctx.beginPath();
    ctx.moveTo(wx, wy + wh * 0.75);
    ctx.lineTo(wx + ww * 0.15, wy + wh * 0.45);
    ctx.lineTo(wx + ww * 0.30, wy + wh * 0.60);
    ctx.lineTo(wx + ww * 0.50, wy + wh * 0.38);
    ctx.lineTo(wx + ww * 0.70, wy + wh * 0.55);
    ctx.lineTo(wx + ww * 0.88, wy + wh * 0.42);
    ctx.lineTo(wx + ww, wy + wh * 0.58);
    ctx.lineTo(wx + ww, wy + wh * 0.75);
    ctx.closePath(); ctx.fill();

    // Snow ground outside
    const snowGrad = ctx.createLinearGradient(0, wy + wh * 0.72, 0, wy + wh);
    snowGrad.addColorStop(0, '#c8d8f0'); snowGrad.addColorStop(1, '#e8eef8');
    ctx.fillStyle = snowGrad;
    ctx.fillRect(wx, wy + wh * 0.72, ww, wh * 0.28);

    // Pine trees
    trees.forEach(tr => {
      const tx = wx + tr.x * ww, ty = wy + wh * 0.73;
      const th = tr.h * wh, tw = tr.w * ww;
      for (let l = 0; l < 5; l++) {
        const ly = ty - th * (l / 5);
        const lw = tw * (1 - l * 0.15);
        ctx.fillStyle = l === 0 ? '#0a1a0a' : '#0d2010';
        ctx.beginPath();
        ctx.moveTo(tx, ly - th / 5);
        ctx.lineTo(tx - lw, ly);
        ctx.lineTo(tx + lw, ly);
        ctx.closePath(); ctx.fill();
        // Snow on branch
        if (l > 1) {
          ctx.fillStyle = 'rgba(210,225,255,0.55)';
          ctx.beginPath();
          ctx.moveTo(tx - lw * 0.6, ly - 2);
          ctx.lineTo(tx + lw * 0.6, ly - 2);
          ctx.lineTo(tx, ly - th / 5 + 2);
          ctx.closePath(); ctx.fill();
        }
      }
      // Trunk
      ctx.fillStyle = '#1a0d05';
      ctx.fillRect(tx - 2, ty - th * 0.08, 4, th * 0.08);
    });

    // Snowflakes
    ctx.fillStyle = 'rgba(225,238,255,0.92)';
    flakes.forEach(f => {
      f.y += f.vy; f.x += f.vx + Math.sin(t * 0.017 + f.y * 9) * 0.00014;
      if (f.y > 1) { f.y = -0.02; f.x = Math.random(); }
      if (f.x < 0) f.x = 1; if (f.x > 1) f.x = 0;
      ctx.globalAlpha = 0.5 + Math.random() * 0.5;
      ctx.beginPath();
      ctx.arc(wx + f.x * ww, wy + f.y * wh, f.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    // Window frame
    ctx.strokeStyle = '#7a4520'; ctx.lineWidth = 7;
    ctx.strokeRect(wx, wy, ww, wh);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wx + ww / 2, wy); ctx.lineTo(wx + ww / 2, wy + wh);
    ctx.moveTo(wx, wy + wh / 2); ctx.lineTo(wx + ww, wy + wh / 2);
    ctx.stroke();
    // Sill
    ctx.fillStyle = '#8a4c1a';
    ctx.fillRect(wx - 6, wy + wh - 2, ww + 12, 10);

    // ── Fireplace (left side) ──
    const fpx = W * 0.03, fpy = H * 0.22, fpw = W * 0.34, fph = H * 0.48;
    // Stone surround
    const stoneGrad = ctx.createLinearGradient(fpx, fpy, fpx + fpw, fpy);
    stoneGrad.addColorStop(0, '#2e1e0e'); stoneGrad.addColorStop(1, '#3d2810');
    ctx.fillStyle = stoneGrad; ctx.fillRect(fpx, fpy, fpw, fph);
    // Stone rows
    const rows = [[0,0.16],[0.16,0.16],[0.32,0.16],[0.48,0.16],[0.64,0.16]];
    rows.forEach(([ry, rh], ri) => {
      const cols = ri % 2 === 0 ? [0,0.5] : [0.25,0.75];
      cols.forEach(cx => {
        const cw = 0.5;
        ctx.fillStyle = `rgba(${50+Math.sin(ri*cx*3)*10},${30+ri*3},${10+ri*2},0.35)`;
        ctx.fillRect(fpx + cx*fpw + 1, fpy + ry*fph + 1, cw*fpw - 2, rh*fph - 2);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8;
        ctx.strokeRect(fpx + cx*fpw + 1, fpy + ry*fph + 1, cw*fpw - 2, rh*fph - 2);
      });
    });
    // Opening arch
    const ox = fpx + fpw*0.08, oy = fpy + fph*0.28, ow = fpw*0.84, oh = fph*0.68;
    ctx.fillStyle = '#080300';
    ctx.beginPath();
    ctx.arc(ox + ow/2, oy + ow*0.28, ow/2, Math.PI, 0);
    ctx.rect(ox, oy + ow*0.28, ow, oh - ow*0.28);
    ctx.fill();

    // Animated flames
    const flicker = 0.9 + 0.1 * Math.sin(t * 0.12) + 0.05 * Math.sin(t * 0.37);
    for (let fi = 0; fi < 7; fi++) {
      const fx = ox + ow * (0.08 + fi * 0.13);
      const fBase = oy + oh - 2;
      const fh = oh * (0.25 + 0.42 * Math.abs(Math.sin(t * 0.07 + fi * 1.3))) * flicker;
      const fw = ow * 0.1;
      const flameg = ctx.createRadialGradient(fx, fBase - fh * 0.25, 0, fx, fBase, fw * 1.4);
      flameg.addColorStop(0,   'rgba(255,245,180,0.98)');
      flameg.addColorStop(0.25,'rgba(255,180,40,0.9)');
      flameg.addColorStop(0.6, 'rgba(220,60,5,0.6)');
      flameg.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.fillStyle = flameg;
      ctx.beginPath();
      ctx.moveTo(fx, fBase);
      ctx.bezierCurveTo(
        fx - fw, fBase - fh*0.4,
        fx + fw*0.6*Math.sin(t*0.08+fi), fBase - fh*0.75,
        fx, fBase - fh
      );
      ctx.bezierCurveTo(
        fx - fw*0.6*Math.sin(t*0.06+fi), fBase - fh*0.75,
        fx + fw, fBase - fh*0.4,
        fx, fBase
      );
      ctx.fill();
    }
    // Glowing embers
    ctx.fillStyle = 'rgba(255,120,20,0.7)';
    for (let e = 0; e < 5; e++) {
      const ex = ox + ow * (0.1 + e * 0.18);
      const ey = oy + oh - 6 - Math.abs(Math.sin(t * 0.05 + e)) * 8;
      ctx.beginPath(); ctx.arc(ex, ey, 2 + Math.sin(t*0.09+e)*1.5, 0, Math.PI*2); ctx.fill();
    }
    // Logs
    ctx.fillStyle = '#200e04';
    ctx.fillRect(ox + ow*0.05, oy + oh*0.84, ow*0.9, oh*0.1);
    ctx.fillStyle = '#3a1a08';
    ctx.fillRect(ox + ow*0.12, oy + oh*0.76, ow*0.76, oh*0.1);

    // Mantle
    ctx.fillStyle = '#7a3c12';
    ctx.fillRect(fpx - 6, fpy - 12, fpw + 12, 14);
    // Candles on mantle
    [0.12, 0.82].forEach((cx, ci) => {
      const cpx = fpx + cx * fpw;
      ctx.fillStyle = '#f0e0b0';
      ctx.fillRect(cpx - 4, fpy - 32, 8, 22);
      const cf = 0.5 + 0.2 * Math.sin(t * 0.11 + ci * 2.4);
      const candleG = ctx.createRadialGradient(cpx, fpy - 36, 0, cpx, fpy - 34, 10);
      candleG.addColorStop(0, `rgba(255,240,150,${cf})`);
      candleG.addColorStop(1, 'rgba(255,120,20,0)');
      ctx.fillStyle = candleG;
      ctx.beginPath(); ctx.ellipse(cpx, fpy - 36, 6, 9, 0, 0, Math.PI*2); ctx.fill();
    });

    // ── Warm glow from fire spreading across room ──
    const gflicker = 0.16 + 0.055 * Math.sin(t*0.10) + 0.025 * Math.sin(t*0.41);
    const glow = ctx.createRadialGradient(fpx+fpw*0.5, fpy+fph*0.55, 0, fpx+fpw*0.5, H*0.5, W*0.75);
    glow.addColorStop(0,   `rgba(255,130,25,${gflicker})`);
    glow.addColorStop(0.25,`rgba(200,75,8,${gflicker*0.55})`);
    glow.addColorStop(0.55,`rgba(140,45,3,${gflicker*0.2})`);
    glow.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

    // ── Rug on floor ──
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = '#5c1a08';
    ctx.beginPath();
    ctx.ellipse(W*0.35, floorY + (H-floorY)*0.35, W*0.26, (H-floorY)*0.28, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = '#8a3010'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(W*0.35, floorY + (H-floorY)*0.35, W*0.20, (H-floorY)*0.22, 0, 0, Math.PI*2);
    ctx.stroke();
    ctx.restore();

    // ── Vignette ──
    const vig = ctx.createRadialGradient(W/2, H/2, H*0.08, W/2, H/2, W*0.92);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.78)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
  });
}

function _startRain() {
  const drops = Array.from({length: 220}, () => ({
    x: Math.random(), y: Math.random(),
    len: 0.025 + Math.random() * 0.04,
    vy: 0.014 + Math.random() * 0.01,
    op: 0.15 + Math.random() * 0.35,
  }));
  let lightning = 0;
  _canvasFrame((ctx, w, h, t) => {
    ctx.fillStyle = '#030c04'; ctx.fillRect(0, 0, w, h);
    // Forest green ambient
    const fg = ctx.createRadialGradient(w*0.5, h*0.3, 0, w*0.5, h*0.5, w*0.75);
    fg.addColorStop(0, 'rgba(15,65,12,0.5)');
    fg.addColorStop(0.7, 'rgba(3,20,3,0.2)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fg; ctx.fillRect(0, 0, w, h);
    // Warm cabin glow center
    const flicker = 0.08 + 0.025 * Math.sin(t*0.11);
    const cg = ctx.createRadialGradient(w*0.5, h*0.5, 0, w*0.5, h*0.5, w*0.22);
    cg.addColorStop(0, `rgba(255,200,80,${flicker})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg; ctx.fillRect(0, 0, w, h);
    // Lightning
    if (Math.random() < 0.0018) lightning = 8;
    if (lightning > 0) {
      ctx.fillStyle = `rgba(200,220,255,${lightning * 0.025})`; ctx.fillRect(0, 0, w, h); lightning--;
    }
    // Rain streaks
    drops.forEach(d => {
      d.y += d.vy; d.x += d.vy * 0.12;
      if (d.y > 1 + d.len) { d.y = -d.len; d.x = Math.random(); }
      if (d.x > 1) d.x = 0;
      ctx.globalAlpha = d.op;
      ctx.strokeStyle = 'rgba(140,195,220,1)'; ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(d.x*w, d.y*h);
      ctx.lineTo((d.x + d.vy*0.12)*w, (d.y + d.len)*h);
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // Vignette
    const vig = ctx.createRadialGradient(w/2, h/2, h*0.1, w/2, h/2, w*0.8);
    vig.addColorStop(0, 'rgba(0,0,0,0)'); vig.addColorStop(1, 'rgba(0,0,0,0.72)');
    ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);
  });
}

function _startStars() {
  const stars = Array.from({length: 180}, () => ({
    x: Math.random(), y: Math.random() * 0.75,
    r: 0.4 + Math.random() * 1.6,
    phase: Math.random() * Math.PI * 2,
    speed: 0.015 + Math.random() * 0.04,
  }));
  let shotX = -1, shotY = -1, shotT = 0;
  _canvasFrame((ctx, w, h, t) => {
    // Night sky
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#03030f'); sky.addColorStop(0.6, '#070515'); sky.addColorStop(1, '#0f0820');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
    // Stars
    stars.forEach(s => {
      s.phase += s.speed;
      const a = 0.35 + 0.65 * Math.abs(Math.sin(s.phase));
      ctx.fillStyle = `rgba(215,225,255,${a})`;
      ctx.beginPath(); ctx.arc(s.x*w, s.y*h, s.r, 0, Math.PI*2); ctx.fill();
    });
    // Shooting star
    if (Math.random() < 0.004 && shotT <= 0) {
      shotX = 0.1 + Math.random() * 0.5; shotY = Math.random() * 0.35; shotT = 35;
    }
    if (shotT > 0) {
      const p = (35 - shotT) / 35;
      ctx.save();
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.85;
      ctx.strokeStyle = 'rgba(255,255,200,1)'; ctx.lineWidth = 1.5;
      const trail = ctx.createLinearGradient(
        (shotX + p*0.18)*w, (shotY + p*0.12)*h,
        (shotX + p*0.18 - 0.07)*w, (shotY + p*0.12 - 0.045)*h);
      trail.addColorStop(0, 'rgba(255,255,200,1)');
      trail.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.strokeStyle = trail;
      ctx.beginPath();
      ctx.moveTo((shotX + p*0.18)*w, (shotY + p*0.12)*h);
      ctx.lineTo((shotX + p*0.18 - 0.07)*w, (shotY + p*0.12 - 0.045)*h);
      ctx.stroke(); ctx.restore(); shotT--;
    }
    // Moon
    const mx = w*0.78, my = h*0.14;
    const mg = ctx.createRadialGradient(mx, my, 0, mx, my, 90);
    mg.addColorStop(0, 'rgba(255,252,220,0.25)'); mg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(mx, my, 90, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(255,252,215,0.92)'; ctx.beginPath(); ctx.arc(mx, my, 26, 0, Math.PI*2); ctx.fill();
    // Horizon mist
    const mist = ctx.createLinearGradient(0, h*0.7, 0, h);
    mist.addColorStop(0, 'rgba(5,3,15,0)'); mist.addColorStop(1, 'rgba(3,2,10,0.95)');
    ctx.fillStyle = mist; ctx.fillRect(0, h*0.7, w, h*0.3);
  });
}

const _ALL_THEME_KEYS = ['morning','mint','sakura','provence','jungle','ocean','cyber','cabin','rain','stars','custom'];
function applyTheme(key) {
  _initCanvas();
  _ALL_THEME_KEYS.forEach(k => document.body.classList.remove('theme-' + k));
  document.body.classList.add('theme-' + key);
  settings.theme = key;
  const thm = THEMES.find(x => x.key === key);
  const bgLayer = document.getElementById('bgLayer');
  if (thm && thm.canvas) {
    bgLayer.style.opacity = '0';
    if (key === 'cabin') _startCabin();
    else if (key === 'rain') _startRain();
    else if (key === 'stars') _startStars();
  } else {
    _stopCanvas();
    bgLayer.style.opacity = '';
  }
}

async function applyCustomBg() {
  const data = await store.get('customBg');
  if (data) document.getElementById('bgLayer').style.backgroundImage = `url(${data})`;
}

function pickCustomBg() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*,video/mp4,video/webm,video/ogg';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    if (file.type.startsWith('video/')) {
      const url = URL.createObjectURL(file);
      const vid = document.getElementById('bgVideo');
      vid.src = url;
      vid.style.display = 'block';
      document.getElementById('bgLayer').style.backgroundImage = '';
      document.getElementById('bgLayer').style.opacity = '0';
      _stopCanvas();
      THEMES.forEach(t => document.body.classList.remove('theme-' + t.key));
      document.body.classList.add('theme-custom');
      settings.theme = 'custom';
      store.set('settings', settings);
      renderThemeGrid();
      showToast(t('toast-video-bg'));
    } else {
      const reader = new FileReader();
      reader.onload = async e => {
        const data = e.target.result;
        document.getElementById('bgVideo').style.display = 'none';
        await store.set('customBg', data);
        document.getElementById('bgLayer').style.backgroundImage = `url(${data})`;
        document.getElementById('bgLayer').style.opacity = '';
        applyTheme('custom');
        store.set('settings', settings);
        renderThemeGrid();
        showToast(t('toast-bg-set'));
      };
      reader.readAsDataURL(file);
    }
  };
  inp.click();
}

function pickMoyuImage() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = () => {
    const file = inp.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const data = e.target.result;
      await store.set('moyuImage', data);
      _applyMoyuImage(data);
      showToast(t('toast-moyu-updated'));
    };
    reader.readAsDataURL(file);
  };
  inp.click();
}

function _applyMoyuImage(dataUrl) {
  const img  = document.getElementById('moyuCustomImg');
  const cat  = document.getElementById('moyuCatEmoji');
  const bubs = document.querySelector('.moyu-bubbles');
  if (dataUrl) {
    img.src = dataUrl;
    img.style.display = 'block';
    if (cat)  cat.style.display  = 'none';
    if (bubs) bubs.style.display = 'none';
  } else {
    img.src = '';
    img.style.display = 'none';
    if (cat)  cat.style.display  = '';
    if (bubs) bubs.style.display = '';
  }
}

function renderFontOptions() {
  _renderFontGrid(document.getElementById('fontOptions'), settings.font, key => {
    settings.font = key;
    // Also update current novel's font
    const novel = novels.find(n => n.id === activeNovelId);
    if (novel) { novel.font = key; store.set('novels', novels); }
    applySettings();
    renderFontOptions();
    store.set('settings', settings);
  });
}

function renderNewNovelFontPicker() {
  _renderFontGrid(document.getElementById('newNovelFontPicker'), _newNovelFont, key => {
    _newNovelFont = key;
    renderNewNovelFontPicker();
  });
}

function _renderFontGrid(container, activeKey, onSelect) {
  if (!container) return;
  container.innerHTML = '';
  FONTS.forEach(f => {
    const opt = el('div', 'font-opt' + (f.key === activeKey ? ' active' : ''));
    opt.innerHTML = `<div class="font-opt-name" style="font-family:${f.family}">${f.name}</div>
      <div class="font-opt-preview" style="font-family:${f.family}">${f.preview}</div>`;
    opt.addEventListener('click', () => onSelect(f.key));
    container.appendChild(opt);
  });
}

// ── Scene (video / image backgrounds) ────────────────────────────────────────
let _sceneList = [];
let _soundList = [];

async function loadSceneList() {
  if (window.electronAPI) _sceneList = await window.electronAPI.listScenes();
}

async function loadSoundList() {
  if (window.electronAPI) _soundList = await window.electronAPI.listSounds();
}

// Auto-match a scene to its most fitting ambient sound
const _SCENE_SOUND_MAP = [
  { scene: ['大海', 'sea', 'ocean', 'beach'],                              sound: ['sea', 'ocean', 'wave'] },
  { scene: ['小溪', 'river', 'stream', '森林', 'forest', 'jungle'],        sound: ['river', 'stream'] },
  { scene: ['大雪', 'snow', 'winter', '冬'],                               sound: ['fire', 'crackle', 'fireplace'] },
  { scene: ['屋内', '室内', 'indoor', 'cabin', 'room', 'home', 'house'],   sound: ['fire', 'crackle', 'fireplace'] },
  { scene: ['下雨', '雨天', 'rain', 'rainy', 'storm'],                     sound: ['rain'] },
  { scene: ['瀑布', 'waterfall', 'falls'],                                 sound: ['river', 'stream', 'water'] },
];

function _autoSoundForScene(scenePath) {
  const name = scenePath.split('/').pop().toLowerCase();
  for (const rule of _SCENE_SOUND_MAP) {
    if (rule.scene.some(k => name.includes(k))) {
      const match = _soundList.find(s =>
        rule.sound.some(k => s.name.toLowerCase().includes(k))
      );
      if (match) return match;
    }
  }
  return null;
}

async function renderSceneGrid() {
  const grid = document.getElementById('sceneGrid');
  if (!grid) return;
  await loadSceneList();

  const current = settings.activeScene || '';
  grid.innerHTML = '';

  _sceneList.forEach(s => {
    const card = document.createElement('div');
    card.className = 'scene-card' + (current === s.path ? ' active' : '');

    if (s.type === 'image') {
      const img = document.createElement('img');
      img.src = _fileURL(s.path);
      card.appendChild(img);
    } else {
      card.style.background = 'linear-gradient(135deg,#12100a,#0d0d0d)';
    }

    const badge = document.createElement('span');
    badge.className = 'scene-card-badge';
    badge.textContent = s.type === 'video' ? '▶' : '🖼';
    card.appendChild(badge);

    const label = document.createElement('span');
    label.className = 'scene-card-label';
    const rawName = s.name.replace(/\.[^.]+$/, '');
    label.textContent = (settings.lang === 'en' && SCENE_NAME_EN[rawName]) ? SCENE_NAME_EN[rawName] : rawName;
    card.appendChild(label);

    // Delete button (shows on hover)
    const del = document.createElement('span');
    del.className = 'scene-card-del';
    del.textContent = '×';
    del.title = '删除';
    del.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm(t('confirm-del-scene', s.name))) return;
      if (window.electronAPI) await window.electronAPI.deleteScene(s.path);
      if (settings.activeScene === s.path) { settings.activeScene = ''; clearScene(); }
      await loadSceneList();
      renderSceneGrid();
    });
    card.appendChild(del);

    card.addEventListener('click', () => applyScene(s));
    grid.appendChild(card);
  });

  // Clear active scene card
  const clear = document.createElement('div');
  clear.className = 'scene-card scene-card-clear' + (!current ? ' active' : '');
  clear.innerHTML = `<span style="font-size:18px;opacity:.35">✕</span><span style="font-size:10px;color:var(--text-muted)">${t('clear-scene')}</span>`;
  clear.addEventListener('click', () => {
    settings.activeScene = ''; store.set('settings', settings);
    clearScene(); renderSceneGrid();
  });
  grid.appendChild(clear);

  // Import "+" card
  const add = document.createElement('div');
  add.className = 'scene-card scene-card-add';
  add.innerHTML = `<span style="font-size:22px;opacity:.6">＋</span><span style="font-size:10px;color:var(--text-muted)">${t('import-scene')}</span>`;
  add.addEventListener('click', pickAndAddScene);
  grid.appendChild(add);
}

async function pickAndAddScene() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'video/mp4,video/webm,video/quicktime,image/jpeg,image/png,image/gif,image/webp';
  inp.multiple = true;
  inp.onchange = async () => {
    const files = Array.from(inp.files);
    if (!files.length) return;
    showToast(t('toast-importing'));
    let count = 0;
    for (const file of files) {
      if (!file.path) continue;
      const r = window.electronAPI ? await window.electronAPI.copyScene(file.path) : { ok: false };
      if (r.ok) count++;
    }
    if (count > 0) { showToast(t('toast-imported', count)); }
    await loadSceneList();
    renderSceneGrid();
  };
  inp.click();
}

function _fileURL(absPath) {
  return 'file://' + absPath.split('/').map(seg => encodeURIComponent(seg)).join('/');
}

function applyScene(s, silent = false) {
  settings.activeScene = s.path;
  store.set('settings', settings);

  const vid = document.getElementById('bgVideo');
  const bg  = document.getElementById('bgLayer');

  if (s.type === 'video') {
    bg.style.opacity = '0';
    vid.src = _fileURL(s.path);
    vid.style.display = 'block';
    vid.load();
    vid.play().catch(e => console.warn('video play failed', e));
  } else {
    vid.pause(); vid.src = ''; vid.style.display = 'none';
    bg.style.backgroundImage = `url("${_fileURL(s.path)}")`;
    bg.style.opacity = '';
  }

  // Auto-play matching ambient sound when user manually picks a scene
  if (!silent) {
    const matched = _autoSoundForScene(s.path);
    if (matched) {
      settings.ambientSound = matched.path;
      store.set('settings', settings);
      store.set('ambientAudioPath', matched.path);
      startAmbientSound(matched.path);
      renderSoundList();
      showToast(t('toast-auto-sound', _soundLabel(matched.name)));
    }
  }

  renderSceneGrid();
}

function clearScene() {
  const vid = document.getElementById('bgVideo');
  vid.pause(); vid.src = ''; vid.style.display = 'none';
  const bg = document.getElementById('bgLayer');
  bg.style.backgroundImage = '';
  bg.style.opacity = '';
}

// ── Sound helpers ─────────────────────────────────────────────────────────────
const SOUND_ICONS = {
  'fire': '🔥', 'campfire': '🔥', 'crackling': '🔥',
  'rain': '🌧', 'raining': '🌧', 'storm': '⛈',
  'sea': '🌊', 'wave': '🌊', 'ocean': '🌊', 'beach': '🌊',
  'forest': '🌲', 'bird': '🐦', 'wind': '💨', 'cafe': '☕',
};
function _soundIcon(filename) {
  const lower = filename.toLowerCase();
  for (const [key, icon] of Object.entries(SOUND_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return '🎵';
}
function _soundLabel(filename) {
  return filename.replace(/\.(mp3|ogg|wav|flac|m4a)$/i, '').replace(/[-_]/g, ' ');
}

async function renderSoundList() {
  const list = document.getElementById('soundList');
  if (!list) return;
  _soundList = window.electronAPI ? await window.electronAPI.listSounds() : [];
  const sounds = _soundList;
  const currentPath = settings.ambientSound || '';

  list.innerHTML = '';
  // Mute option
  const muteItem = document.createElement('div');
  muteItem.className = 'sound-item' + (!currentPath ? ' active' : '');
  muteItem.innerHTML = `<span class="sound-item-icon">🔇</span><span class="sound-item-name">${t('mute')}</span>`;
  muteItem.addEventListener('click', () => {
    settings.ambientSound = '';
    stopAmbientSound();
    store.set('settings', settings);
    store.delete('ambientAudioPath');
    renderSoundList();
  });
  list.appendChild(muteItem);

  if (sounds.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'font-size:12px;color:var(--text-muted);padding:6px 0';
    empty.textContent = t('sound-empty');
    list.appendChild(empty);
    return;
  }

  sounds.forEach(s => {
    const item = document.createElement('div');
    const active = currentPath === s.path;
    item.className = 'sound-item' + (active ? ' active' : '');

    const icon = document.createElement('span');
    icon.className = 'sound-item-icon';
    icon.textContent = _soundIcon(s.name);
    item.appendChild(icon);

    const name = document.createElement('span');
    name.className = 'sound-item-name';
    name.textContent = _soundLabel(s.name);
    item.appendChild(name);

    if (active) {
      const playing = document.createElement('span');
      playing.className = 'sound-item-stop';
      playing.textContent = t('playing');
      item.appendChild(playing);
    }

    // Delete button
    const del = document.createElement('span');
    del.className = 'sound-item-del';
    del.textContent = '×';
    del.title = '删除';
    del.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm(t('confirm-del-sound', s.name))) return;
      if (window.electronAPI) await window.electronAPI.deleteSound(s.path);
      if (settings.ambientSound === s.path) { stopAmbientSound(); settings.ambientSound = ''; }
      renderSoundList();
    });
    item.appendChild(del);

    item.addEventListener('click', async () => {
      settings.ambientSound = s.path;
      await store.set('ambientAudioPath', s.path);
      store.set('settings', settings);
      startAmbientSound(s.path);
      renderSoundList();
    });
    list.appendChild(item);
  });

  // "+" add button
  const addItem = document.createElement('div');
  addItem.className = 'sound-item sound-add-btn';
  addItem.innerHTML = `<span class="sound-item-icon">＋</span><span class="sound-item-name">${t('add-sound')}</span>`;
  addItem.addEventListener('click', pickAndAddSound);
  list.appendChild(addItem);
}

async function pickAndAddSound() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'audio/mpeg,audio/ogg,audio/wav,audio/flac,audio/x-m4a,audio/*';
  inp.onchange = async () => {
    const file = inp.files[0];
    if (!file) return;
    const srcPath = file.path;
    if (!srcPath) { showToast(t('toast-no-path')); return; }
    showToast(t('toast-adding'));
    const result = window.electronAPI
      ? await window.electronAPI.copySound(srcPath)
      : { ok: false };
    if (result.ok) {
      showToast(t('toast-sound-added', result.name));
      renderSoundList();
    } else {
      showToast(t('toast-sound-fail'));
    }
  };
  inp.click();
}

function renderThemeGrid() {
  const grid = document.getElementById('themeGrid');
  grid.innerHTML = '';
  const lang = settings.lang || 'zh';
  THEMES.forEach(thm => {
    const card = el('div', `theme-card ${thm.previewClass}` + (thm.key === settings.theme ? ' active' : ''));
    const label = document.createElement('span');
    label.className = 'theme-card-label';
    label.textContent = (lang === 'en' && thm.enLabel) ? thm.enLabel : thm.label;
    card.appendChild(label);
    card.addEventListener('click', () => {
      if (thm.key === 'custom') {
        pickCustomBg();
      } else {
        clearScene();
        settings.activeScene = '';
        document.getElementById('bgLayer').style.backgroundImage = '';
        applyTheme(thm.key);
        store.set('settings', settings);
        renderThemeGrid();
        renderSceneGrid();
      }
    });
    grid.appendChild(card);
  });
}

// ── Bind events ───────────────────────────────────────────────────────────────
function bindEvents() {
  // Sidebar toggle
  document.getElementById('sidebarToggle').addEventListener('click', () =>
    document.getElementById('sidebar').classList.toggle('collapsed'));

  // New novel modal
  ['newNovelBtn', 'startBtn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
      _newNovelFont = settings.font;
      _newNovelMode = 'prose';
      renderNewNovelFontPicker();
      // Reset mode picker UI
      document.querySelectorAll('#newNovelModePicker .mode-opt').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === 'prose');
      });
      document.getElementById('newNovelOverlay').classList.remove('hidden');
      document.getElementById('newNovelTitle').focus();
    });
  });

  document.getElementById('closeNewNovelBtn').addEventListener('click', () =>
    document.getElementById('newNovelOverlay').classList.add('hidden'));

  // Mode picker inside new-novel modal
  document.querySelectorAll('#newNovelModePicker .mode-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      _newNovelMode = btn.dataset.mode;
      document.querySelectorAll('#newNovelModePicker .mode-opt').forEach(b =>
        b.classList.toggle('active', b === btn));
    });
  });

  document.getElementById('confirmNewNovelBtn').addEventListener('click', () => {
    const t = document.getElementById('newNovelTitle').value.trim();
    const c = document.getElementById('newChapterTitle').value.trim();
    createNovel(t, c, _newNovelFont, _newNovelMode);
    document.getElementById('newNovelOverlay').classList.add('hidden');
    document.getElementById('newNovelTitle').value    = '';
    document.getElementById('newChapterTitle').value  = '';
  });

  // Chapter title
  document.getElementById('chapterTitleInput').addEventListener('blur', () => {
    saveCurrentChapter(); saveNovels();
  });

  // Writing area (contenteditable)
  const area = document.getElementById('writingArea');
  area.addEventListener('input', () => {
    updateWordCount();
    clearTimeout(area._saveTimer);
    area._saveTimer = setTimeout(() => { saveNovels(); saveStats(); }, 1500);
  });
  // Plain-text paste only
  area.addEventListener('paste', e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  });
  // Click anywhere on glass panel focuses the writing area
  document.getElementById('glassPanel').addEventListener('click', () => area.focus());

  // Font button (Aa) → opens settings
  document.getElementById('fontBtn').addEventListener('click', () => {
    renderFontOptions();
    renderTextColorRow();
    document.getElementById('settingsOverlay').classList.remove('hidden');
  });

  // Settings panel
  document.getElementById('settingsBtn').addEventListener('click', () => {
    renderFontOptions();
    renderTextColorRow();
    document.getElementById('settingsOverlay').classList.remove('hidden');
  });
  document.getElementById('closeSettingsBtn').addEventListener('click', closeAllPanels);

  document.getElementById('fontSizeSlider').addEventListener('input', e => {
    settings.fontSize = +e.target.value;
    document.getElementById('fontSizeVal').textContent = settings.fontSize + 'px';
    document.documentElement.style.setProperty('--font-size', settings.fontSize + 'px');
    store.set('settings', settings);
  });
  document.getElementById('lineHeightSlider').addEventListener('input', e => {
    settings.lineHeight = +e.target.value;
    document.getElementById('lineHeightVal').textContent = (settings.lineHeight / 100).toFixed(1);
    document.documentElement.style.setProperty('--line-height', (settings.lineHeight / 100).toFixed(1));
    store.set('settings', settings);
  });
  document.getElementById('panelWidthResetBtn').addEventListener('click', () => {
    settings.panelWidth = DEFAULT_PANEL_WIDTH;
    store.set('settings', settings);
    const panel = document.getElementById('glassPanel');
    panel.style.width = '';
    panel.style.height = '';
    applyPanelWidth(DEFAULT_PANEL_WIDTH);
  });

  // Save panel size after user finishes resizing (CSS resize: both)
  (function () {
    const panel = document.getElementById('glassPanel');
    let saveTimer;
    new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      const w = Math.round(width + 104); // add back padding (52px each side)
      document.getElementById('panelWidthVal').textContent = w + 'px';
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        settings.panelWidth = w;
        store.set('settings', settings);
      }, 400);
    }).observe(panel);
  })();

  document.getElementById('pickMoyuImageBtn').addEventListener('click', pickMoyuImage);
  document.getElementById('clearMoyuImageBtn').addEventListener('click', async () => {
    await store.delete('moyuImage');
    _applyMoyuImage(null);
    showToast(t('toast-moyu-cleared'));
  });

  document.querySelectorAll('.time-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.time-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      settings.moyuMin = +btn.dataset.min;
      store.set('settings', settings);
    });
  });

  // Theme / Sound / Visual panel
  document.getElementById('themeCycleBtn').addEventListener('click', () => {
    renderSceneGrid();
    renderThemeGrid();
    renderSoundList();
    document.getElementById('themeOverlay').classList.remove('hidden');
  });
  document.getElementById('closeThemeBtn').addEventListener('click', closeAllPanels);

  // Glass transparency slider (in theme panel): 0 = opaque, 85 = transparent
  document.getElementById('glassAlphaSlider').addEventListener('input', e => {
    const alpha = 0.9 - (+e.target.value / 85) * 0.85;
    settings.glassAlpha = Math.max(0.05, +alpha.toFixed(2));
    document.getElementById('glassAlphaVal').textContent = e.target.value + '%';
    document.documentElement.style.setProperty('--glass-alpha', settings.glassAlpha);
    store.set('settings', settings);
  });

  // Audio volume (in theme panel)
  document.getElementById('audioVolumeSlider').addEventListener('input', e => {
    settings.audioVolume = +e.target.value;
    document.getElementById('audioVolumeVal').textContent = e.target.value + '%';
    document.getElementById('bottomVolSlider').value = e.target.value;
    _syncVolIcon(+e.target.value);
    _ambientEl().volume = settings.audioVolume / 100;
    store.set('settings', settings);
  });
  // Inline volume slider on bottom bar
  document.getElementById('bottomVolSlider').addEventListener('input', e => {
    settings.audioVolume = +e.target.value;
    document.getElementById('audioVolumeVal').textContent = e.target.value + '%';
    document.getElementById('audioVolumeSlider').value = e.target.value;
    _syncVolIcon(+e.target.value);
    _ambientEl().volume = settings.audioVolume / 100;
    store.set('settings', settings);
  });
  // Click icon to mute/unmute
  document.getElementById('volIcon').addEventListener('click', () => {
    const muted = settings.audioVolume > 0;
    const next = muted ? 0 : (settings._prevVolume || 40);
    if (muted) settings._prevVolume = settings.audioVolume;
    settings.audioVolume = next;
    document.getElementById('bottomVolSlider').value = next;
    document.getElementById('audioVolumeSlider').value = next;
    document.getElementById('audioVolumeVal').textContent = next + '%';
    _syncVolIcon(next);
    _ambientEl().volume = next / 100;
    store.set('settings', settings);
  });

  // Language toggle
  document.getElementById('langBtn').addEventListener('click', () => {
    settings.lang = (settings.lang || 'zh') === 'zh' ? 'en' : 'zh';
    store.set('settings', settings);
    applyLang();
    renderNovels();
  });

  // Format toggle  (button shows CURRENT mode; active class = novel mode)
  document.getElementById('formatBtn').addEventListener('click', () => {
    isNovelFormat = !isNovelFormat;
    document.body.classList.toggle('format-novel', isNovelFormat);
    const btn = document.getElementById('formatBtn');
    btn.classList.toggle('active', isNovelFormat);
    btn.textContent = isNovelFormat ? t('btn-novel') : t('btn-prose');
    // Persist on current novel
    const novel = novels.find(n => n.id === activeNovelId);
    if (novel) { novel.format = isNovelFormat ? 'novel' : 'prose'; store.set('novels', novels); }
  });

  // Export
  document.getElementById('exportBtn').addEventListener('click', () => {
    if (!activeNovelId) { showToast(t('toast-no-novel')); return; }
    document.getElementById('exportOverlay').classList.remove('hidden');
  });
  document.getElementById('closeExportBtn').addEventListener('click', closeAllPanels);
  document.querySelectorAll('.export-opt').forEach(btn =>
    btn.addEventListener('click', () => exportAs(btn.dataset.fmt)));

  // Chapter notes widget
  document.getElementById('chNotesToggle').addEventListener('click', () => {
    document.getElementById('chNotesWidget').classList.toggle('collapsed');
  });
  const chNotesArea = document.getElementById('chNotesArea');
  chNotesArea.addEventListener('input', () => {
    clearTimeout(chNotesArea._saveTimer);
    chNotesArea._saveTimer = setTimeout(saveChapterNotes, 1000);
  });
  chNotesArea.addEventListener('keydown', e => e.stopPropagation());

  // Character cards
  document.getElementById('charsBtn').addEventListener('click', openCharsPanel);
  document.getElementById('closeCharsBtn').addEventListener('click', closeAllPanels);
  document.getElementById('addCharBtn').addEventListener('click', addCard);

  // World cards
  document.getElementById('worldsBtn').addEventListener('click', openWorldsPanel);
  document.getElementById('closeWorldsBtn').addEventListener('click', closeAllPanels);
  document.getElementById('addWorldBtn').addEventListener('click', addCard);

  // Outline
  document.getElementById('outlineBtn').addEventListener('click', openOutline);
  document.getElementById('closeOutlineBtn').addEventListener('click', closeAllPanels);
  document.getElementById('saveOutlineBtn').addEventListener('click', saveOutline);

  // Stats
  document.getElementById('closeStatsBtn').addEventListener('click', closeAllPanels);

  // Moyu
  document.getElementById('moyuBtn').addEventListener('click', startMoyu);
  document.getElementById('moyuCancelBtn').addEventListener('click', endMoyu);

  // Close overlays on backdrop click
  ['settingsOverlay','themeOverlay','exportOverlay','newNovelOverlay',
   'outlineOverlay','statsOverlay','charsOverlay','worldsOverlay'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', e => {
      if (e.target.id === id) closeAllPanels();
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 's') {
      e.preventDefault(); saveNovels(); saveStats(); saveChapterNotes(); showToast(t('toast-saved'));
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
      e.preventDefault(); document.getElementById('exportBtn').click();
    }
    if (e.key === 'Escape') closeAllPanels();
  });
}

// ── Auto-save ─────────────────────────────────────────────────────────────────
function startAutoSave() {
  setInterval(() => { saveNovels(); saveStats(); }, 30000);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function showWelcome() {
  document.getElementById('emptyHint').classList.remove('hidden');
  document.getElementById('chapterInfoSection').style.visibility = 'hidden';
  document.getElementById('wordCountBadge').style.visibility     = 'hidden';
  document.getElementById('chapterTimeBadge').style.visibility   = 'hidden';
  document.getElementById('writingWrap').style.visibility        = 'hidden';
  document.getElementById('chNotesWidget').classList.add('hidden');
}

function hideWelcome() {
  document.getElementById('emptyHint').classList.add('hidden');
  document.getElementById('chapterInfoSection').style.visibility = '';
  document.getElementById('wordCountBadge').style.visibility     = '';
  document.getElementById('chapterTimeBadge').style.visibility   = '';
  document.getElementById('writingWrap').style.visibility        = '';
}

function deleteChapter(novelId, chapterId) {
  const novel = novels.find(n => n.id === novelId);
  if (!novel) return;
  if (novel.chapters.length === 1) { showToast(t('toast-min-ch')); return; }
  if (!confirm(t('confirm-del-ch'))) return;
  novel.chapters = novel.chapters.filter(c => c.id !== chapterId);
  if (activeChapterId === chapterId) {
    activeChapterId = null;
    openChapter(novelId, novel.chapters[0].id);
  }
  saveNovels();
}

function deleteNovel(novelId) {
  if (!confirm(t('confirm-del-novel'))) return;
  novels = novels.filter(n => n.id !== novelId);
  if (activeNovelId === novelId) {
    activeNovelId = null; activeChapterId = null;
    document.getElementById('chapterTitleInput').value         = '';
    document.getElementById('chapterTitleInput').disabled      = true;
    const wa = document.getElementById('writingArea');
    wa.innerHTML         = '';
    wa.contentEditable   = 'false';
    document.getElementById('currentNovelLabel').textContent = t('no-novel-label');
    stopTimer();
  }
  saveNovels();
  if (novels.length === 0) showWelcome();
}

function closeAllPanels() {
  ['settingsOverlay','themeOverlay','exportOverlay','newNovelOverlay',
   'outlineOverlay','statsOverlay','charsOverlay','worldsOverlay'].forEach(id =>
    document.getElementById(id)?.classList.add('hidden'));
}

function showToast(msg, duration = 2000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

function el(tag, className) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  return e;
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function pad(n) { return String(n).padStart(2, '0'); }

function fmtTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Boot ──────────────────────────────────────────────────────────────────────
init();
