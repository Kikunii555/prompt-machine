// ==========================================
// 1. 定数・設定エリア
// ==========================================
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbyNQnZ0vvkn_H97weOnFPQPKn29dTXhQPSFmvO-ueR75CbvJcC7mUH3Ds3eP5-Td0rg/exec";

let promptDB = [];
let selectedIndices = [];
let currentMode = "image";
let activeGenre = "all";

// 🍜 【6大トッピング英語辞書回路】
let activeToppings = [];
const TOPPING_DICTIONARY = {
    hadasho: "dynamic and aggressive action effects, hyper-detailed flashy power aura, glowing shards and sparks, epic dramatic cinematic rendering",
    yoru: "authentic hand-drawn art style, traditional cell-shaded execution, faithful classic animation aesthetic, raw illustration focus",
    kyojo: "dynamic action pose, extreme dramatic angle closeup, cinematic forced perspective, stylized intense layout composition",
    serifu: "prominent stylized manga sound effect typography text, integrated graphic text overlay elements, anime poster logo subtitle design",
    color: "vibrant saturated color palette, high-contrast neon chromatic hues, rich vivid colorful illumination, intense visual pop coloration",
    monochrome: "exquisite monochromatic manga ink style, detailed halftone dot patterns, clean dark line art sketch, high-contrast sharp black and white tones"
};

// ジャンル完全一致カラー設定
function getGenreColors(genreName) {
    const name = (genreName || "").trim();
    if (name === "新しい作品") {
        return { theme: "var(--color-new)", bg: "#fff7ed" };
    } else if (name === "懐かしい作品") {
        return { theme: "var(--color-retro)", bg: "#ecfeff" };
    } else if (name === "作者・スタジオ") {
        return { theme: "var(--color-author)", bg: "#f5f3ff" };
    } else if (name === "ゲーム") {
        return { theme: "var(--color-game)", bg: "#f0fdf4" };
    } else if (name === "海外作品") {
        return { theme: "var(--color-foreign)", bg: "#fdf2f8" };
    } else if (name.includes("デザイン") || name.includes("方向性")) {
        return { theme: "var(--color-design)", bg: "#f8fafc" };
    } else {
        return { theme: "var(--color-default)", bg: "#f8fafc" };
    }
}

// 🌐 1. スプレッドシートからデータを取得する関数
async function loadPromptDB() {
    const badge = document.getElementById('syncBadge');
    try {
        const response = await fetch(SHEET_API_URL);
        if (!response.ok) throw new Error();
        promptDB = await response.json();
        
        promptDB = promptDB.map(item => {
            if (item.genre) item.genre = String(item.genre).trim();
            return item;
        }).filter(item => item.genre && item.genre !== "ジャンル" && item.genre !== "1. ジャンル");

        badge.innerText = "● 同期中";
        badge.className = "sync-badge sync-success";
    } catch (error) {
        badge.innerText = "⚠️ 接続エラー：スプレッドシートを読み込めません";
        badge.style.backgroundColor = "#fee2e2";
        badge.style.color = "#991b1b";
        return;
    }
    initGenreTabs();
    initCanvas();
    document.getElementById('searchBar').addEventListener('input', applyFilter);
}

// 🗂️ 2. ジャンル切り替えの丸ボタンを自動生成する関数
function initGenreTabs() {
    const tabsContainer = document.getElementById('genreTabs');
    const genres = [...new Set(promptDB.map(item => item.genre))].filter(Boolean);
    genres.forEach(genre => {
        const btn = document.createElement('button');
        btn.className = 'genre-tab-btn';
        btn.id = `tab-btn-${genre}`;
        btn.innerText = genre;
        btn.onclick = () => filterByGenre(genre);
        tabsContainer.appendChild(btn);
    });
}

// 🔼 スマホ用：ジャンルのパカパカ開閉トグル関数
function toggleGenreCollapse() {
    const tabs = document.getElementById('genreTabs');
    tabs.classList.toggle('open');
}

