# 🎯 MASTER PROMPT — Do'kon Boshqaruv Tizimini (Billz / 1C darajasida) TO'LIQ ISHLAYDIGAN holatga keltirish

> **Qo'llanma:** Ushbu promptni AI koderingizga (Cursor / Windsurf / Lovable / Bolt / Claude Code va h.k.) **to'liq, o'zgartirmasdan** joylashtiring. U `/goal` yoki agent rejimida ishlaydi. Prompt loyihaning HOZIRGI holatini (mavjud fayllar, Firebase konfiguratsiyasi, komponentlar) o'zgartirmasdan, faqat **yetishmayotgan funksionallikni to'ldirish va mavjud makatlarni ishchi holatga keltirish** uchun mo'ljallangan.

---

## 0. ROL VA MAQSAD

Sen — senior full-stack dasturchisan va React + Firebase asosidagi savdo-hisob dasturi (POS/ERP) ustida ishlayapsan. Loyiha allaqachon Glassmorphism dizaynda qayta qurilgan, lekin ko'p tugmalar va formalar faqat **vizual maket (UI mock)** holatida — ular hech qanday real amalni bajarmaydi.

**Sening vazifang:** loyihani oxirigacha o'qib chiqib, chap menyudagi **9 ta bo'limning har birini** to'liq, xatosiz, real ma'lumotlar bilan ishlaydigan holatga keltirish. Hech bir tugma, forma yoki modal oyna "dekorativ" bo'lib qolmasligi kerak — har biri bosilganda haqiqiy CRUD amalini (Create/Read/Update/Delete) Firebase Firestore'da bajarishi shart.

Ishni boshlashdan oldin: butun loyiha kodini (`src/` papkasi, barcha komponentlar, hooklar, Firebase konfiguratsiyasi) diqqat bilan skanerdan o'tkaz, keyin quyidagi talablar bilan solishtirib, **nima bor, nima yo'q, nima yarim tayyor** — ro'yxat tuz va shundan keyin ishni boshla.

---

## 1. ARXITEKTURA VA UMUMIY QOIDALAR (barcha modullar uchun majburiy)

### 1.1 Texnologik stack (o'zgartirmasdan saqlash)
- **Frontend:** React (Vite), toza CSS + CSS Variables (Tailwind ishlatilmaydi), Glassmorphism dizayn tili.
- **Grafiklar:** Recharts.
- **Baza:** Firebase Firestore (real-time `onSnapshot` orqali).
- **Autentifikatsiya:** Firebase Auth (email/parol yoki PIN-kod kassirlar uchun).
- **Holat boshqaruvi:** React Context yoki Zustand (loyihada nima ishlatilgan bo'lsa, o'shani davom ettir; agar hech narsa yo'q bo'lsa — Context API yetarli).

