# 📊 11-BOSQICH: EXCEL EKSPORT/IMPORTNI PROFESSIONAL QILISH

> **AI Coderga eslatma:** foydalanuvchi sizga 2 ta Excel fayl yuboradi — **`Savdogar_Zaxira_Nusxa.xlsx`** (tizimdan olingan zaxira nusxa qanday ko'rinishda bo'lishi kerakligi namunasi) va **`Savdogar_Mahsulot_Shabloni.xlsx`** (mahsulot ommaviy yuklash shabloni namunasi). Bu ikkalasini ochib ko'ring va ularning **aniq tuzilishini, ustun nomlarini, formatlanishini** loyihada qo'llang.

---

## 1. MUAMMO (hozirgi holat)

Hozir tizimdan "Zaxira nusxa olish" bosilganda, fayl **xom Firestore ma'lumotlari** ko'rinishida chiqadi:
- Ustun nomlari inglizcha va texnik (`costPrice`, `categoryId`, `stockByWarehouse`, `createdAt`).
- `categoryId` kabi maydonlarda o'qib bo'lmaydigan tasodifiy ID kodlar chiqadi (masalan `CEQ4Yh5yb8mLNIMeGXJI`), kategoriya nomi emas.
- Sana ISO formatida (`2026-08-02T06:00:06.557Z`) — o'qish qiyin.
- Hech qanday formatlash (rang, chegara, shrift) yo'q.

Bu — oddiy foydalanuvchi (do'kon egasi) uchun mutlaqo tushunarsiz.

---

## 2. YECHIM #1 — ZAXIRA NUSXA / EKSPORT FORMATINI TUZATISH

`Savdogar_Zaxira_Nusxa.xlsx` namunasidagi aniq tuzilishga o'ting:

### 2.1. Har bir jadval (Mahsulotlar, Yetkazib beruvchilar, Kategoriyalar, Amallar tarixi) uchun:
- Ustun nomlari **o'zbekcha**, tushunarli (masalan `costPrice` → `Tannarx (so'm)`, `categoryId` → `Kategoriya`).
- ID'lar o'rniga **haqiqiy nomlar** ko'rsatiladi — `categoryId` qiymati kategoriya jadvalidan qidirilib, uning `name`si yoziladi (xuddi shu tarzda kelajakda `supplierId` ham yetkazib beruvchi nomiga aylantirilsin).
- Sana `DD.MM.YYYY HH:MM` formatida, Toshkent vaqtida (`UTC+5`) ko'rsatiladi.
- `status`, `action`, `role` kabi texnik qiymatlar o'zbekchaga tarjima qilinadi: `active`→`Faol`, `CREATE`→`Qo'shildi`, `UPDATE`→`Yangilandi`, `DELETE`→`O'chirildi`, `admin`→`Administrator` va h.k.

### 2.2. Formatlash (namuna faylda ko'rgan uslubda):
- Sarlavha qatori (header) — brend rangida fon (`#4F7DFB`), oq qalin matn.
- Har bir jadval yuqorisida sarlavha va qisqa tavsif matni.
- Ustunlar avtomatik kenglikda, `freeze panes` (sarlavha qator doim ko'rinadi).
- Mahsulotlar jadvali oxirida jami statistikasi: "Jami mahsulot turlari" va "Ombor qiymati (tannarx bo'yicha)" — bu FORMULA orqali hisoblansin (`COUNTA`, `SUMPRODUCT`), qattiq yozilgan raqam emas — shunda fayl Excel'da ochilganda ham to'g'ri qayta hisoblanadi.
- Shrift — Arial, professional ko'rinish.

### 2.3. Qaysi kutubxona
Backend/frontendda Excel generatsiya qilish uchun `exceljs` yoki `xlsx` (SheetJS) kutubxonasidan foydalaning — ikkalasi ham hujayra formatlash (rang, shrift, chegara)ni qo'llab-quvvatlaydi. Agar hozir oddiy `xlsx` bilan formatlanmagan fayl yozilayotgan bo'lsa, shu formatlash imkoniyatlariga ega qismga o'ting.

---

## 3. YECHIM #2 — MAHSULOT OMMAVIY YUKLASH (IMPORT) SHABLONI

`Savdogar_Mahsulot_Shabloni.xlsx` namunasidagi tuzilishni to'liq qo'llab-quvvatlang:

### 3.1. "Shablonni yuklab olish" tugmasi
`/products` sahifasida, "Excel'dan yuklash" tugmasi yonida **"📥 Shablonni yuklab olish"** tugmasi qo'shing — bosilganda aynan `Savdogar_Mahsulot_Shabloni.xlsx`dagi tuzilishga mos fayl yuklab beriladi (sarlavhalar, majburiy ustunlar `*` bilan belgilangan, sariq rangli namuna qator, "Birlik" ustunida dropdown tanlov ro'yxati).