// 🎨 3. 左側のカード一覧（Canvasエリア）を組み立てる関数
function initCanvas() {
    const canvasArea = document.getElementById('canvasArea');
    canvasArea.innerHTML = "";
    const genres = [...new Set(promptDB.map(item => item.genre))].filter(Boolean);

    genres.forEach(genre => {
        const colors = getGenreColors(genre);

        const section = document.createElement('div');
        section.className = 'genre-section';
        section.id = `genre-sec-${genre}`;

        const title = document.createElement('div');
        title.className = 'genre-title';
        title.innerText = genre;
        title.style.setProperty('--genre-theme-color', colors.theme);
        section.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'card-grid';

        promptDB.forEach((item, index) => {
            if (item.genre === genre) {
                const card = document.createElement('div');
                card.className = 'style-card';
                card.id = `card-${index}`;
                card.setAttribute('data-genre', item.genre);
                card.setAttribute('data-name', (item.name || '').toLowerCase());
                card.setAttribute('data-desc', (item.mainDesc || '').toLowerCase() + (item.addDesc || '').toLowerCase());
                card.onclick = () => toggleCard(index);

                card.style.setProperty('--genre-theme-color', colors.theme);
                card.style.setProperty('--genre-bg-color', colors.bg);

                card.innerHTML = `
                    <div class="card-name" style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9;">${item.name || '無題'}</div>
                    <div class="card-desc">${item.addDesc || ''}</div>
                `;
                grid.appendChild(card);
            }
        });
        section.appendChild(grid);
        canvasArea.appendChild(section);
    });

    const subjectInput = document.getElementById('subjectInput');
    if(subjectInput) {
        subjectInput.addEventListener('input', buildPrompt);
    }
    applyFilter();
}

// 🔍 4. ジャンル丸ボタンを押したときの処理
function filterByGenre(genre) {
    activeGenre = genre;
    document.querySelectorAll('.genre-tab-btn').forEach(btn => btn.classList.remove('active'));
    if (genre === 'all') {
        document.querySelector('.genre-tab-btn[onclick="filterByGenre(\'all\')"]').classList.add('active');
        document.getElementById('genreToggleBtn').innerText = "🗂️ ジャンルを選択 🔽";
    } else {
        const targetBtn = document.getElementById(`tab-btn-${genre}`);
        if (targetBtn) targetBtn.classList.add('active');
        document.getElementById('genreToggleBtn').innerText = `🗂️ ${genre} 🔽`;
    }
    
    document.getElementById('genreTabs').classList.remove('open');
    selectedIndices = [];
    buildPrompt();
    applyFilter();
}

// 🔍 5. キーワード検索とジャンルを組み合わせてカードを絞り込む関数
function applyFilter() {
    const keyword = document.getElementById('searchBar').value.toLowerCase().trim();
    const cards = document.querySelectorAll('.style-card');
    const genres = [...new Set(promptDB.map(item => item.genre))].filter(Boolean);
    let visibleCardCount = 0;

    cards.forEach(card => {
        const cardGenre = card.getAttribute('data-genre');
        const name = card.getAttribute('data-name');
        const desc = card.getAttribute('data-desc');

        const genreMatch = (activeGenre === 'all' || cardGenre === activeGenre);
        const keywordMatch = (name.includes(keyword) || desc.includes(keyword));

        if (genreMatch && keywordMatch) {
            card.classList.remove('hidden');
            visibleCardCount++;
        } else {
            card.classList.add('hidden');
        }
    });

    genres.forEach(genre => {
        const section = document.getElementById(`genre-sec-${genre}`);
        if (!section) return;
        const total = section.querySelectorAll('.style-card').length;
        const hidden = section.querySelectorAll('.style-card.hidden').length;
        if (total === hidden) section.classList.add('hidden');
        else section.classList.remove('hidden');
    });

    document.getElementById('matchCount').innerText = `該当 ${visibleCardCount} 件 / 全 ${promptDB.length} 件`;
}

// 🍜 トッピング出し入れコントロール関数
function toggleTopping(toppingTag) {
    const btn = document.querySelector(`.topping-btn[data-tag="${toppingTag}"]`);
    if (!btn) return;

    if (activeToppings.includes(toppingTag)) {
        activeToppings = activeToppings.filter(t => t !== toppingTag);
        btn.classList.remove('active');
    } else {
        activeToppings.push(toppingTag);
        btn.classList.add('active');
    }
    buildPrompt();
}

function toggleCard(index) {
    const card = document.getElementById(`card-${index}`);
    if (selectedIndices.includes(index)) {
        selectedIndices = [];
        card.classList.remove('selected');
    } else {
        document.querySelectorAll('.style-card').forEach(c => c.classList.remove('selected'));
        selectedIndices = [index];
        card.classList.add('selected');
    }
    buildPrompt();
}