### 1.2 Xatoliklarni oldini olish qoidalari (KRITIK — hech qachon buzilmasin)
1. **Hech qanday tugma "jim" ishlamay qolmasligi kerak.** Agar amal bajarilayotgan bo'lsa — loading spinner/skeleton ko'rsat. Agar xatolik bo'lsa — toast/notification orqali aniq xabar chiqar (masalan: "Mijoz qo'shilmadi: telefon raqami noto'g'ri formatda").
2. **Har bir Firestore so'roviga 8 soniyalik timeout o'rnat.** Agar internet ishlamasa, dastur "osilib qolmasligi" kerak — foydalanuvchiga "Internet aloqasi yo'q, offline rejimda davom etilmoqda" degan bildirishnoma chiqsin va oldin keshlangan (localStorage/IndexedDB) ma'lumotlar bilan ishlashda davom etsin.
3. **Har bir forma uchun validatsiya majburiy:** bo'sh maydonlar, noto'g'ri telefon format (+998 XX XXX XX XX), manfiy sonlar, takrorlanuvchi shtrix-kodlar — barchasi foydalanuvchiga forma ichida (input ostida qizil matn bilan) ko'rsatilsin, alert() ishlatilmasin.
4. **Optimistic UI:** foydalanuvchi biror amal qilganda (masalan mijoz qo'shish), interfeys serverdan javob kutmasdan darhol yangilanadi, so'ng fon rejimida Firestore'ga yoziladi; xato bo'lsa — orqaga qaytariladi (rollback) va xabar chiqadi.
5. **Har bir CRUD amalidan keyin `updatedAt` va amalni bajargan xodimning `userId`sini yozib borish** — bu keyinchalik "Harakatlar tarixi" (Audit log) bo'limi uchun kerak bo'ladi.
6. **Rollarga qarab huquqlar (permissions) tekshirilishi shart** — masalan kassir "Sozlamalar" yoki "Moliyalashtirish" bo'limiga kira olmasligi kerak (batafsili 3.8-bandda).

### 1.3 Dizayn qoidalari (Glassmorphism, davom ettirish)
- Barcha kartalar: `backdrop-filter: blur(12–20px)`, yarim shaffof fon (`rgba(255,255,255,0.06–0.12)`), 1px ingichka border (`rgba(255,255,255,0.15)`), yumshoq soya.
- Har bir modul o'zining aksent rangiga ega bo'lsin (masalan: Sotuvlar — yashil, Mijozlar — ko'k, Marketing — pushti, Moliyalashtirish — oltin/sariq, Boshqaruv — binafsha) — bu foydalanuvchiga tez orientatsiya qilishga yordam beradi.
- Mikro-animatsiyalar: tugma bosilganda `scale(0.97)`, karta hover'da yengil ko'tarilish (`translateY(-2px)`), modal oynalar `fade + scale` bilan ochilsin/yopilsin (150–200ms).
- Barcha ro'yxatlar (jadval, kartochka) skeleton-loading holatiga ega bo'lsin (ma'lumot yuklanayotganda "bo'sh joy pulslanishi").
- Mobil va planshet uchun ham responsive bo'lsin — kassir ko'pincha planshetdan foydalanadi.

### 1.4 Ma'lumotlar bazasi tuzilishi (Firestore Collections)

Quyidagi kolleksiyalarni yarat (agar mavjud bo'lmasa) yoki mos ravishda to'ldir:

```
/products          → mahsulotlar
/categories         → kategoriyalar (ierarxik: parentId bilan)
/sales              → har bir chek (tranzaksiya)
/customers          → mijozlar
/customerDebts       → nasiya/qarz yozuvlari (customerId bo'yicha)
/promotions         → aksiyalar va chegirmalar
/certificates        → sovg'a sertifikatlari / vaucherlar
/smsCampaigns        → SMS/marketing kampaniyalari
/suppliers          → ta'minotchilar
/purchaseOrders      → kirim hujjatlari (ombordan tovar kirimi)
/warehouses         → do'kon/omborlar (agar bir nechta filial bo'lsa)
/staff              → xodimlar (rol, huquqlar, KPI)
/shifts              → kassa smenalari (ochilish/yopilish)
/expenses            → xarajatlar
/cashFlow            → kirim-chiqim (pul harakati)
/auditLog            → barcha amallar tarixi
/settings           → do'kon sozlamalari (bitta hujjat: /settings/general)
```

Har bir kolleksiya uchun aniq maydonlar tuzilishi pastda, tegishli bo'limda ko'rsatilgan.

---

## 2. CHAP MENYU (SIDEBAR) TUZILISHI

Chap menyuda quyidagi 9 bo'lim, aynan shu tartibda va shu ikonkalar mantig'ida bo'lsin:

| # | Bo'lim nomi | Ikonka mazmuni | Kirish huquqi |
|---|---|---|---|
| 1 | 🏠 Bosh sahifa (Dashboard) | Grafik/statistika | Barcha rollar |
| 2 | 📦 Mahsulotlar | Quti | Admin, Ombor mudiri |
| 3 | 🛒 Sotuvlar | Savat/Kassa | Barcha rollar (kassir asosiy) |
| 4 | 👥 Mijozlar | Odamlar | Admin, Kassir (ko'rish), Marketing |
| 5 | 📣 Marketing | Megafon | Admin, Marketing menejeri |
| 6 | 📊 Hisobotlar | Grafik/jadval | Admin, Menejer |
| 7 | 💰 Moliyalashtirish | Hamyon | Admin, Buxgalter |
| 8 | 🛡️ Boshqaruv | Qalqon/shesternya | Faqat Admin |
| 9 | ⚙️ Sozlamalar | Shesternya | Faqat Admin |

Har bir bo'limga kirganda, agar foydalanuvchining roli ruxsat bermasa — "Sizda bu bo'limga kirish huquqi yo'q" degan holat ko'rsatilsin, bo'lim butunlay yashirin bo'lmasin (shaffof, lekin qulflangan holatda ko'rinsin — bu UX jihatidan yaxshiroq).

---

## 3. HAR BIR MODUL UCHUN BATAFSIL FUNKSIONAL TALABLAR

### 3.1 🏠 Bosh sahifa (Dashboard) — mavjudni kengaytirish

Hozirgi holat: KPI vidjetlar va kunlik sotuv grafigi bor. Quyidagilarni qo'sh:
- **Sana filtri:** Bugun / Kecha / Shu hafta / Shu oy / Maxsus oraliq — tanlanganda barcha KPI va grafiklar shu davr bo'yicha qayta hisoblansin (Firestore query `where('createdAt', '>=', start).where('createdAt', '<=', end)`).
- **Top-5 sotilgan mahsulotlar** — mini-jadval, `sales` kolleksiyasidagi `items` massivini aggregatsiya qilib chiqariladi.
- **Kam qolgan mahsulotlar (Low stock) widget** — `products` dan `stock < minStock` bo'lganlar, bosilganda to'g'ridan-to'g'ri Mahsulotlar bo'limiga, tegishli filtr bilan o'tkazadi.
- **Bugungi ochiq smena holati** — kim, qachon smena ochgani va hozirgi kassadagi naqd summa.
- Barcha vidjetlar real-time (`onSnapshot`) yangilanib tursin — sotuv qilinganda sahifani yangilamasdan raqamlar o'zgarsin.

### 3.2 📦 Mahsulotlar (Inventory) — to'liq ishchi holatga keltirish

**Ro'yxat sahifasi:**
- Jadval: rasm (kichik), nomi, shtrix-kod, kategoriya, tannarx, sotish narxi, qoldiq, holat belgisi (yashil/sariq/qizil).
- Qidiruv (nom yoki shtrix-kod bo'yicha, debounce 300ms bilan), kategoriya bo'yicha filtr, saralash (narx, qoldiq, nom bo'yicha).
- **"+ Mahsulot qo'shish"** tugmasi — modal oyna ochadi, quyidagi maydonlar bilan:
  - Nomi* (matn), Kategoriya* (dropdown, kolleksiyadan dinamik yuklanadi + "yangi kategoriya qo'shish" imkoniyati shu yerdan),
  - Shtrix-kod (avtomatik generatsiya tugmasi + qo'lda kiritish; agar bo'sh qoldirilsa, tizim EAN-13 formatida avtomatik yaratsin),
  - O'lchov birligi (dona / kg / metr / litr — dropdown),
  - Tannarx*, Sotish narxi* (foyda foizi avtomatik hisoblab ko'rsatilsin: `((sotish-tannarx)/tannarx*100).toFixed(1)+"%"`),
  - Boshlang'ich qoldiq, Minimal qoldiq chegarasi (bu "kam qoldiq" ogohlantirishi uchun),
  - Rasm yuklash (Firebase Storage'ga),
  - Rang/O'lcham/Model kabi qo'shimcha atributlar (variantlar uchun, ixtiyoriy maydon sifatida — kiyim-poyabzal do'konlari uchun).
  - Saqlash bosilganda: validatsiya → Firestore `addDoc` → optimistic UI yangilanishi → success toast.
- **Tahrirlash (✏️)** — xuddi shu modal, mavjud ma'lumotlar bilan to'ldirilgan holda ochiladi, `updateDoc` bilan saqlanadi.
- **O'chirish (🗑️)** — tasdiqlash modali ("Rostdan ham o'chirmoqchimisiz?") bilan, `deleteDoc`. Agar mahsulot biror sotuvda ishtirok etgan bo'lsa — o'chirish o'rniga "Arxivlash" (`status: 'archived'`) taklif qilinsin, tarixiy hisobotlar buzilmasligi uchun.
- **Qoldiq holati rangi:** `stock === 0` → qizil ("Tugagan"), `stock < minStock` → sariq ("Kam qoldi"), aks holda yashil.
- **Shtrix-kod chop etish** — tanlangan mahsulot(lar) uchun shtrix-kod yorlig'ini PDF/print oynasida generatsiya qilish (JsBarcode kutubxonasidan foydalanish mumkin).
- **Ombordan kirim (Purchase/Kirim)** — alohida tab: ta'minotchi tanlash, mahsulotlar va miqdorini kiritish → tasdiqlanganda tegishli mahsulotlarning `stock` maydoni avtomatik oshadi va `purchaseOrders` kolleksiyasiga yoziladi.
- **Inventarizatsiya (Stock-check)** rejimi — joriy qoldiqni qo'lda hisoblab, tizimdagi raqam bilan solishtirib, farqni avtomatik tuzatish imkoniyati.

**Firestore maydonlari (`products`):**
```
name, barcode, categoryId, unit, costPrice, sellPrice, stock, minStock,
imageUrl, attributes: {color, size, model}, status: 'active'|'archived',
createdAt, updatedAt, createdBy
```

### 3.3 🛒 Sotuvlar (POS) — mavjudni to'ldirish + Sotuvlar tarixi

Hozirgi kassa oynasi bor (qidiruv, savat, +/-, to'lov). Quyidagilarni qo'sh:
- **To'lov modali ishlashi:** "Naqd" bosilganda — qabul qilingan summa kiritiladi, qaytim avtomatik hisoblanadi (`received - total`); "Karta" bosilganda — to'g'ridan-to'g'ri to'liq summa yoziladi; **aralash to'lov** (qisman naqd + qisman karta) qo'shilishi kerak, chunki Billz'da ham bu standart.
- To'lov tasdiqlangach:
  1. `sales` kolleksiyasiga yangi hujjat yoziladi (pastda struktura),
  2. Har bir sotilgan mahsulotning `products.stock` maydoni kamaytiriladi (Firestore transaction orqali, race condition oldini olish uchun),
  3. Agar mijoz tanlangan bo'lsa — uning `totalPurchases` va bonus balli yangilanadi,
  4. Chek chop etish/PDF preview oynasi ochiladi (do'kon nomi, sana, mahsulotlar, jami, kassir ismi bilan),
  5. Savat tozalanadi, yangi sotuvga tayyor holatga qaytadi.
- **Mijoz biriktirish** — kassa oynasida "Mijoz qo'shish" input, telefon raqami bo'yicha qidiradi, topilmasa "Yangi mijoz" formasi ochiladi.
- **Chegirma qo'llash** — chekka umumiy chegirma (%) yoki alohida mahsulotga chegirma kiritish imkoniyati (faqat shunga huquqi bor rol uchun — masalan admin/menejer parol tasdig'i bilan).
- **Nasiya (qarz)ga sotish** — to'lov turi sifatida "Nasiya" tanlanganda, mijoz tanlash MAJBURIY bo'lib qoladi, summa `customerDebts`ga yoziladi va mijozning umumiy qarzi oshadi.
- **Qaytarish/Almashtirish (Return/Exchange)** — sotuvlar tarixidan biror chekni tanlab, to'liq yoki qisman qaytarish; qaytarilgan mahsulot miqdori omborga qaytadi (`stock` oshadi), mijozga pul qaytarish yoki balansga yozish tanlanadi.
- **Kassa smenasi:** kun boshida "Smenani ochish" (boshlang'ich naqd summa kiritiladi), kun oxirida "Smenani yopish" (tizim hisoblagan summa bilan qo'lda sanalgan summa solishtiriladi, farq bo'lsa sabab yozib qo'yiladi) — bu `shifts` kolleksiyasiga yoziladi.
- **Sotuvlar tarixi** (alohida tab/sahifa) — barcha cheklar ro'yxati, sana/kassir/mijoz/summa bo'yicha filtr, har bir chekni bosganda batafsil ko'rish va qayta chop etish.

**Firestore maydonlari (`sales`):**
```
saleNumber, items: [{productId, name, qty, price, discount}], subtotal,
discountTotal, total, paymentType: 'cash'|'card'|'mixed'|'debt',
cashReceived, cardAmount, customerId, cashierId, shiftId, status: 'completed'|'returned'|'partially_returned',
createdAt
```

### 3.4 👥 Mijozlar (CRM) — "Mijoz qo'shish" tugmasini ishlashga majburlash

Sizning aytishingizcha, aynan shu yerdagi tugma ishlamayapti. Quyidagicha to'liq ishla:

- **"+ Mijoz qo'shish"** tugmasi bosilganda modal ochilsin, quyidagi maydonlar bilan:
  - F.I.O* (matn, min 3 belgi),
  - Telefon raqami* (`+998 XX XXX XX XX` maskasi bilan, va **takrorlanmasligi** Firestore query orqali oldindan tekshirilsin),
  - Tug'ilgan sana (ixtiyoriy, lekin marketing bo'limidagi "tug'ilgan kun tabrigi" funksiyasi uchun muhim),
  - Jinsi (ixtiyoriy),
  - Izoh (ixtiyoriy matn maydon).
  - "Saqlash" bosilganda: validatsiya → `addDoc('customers', {...})` → modal yopiladi → ro'yxat optimistic tarzda yangilanadi → success toast ("Mijoz muvaffaqiyatli qo'shildi").
  - Xatolik holati aniq ko'rsatilsin (masalan, "Bu telefon raqami allaqachon ro'yxatdan o'tgan").
- **Mijoz kartochkasi (profil sahifasi)** — bosilganda ochiladi: umumiy xaridlar tarixi (sales dan `customerId` bo'yicha filtr), jami xarid summasi, bonus ball balansi, joriy qarz holati.
- **Qarz (Nasiya) bo'limi mijoz ichida:** qarz miqdori qizil rangda alohida ajratib ko'rsatiladi (aytilganidek), "Qarzni yopish" tugmasi bilan qisman yoki to'liq to'lov qabul qilinadi, bu `customerDebts`ga yangi yozuv (`type: 'payment'`) sifatida yoziladi.
- **Tahrirlash/O'chirish** — xuddi mahsulotlardagi kabi mantiq.
- **Segmentatsiya** — mijozlarni "VIP" (masalan umumiy xarid > belgilangan summa), "Yangi", "Qarzdor" kabi avtomatik teglar bilan filtrlash imkoniyati (bu Marketing bo'limida SMS yuborishda ishlatiladi).

**Firestore maydonlari (`customers`):**
```
fullName, phone, birthDate, gender, note, totalPurchases, bonusPoints,
currentDebt, tags: ['vip','new'], createdAt, updatedAt
```

### 3.5 📣 Marketing — Billz'dagi kabi to'liq amaliy modul

Billz'da bu bo'lim eng kuchli tomonlardan biri — quyidagilarni amalga oshir:

- **Aksiyalar (Promotions) yaratish:**
  - Mahsulotga to'g'ridan-to'g'ri chegirma (% yoki summa),
  - "N ta olsang, M ta bepul/chegirmali" turi (masalan 1+1=3),
  - Karusel chegirma (1-donaga 20%, 2-donaga 30%, 3-donaga 40% va h.k. — miqdor ko'paygani sari chegirma o'sadi),
  - Chekka umumiy chegirma (masalan "100,000 so'mdan yuqori chekka 10% chegirma"),
  - Har bir aksiyaning boshlanish/tugash sanasi, faol/nofaol holati (toggle switch) bo'lsin.
  - Aksiya yaratilgach, u avtomatik ravishda Sotuvlar (POS) bo'limida tegishli mahsulot savatga qo'shilganda ishga tushishi shart (chegirma hisob-kitobiga ta'sir qilishi kerak — bu eng muhim qism, faqat "ko'rinish" bo'lib qolmasligi kerak).
- **Sovg'a sertifikatlari / Vaucherlar** — noyob kod generatsiya qilinadi, summa/qiymati belgilanadi, POS'da to'lov turi sifatida qabul qilinishi mumkin bo'lsin.
- **SMS/Telegram kampaniyalari:**
  - Mijozlar segmentini tanlash (barchasi / VIP / tug'ilgan kuni bugun bo'lganlar / qarzdorlar),
  - Xabar matni yozish (o'zgaruvchilar bilan: `{ism}`, `{qarz}` kabi),
  - "Yuborish" bosilganda — agar real SMS-shlyuz (masalan Eskiz.uz yoki PlayMobile API) ulanmagan bo'lsa, hozircha `smsCampaigns` kolleksiyasiga yozib, "yuborilgan xabarlar tarixi" sifatida simulyatsiya qil va Sozlamalar bo'limida "SMS provayder ulash" joyini tayyorlab qo'y (API kalitini kiritish maydoni bilan) — bu keyinchalik oson ulanadigan qilib arxitektura qur.
  - **Tug'ilgan kun avtomatik tabrigi** — har kuni tekshiruvchi funksiya (Cloud Function yoki frontendda kunlik tekshiruv) mijozning `birthDate`sini bugungi sana bilan solishtirib, avtomatik SMS navbatiga qo'shadi.

**Firestore maydonlari (`promotions`):**
```
name, type: 'discount'|'bundle'|'carousel'|'receipt', targetProductIds/categoryId,
discountValue, discountType: 'percent'|'amount', startDate, endDate, isActive, createdAt
```

### 3.6 📊 Hisobotlar (Reports) — Billz va 1C uslubida chuqur tahlil

- **Sotuvlar hisoboti** — davr bo'yicha (kun/hafta/oy), chiziqli va ustunli grafiklar, eksport (Excel/PDF).
- **Mahsulotlar bo'yicha hisobot** — eng ko'p va eng kam sotilgan mahsulotlar, ombor aylanmasi.
- **ABC/XYZ tahlil** — mahsulotlarni sotuv hajmi (A/B/C) va barqarorlik (X/Y/Z) bo'yicha avtomatik guruhlash, jadval + rangli matritsa ko'rinishida.
- **Kassirlar/xodimlar bo'yicha hisobot** — har bir xodimning sotuv hajmi, chek soni, o'rtacha chek summasi.
- **Foyda-zarar hisoboti** — `(sellPrice - costPrice) * qty` asosida davr bo'yicha umumiy foyda, xarajatlar ayirilgan holda sof foyda.
- **Mijozlar hisoboti** — eng faol mijozlar, qarzdorlar ro'yxati, yangi mijozlar dinamikasi.
- Har bir hisobot yuqorida sana-oraliq filtri va "Excel'ga eksport" tugmasi bilan bo'lsin (SheetJS/xlsx kutubxonasidan foydalanish mumkin).

### 3.7 💰 Moliyalashtirish (Finance)

- **Kassa harakati (Cash flow)** — barcha kirim (sotuv, qarz to'lovi) va chiqim (xarajat, ta'minotchiga to'lov) yozuvlari xronologik tartibda.
- **Xarajatlar (Expenses)** — kategoriya bo'yicha (ijaraq, kommunal, ish haqi, boshqa), "+ Xarajat qo'shish" tugmasi to'liq ishlaydigan forma bilan (summa, sana, kategoriya, izoh, hujjat rasm biriktirish).
- **Foyda va zarar hisoboti** — vizual grafik (Recharts): tushum vs xarajat vs sof foyda, oylar kesimida.
- **Do'konlar/filiallar bo'yicha moliyaviy taqqoslash** (agar bir nechta filial bo'lsa) — qaysi filial foyda keltirayotgani, qaysisida xarajat ko'proq.
- **Ta'minotchilar bilan hisob-kitob** — har bir ta'minotchiga qarzdorlik/haqdorlik holati, `purchaseOrders` asosida avtomatik hisoblansin.

**Firestore maydonlari (`expenses`):**
```
category, amount, date, note, attachmentUrl, createdBy, createdAt
```

### 3.8 🛡️ Boshqaruv (Staff Management)

- **Xodimlar ro'yxati** — "+ Xodim qo'shish": F.I.O, telefon, login/parol (yoki kassir uchun 4 xonali PIN), rol (Admin/Menejer/Kassir/Ombor mudiri/Buxgalter), filial biriktirish.
- **Rollarga asoslangan huquqlar matritsasi (RBAC)** — har bir rol uchun qaysi bo'limlarga kirish, qaysi amallarni bajarish (masalan faqat admin chegirma % ni o'zgartira oladi) mumkinligini belgilash jadvali. Bu frontendda **route guard** va Firestore Security Rules ikkalasida ham amalga oshirilishi shart (faqat vizual yashirish yetarli emas — xavfsizlik uchun backend qoidalar ham kerak).
- **Faollik jurnali (Activity log)** — kim, qachon, qaysi amalni bajargani (`auditLog` kolleksiyasidan), filtrlanadigan jadval ko'rinishida.
- **Xodim samaradorligi** — har bir xodimning sotuv KPI'lari (Hisobotlar bo'limidagi bilan bog'liq).
- **Ish jadvali/smenalar nazorati** — kim qachon smena ochib-yopgani (`shifts` kolleksiyasidan).

**Firestore maydonlari (`staff`):**
```
fullName, phone, role: 'admin'|'manager'|'cashier'|'warehouse'|'accountant',
pinCode, authUid, warehouseId, isActive, createdAt
```

### 3.9 ⚙️ Sozlamalar (Settings)

- **Do'kon ma'lumotlari** — nomi, manzili, logotipi (chekda chiqadigan), soliq stavkasi.
- **Filiallar/Omborlar boshqaruvi** — qo'shish/tahrirlash.
- **To'lov integratsiyalari** — Click, Payme, OFD (fiskal chek) uchun API kalitlari kiritish maydonlari (hozircha real ulanish bo'lmasa ham, UI va ma'lumotlarni saqlash tayyor bo'lsin).
- **SMS-shlyuz sozlamalari** — provayder tanlash, API token kiritish.
- **Skaner/Printer sozlamalari** — ulangan qurilma turi, chek printer o'lchami (58mm/80mm).
- **Zaxira nusxa olish (Backup)** — asosiy kolleksiyalarni JSON holida eksport qilish tugmasi.
- **Profil va parolni o'zgartirish.**

**Firestore hujjat (`settings/general`):**
```
storeName, address, logoUrl, taxRate, currency: 'UZS',
paymentIntegrations: {click:{}, payme:{}, ofd:{}}, smsProvider: {}
```

---

## 4. TEXNIK BAJARISH TARTIBI (bosqichma-bosqich)

AI koder ishni quyidagi tartibda olib borsin — bu eng kam xatolik bilan eng tez natija beradi:

1. **Auditdan boshla:** har bir sahifa/komponentni ochib, qaysi tugmalar `onClick`siz yoki `console.log` bilan "soxta" ishlayotganini ro'yxatga ol.
2. **Firestore struktura va Security Rules'ni tayyorla** (yuqoridagi kolleksiyalar bo'yicha), rollarga mos `read/write` qoidalarini yoz.
3. **Har bir modul uchun umumiy qayta ishlatiladigan komponentlar yarat:** `<Modal/>`, `<FormInput/>`, `<ConfirmDialog/>`, `<Toast/>`, `<DataTable/>`, `<StatusBadge/>` — bu barcha modullarda bir xil sifatni ta'minlaydi.
4. **Modullarni ushbu tartibda to'ldir:** Mahsulotlar → Mijozlar → Sotuvlar (chunki bu ikkisiga bog'liq) → Moliyalashtirish → Marketing → Boshqaruv → Hisobotlar → Sozlamalar → Dashboard'ni yangi ma'lumotlar bilan bog'lash.
5. **Har bir modulni tugatgach, o'zi qo'lda test qil:** qo'shish, tahrirlash, o'chirish, xato holatlar (bo'sh forma, internet yo'q holati) — barchasini simulyatsiya qilib ko'r.
6. Oxirida **`npm run build`** orqali xatosiz kompilatsiyani tasdiqla.

---

## 5. QABUL QILISH MEZONLARI (Acceptance Checklist)

Ishni "tugadi" deb hisoblashdan oldin quyidagilarning barchasi ✅ bo'lishi shart:

- [ ] Har 9 ta bo'limda kamida bitta "+ Qo'shish" tugmasi bor va u haqiqatan Firestore'ga yangi hujjat yozadi.
- [ ] Har bir ro'yxatda tahrirlash va o'chirish (yoki arxivlash) ishlaydi.
- [ ] Sotuv amalga oshirilganda mahsulot qoldig'i **avtomatik kamayadi**, mijoz balansi/tarixi yangilanadi.
- [ ] "Mijoz qo'shish" tugmasi (asosiy shikoyat qilingan joy) to'liq ishlaydi va yangi mijoz ro'yxatda darhol ko'rinadi.
- [ ] Nasiya (qarz) mantig'i to'liq ishlaydi: qarzga sotish → mijoz profilida qizil ko'rinish → qarzni yopish.
- [ ] Kamida bitta aksiya turi POS'dagi haqiqiy hisob-kitobga ta'sir qiladi (faqat ko'rinish emas).
- [ ] Hisobotlar bo'limi real Firestore ma'lumotlaridan grafik chizadi, statik/mock ma'lumot emas.
- [ ] Rol asosida kirish cheklovlari ishlaydi (kassir bilan kirilganda Sozlamalar yopiq ko'rinadi).
- [ ] Internetsiz holatda dastur qotib qolmaydi, tushunarli xabar chiqaradi.
- [ ] `npm run build` hech qanday xato va warningsiz o'tadi.

---

## 6. ISHNI TOPSHIRISH FORMATI

Ish tugagach, quyidagi qisqa hisobot ber:
1. Qaysi modullar to'liq ishga tushirildi (ro'yxat).
2. Qanday yangi Firestore kolleksiyalar/maydonlar qo'shildi.
3. Hali tugallanmagan yoki keyingi bosqichda (masalan real SMS/OFD integratsiyasi) qilinishi kerak bo'lgan narsalar ro'yxati — aniq va halol.

**Eslatma:** Har qanday noaniqlik yuzaga kelsa (masalan qaysi SMS-provayder ishlatilishi), eng sodda va universal yechimni tanlab davom et, keyin hisobotda shu haqda yoz — ishni to'xtatib savol berib o'tirma.