### 3.2. Ustunlar (aynan shu tartibda va nomda)
| Ustun | Majburiymi | Izoh |
|---|---|---|
| Mahsulot nomi | ✅ | — |
| Tannarx (so'm) | ✅ | raqam |
| Sotuv narxi (so'm) | ✅ | raqam |
| Yetkazib beruvchi | ❌ | bo'sh qoldirilishi mumkin |
| Yetkazib beruvchi narxi (so'm) | ❌ | raqam |
| Kategoriya | ✅ | quyida izoh |
| Birlik | ✅ | dona/kg/litr/quti/metr/paket |
| Qoldiq | ✅ | raqam |
| Shtrix-kod | ❌ | **matn sifatida o'qilsin**, boshidagi nollar yo'qolmasin |

### 3.3. Yuklash mantig'i ("Excel'dan yuklash" bosilganda)
1. Fayl o'qiladi (`xlsx`/`SheetJS`), sarlavha qatori (5-qator, namunaga qarang) va undan pastdagi barcha to'ldirilgan qatorlar olinadi. Bo'sh qatorlar o'tkazib yuboriladi.
2. Har bir qator uchun **validatsiya**: majburiy (`*`) ustunlar bo'shmi, narxlar/qoldiq musbat raqammi. Xato bo'lsa — shu qator "xato" ro'yxatiga qo'shiladi, keyingi qatorga o'tiladi (butun jarayon to'xtamaydi).
3. **Kategoriya**: yozilgan nom mavjud kategoriyalar bilan solishtiriladi (katta-kichik harfni farqlamasdan). Topilsa — o'sha kategoriyaga bog'lanadi. Topilmasa — **avtomatik yangi kategoriya yaratiladi** shu nom bilan.
4. **Yetkazib beruvchi**: xuddi shunday — mavjud bo'lsa bog'lanadi, bo'sh bo'lsa hech narsa qilinmaydi, yozilgan-u topilmasa (ixtiyoriy) yangi yetkazib beruvchi yozuvi yaratiladi (faqat nomi bilan, keyin foydalanuvchi to'liq ma'lumotini kiritishi mumkin).
5. Barcha to'g'ri qatorlar **`writeBatch`** orqali (500 tadan guruhlab) Firestore'ga yoziladi — bittalab `addDoc` chaqirmang (avvalgi promptlardagi tezlik/optimallashtirish qoidasiga mos).
6. Yuklash tugagach, natija ko'rsatiladi: **"✅ 47 ta mahsulot muvaffaqiyatli qo'shildi. ⚠️ 3 ta qatorda xatolik bor"** — xato qatorlar ro'yxati (qaysi qator, qaysi sabab) modalda ko'rsatiladi, kerak bo'lsa shu ro'yxatni ham Excel qilib yuklab olish mumkin bo'lsin.

---

## ✅ TEKSHIRISH (Definition of Done)

- [ ] "Zaxira nusxa olish" endi to'liq o'zbekcha, formatlangan, o'qish oson fayl beradi — hech qanday xom ID yoki inglizcha texnik nom qolmagan.
- [ ] "Shablonni yuklab olish" tugmasi ishlaydi, aniq namunadagi kabi fayl beradi.
- [ ] Shablon bo'yicha to'ldirilgan fayl yuklanganda, kategoriya/yetkazib beruvchi nomlari to'g'ri bog'lanadi yoki avtomatik yaratiladi.
- [ ] Xato qatorlar butun jarayonni to'xtatmaydi, alohida ro'yxatda ko'rsatiladi.
- [ ] Shtrix-kod ustuni raqam sifatida buzilib ketmaydi (masalan `4870001234567` ga aylanib qolmasin, boshidagi nol yo'qolmasin).
- [ ] Ko'p qatorli fayl (masalan 500+ mahsulot) yuklanganda ham dastur qotib qolmaydi (`writeBatch` guruhlab ishlatilgani uchun).
