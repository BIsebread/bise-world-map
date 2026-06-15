import { initializeApp }       from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ============================================================
//  国データ（countries コレクション）
// ============================================================

export async function getAllCountries() {
  const snap = await getDocs(collection(db, "countries"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCountry(id) {
  const snap = await getDoc(doc(db, "countries", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function saveCountry(id, data) {
  await setDoc(doc(db, "countries", id), data, { merge: true });
}

// ============================================================
//  レッスンデータ（lessons コレクション）
// ============================================================

export async function getLessonsByCountry(countryId) {
  const q    = query(collection(db, "lessons"), orderBy("lesson_date", "desc"));
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(l => l.country_id === countryId);
}

export async function saveLesson(lessonData, existingId = null) {
  const id = existingId || `${lessonData.country_id}_${Date.now()}`;
  await setDoc(doc(db, "lessons", id), lessonData, { merge: true });
  const lessons = await getLessonsByCountry(lessonData.country_id);
  await updateDoc(doc(db, "countries", lessonData.country_id), {
    lesson_count: lessons.length,
    status: "done"
  });
  return id;
}

export async function deleteLesson(lessonId, countryId) {
  await deleteDoc(doc(db, "lessons", lessonId));
  const lessons = await getLessonsByCountry(countryId);
  await updateDoc(doc(db, "countries", countryId), {
    lesson_count: lessons.length,
    status: lessons.length > 0 ? "done" : "none"
  });
}

// ============================================================
//  写真アップロード（Cloudinary 無料プラン）
//  ★ CLOUDINARY_CLOUD_NAME を自分のものに書き換えてください
// ============================================================
const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME";  // ← ここを変える
const CLOUDINARY_UPLOAD_PRESET = "bise_upload";    // ← Cloudinaryで作るプリセット名

export async function uploadPhoto(countryId, lessonId, file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  formData.append("folder", `bise/${countryId}/${lessonId}`);

  const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: "POST",
    body: formData
  });
  const data = await res.json();
  return { url: data.secure_url, path: data.public_id };
}

// ============================================================
//  サンプルデータ初期投入（初回のみ）
// ============================================================
export async function seedSampleData() {
  const countries = [
    { id:"FR", name_ja:"フランス",  name_en:"France",   region:"ヨーロッパ",   status:"done", lesson_count:1, culture_note:"バゲットは17世紀から続く誇り高い伝統。1日に何度も買いに行く日常の食べ物です。" },
    { id:"DE", name_ja:"ドイツ",    name_en:"Germany",  region:"ヨーロッパ",   status:"done", lesson_count:1, culture_note:"300種以上のパンを持つ「パン大国」。ライ麦パンは健康的で保存性も高く食卓に欠かせません。" },
    { id:"IT", name_ja:"イタリア",  name_en:"Italy",    region:"ヨーロッパ",   status:"done", lesson_count:1, culture_note:"各地方に独自のパンがあります。フォカッチャはジェノバ発祥でオリーブオイルが香ります。" },
    { id:"JP", name_ja:"日本",      name_en:"Japan",    region:"アジア",       status:"done", lesson_count:1, culture_note:"明治時代に西洋パンが伝わり、日本独自のふわふわ食感の食パン文化が生まれました。" },
    { id:"MA", name_ja:"モロッコ",  name_en:"Morocco",  region:"アフリカ",     status:"done", lesson_count:1, culture_note:"「ホブズ」は丸くて平たい形。家庭で手作りしコミュニティのかまどで焼く習慣が今も残ります。" },
    { id:"ES", name_ja:"スペイン",  name_en:"Spain",    region:"ヨーロッパ",   status:"none", lesson_count:0, culture_note:"" },
    { id:"IN", name_ja:"インド",    name_en:"India",    region:"アジア",       status:"none", lesson_count:0, culture_note:"" },
    { id:"US", name_ja:"アメリカ",  name_en:"USA",      region:"南北アメリカ", status:"none", lesson_count:0, culture_note:"" },
    { id:"CN", name_ja:"中国",      name_en:"China",    region:"アジア",       status:"none", lesson_count:0, culture_note:"" },
    { id:"BR", name_ja:"ブラジル",  name_en:"Brazil",   region:"南北アメリカ", status:"none", lesson_count:0, culture_note:"" },
  ];
  const lessons = [
    { id:"FR_1", country_id:"FR", lesson_date:"2023-04", bread:"バゲット・クロワッサン",  main_dish:"ラタトゥイユ",   soup:"オニオングラタンスープ", salad:"ニソワーズサラダ",      dessert:"クレームブリュレ",               drink:"シードル",     lesson_note:"", photo_urls:[] },
    { id:"DE_1", country_id:"DE", lesson_date:"2023-07", bread:"ライ麦パン・プレッツェル", main_dish:"ザワークラウト", soup:"ジャガイモスープ",       salad:"カートッフェルサラダ",  dessert:"シュバルツバルダー・キルシュトルテ", drink:"ビール",       lesson_note:"", photo_urls:[] },
    { id:"IT_1", country_id:"IT", lesson_date:"2023-10", bread:"フォカッチャ・チャバッタ", main_dish:"オッソブーコ",   soup:"ミネストローネ",         salad:"カプレーゼ",            dessert:"ティラミス",                     drink:"エスプレッソ", lesson_note:"", photo_urls:[] },
    { id:"JP_1", country_id:"JP", lesson_date:"2024-01", bread:"食パン・メロンパン",      main_dish:"肉じゃが",       soup:"味噌汁",                 salad:"ゴマドレッシングサラダ", dessert:"大福",                          drink:"緑茶",         lesson_note:"", photo_urls:[] },
    { id:"MA_1", country_id:"MA", lesson_date:"2024-03", bread:"ホブズ",                 main_dish:"タジン鍋",       soup:"ハリラスープ",           salad:"キャロットサラダ",      dessert:"バクラバ",                      drink:"ミントティー", lesson_note:"", photo_urls:[] },
  ];
  for (const c of countries) {
    const { id, ...data } = c;
    await setDoc(doc(db, "countries", id), data);
  }
  for (const l of lessons) {
    const { id, ...data } = l;
    await setDoc(doc(db, "lessons", id), data);
  }
  console.log("サンプルデータを登録しました");
}