function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.mode-btn[data-mode="${mode}"]`).classList.add('active');

    document.getElementById('imageModeInput').style.display = (mode === 'image') ? 'block' : 'none';
    document.getElementById('copyBtn').className = `copy-btn ${mode}-theme`;
    buildPrompt();
}

// 🪄 6. 呪文自動組み立てロジック
function buildPrompt() {
    const outputBox = document.getElementById('outputBox');
    if (selectedIndices.length === 0) {
        outputBox.value = "👈 リストからお好きなスタイルを1つ選択してください。";
        return;
    }

    const activeStyle = promptDB[selectedIndices[0]];
    let combinedEnglish = `${activeStyle.mainPrompt || ''}, ${activeStyle.addPrompt || ''}`;

    if (activeToppings.length > 0) {
        activeToppings.forEach(tag => {
            const toppingEnglish = TOPPING_DICTIONARY[tag];
            if (toppingEnglish) {
                combinedEnglish += `, ${toppingEnglish}`;
            }
        });
    }

    if (currentMode === "text") {
        const subject = document.getElementById('subjectInput').value || "[ここに被写体を入力]";
        outputBox.value = `以下の英語プロンプトを改変せずそのままDALL-E 3に入力して、「${subject}」の画像を作ってください。\n\n【プロンプト】\n${combinedEnglish}`;
    } else {
        let subjectLine = "";
        const subjectInput = document.getElementById('subjectInput');
        const inputSubject = subjectInput ? subjectInput.value.trim() : "";
        if (inputSubject && inputSubject !== "a cute cat") {
            subjectLine = `- 被写体の服装・小物を変更する際は、元の衣服の形を残しつつ、「${inputSubject}」の要素やデザインを組み込んでミックスさせてください。元のキャラクター的外見に完全変身させないでください。\n`;
        }
        outputBox.value = `以下の【命令文】と【画風プロンプト】に従い、私が添付した画像の「人物の特徴」「人数」「構図」を完全に維持したまま、服装や周囲の小物をその作品の世界観へ自然に（ある程度）馴染ませて変身させてください。\n\n【命令文（服装・小物の調整ルール）】\n- 元の人物のポーズや配置、顔の特徴は変えないでください（特定のキャラに完全変身させない）。\n${subjectLine}- 服装や手持ちの小物は、元の形状をベースにしつつ、作品の世界観（世界観に合った衣服・簡易的な衣装・マッチするアクセサリーや道具など）に自然にアレンジ・置換してください。すべてをガチガチのフルコスプレにするのではないこと。元の写真と作品の雰囲気が「7:3」で融合したような自然なアレンジにすること。\n\n【画風プロンプト（Style & Outfit Blend Prompt）】\nBased on the provided reference image, transform the scene and characters into the designated style. Crucially, naturally stylize the subjects' clothing and surrounding objects into the anime's world-view (e.g., matching themed attire, subtle textures, or fitting accessories) while respecting the original poses, layout, and facial identities. Avoid turning them into literal copies of main characters.\n\n${combinedEnglish}`;
    }
}

// 🚨 ポップアップ回路完全修正版（ID名がtoastでもcopyMessageでも両方安全に検知する絶対防衛ロジック）
function showToast(message) {
    // HTML内に存在する可能性のあるすべての目印を両方チェック
    const toast = document.getElementById('toast') || document.getElementById('copyMessage');
    if (toast) {
        if (message) {
            toast.innerText = message;
        } else {
            toast.innerText = "クリップボードにコピーしました！";
        }
        toast.style.opacity = '1';
        setTimeout(() => { toast.style.opacity = '0'; }, 2000);
    }
}

function copyPrompt() {
    if (selectedIndices.length === 0) return;
    navigator.clipboard.writeText(document.getElementById('outputBox').value).then(() => {
        showToast("クリップボードにコピーしました！");
    });
}

function copyTwoImagePrompt() {
    const twoImagePromptText = `添付した2枚の画像（1枚目と2枚目）を高度に融合させ、新しい画像を生成してください。

【融合ルール】
- 構図・被写体ベース（1枚目の画像）：
  全体の配置、人数、被写体の顔立ちや髪型、ポーズ、およびカメラのアングルは、1枚目の画像を100%完全にベースとして厳格に維持してください。

- 画風・世界観ベース（2枚目の画像）：
  イラストのタッチ、色彩、ライティング（光と影の表現）、背景の雰囲気、および衣服の質感や世界観は、2枚目の画像が持つ固有のスタイルを完全にトレースして1枚目の被写体に馴染ませてください。

1枚目の写真の人物のアイデンティティやポーズを綺麗に残したまま、2枚目の画像の世界観の中へ自然に変身・融合させたような、ハイクオリティな1枚を出力してください。`;

    navigator.clipboard.writeText(twoImagePromptText).then(() => {
        showToast("画像2枚の融合指示文をコピーしました！");
    }).catch(err => {
        alert("コピーに失敗しました。お手数ですが手動でコピーしてください。");
    });
}

window.onload = loadPromptDB;