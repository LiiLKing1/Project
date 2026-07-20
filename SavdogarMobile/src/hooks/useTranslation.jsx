import { useSettings } from '../context/SettingsContext';

const translations = {
  uz: {
    dashboard: "Bosh Sahifa",
    products: "Mahsulotlar",
    sales: "Sotuv Oynasi",
    customers: "Mijozlar",
    orders: "Buyurtmalar",
    marketing: "Marketing",
    reports: "Hisobotlar",
    finance: "Moliya",
    management: "Boshqaruv",
    settings: "Sozlamalar",
    save: "Saqlash",
    cancel: "Bekor qilish",
    delete: "O'chirish",
    edit: "Tahrirlash",
    add: "Qo'shish",
    search: "Qidirish...",
    general: "Umumiy",
    language: "Til",
    currency: "Asosiy valyuta",
    theme: "Mavzu",
    light: "Yorug'",
    dark: "Qorong'i",
    usd_rate: "USD kursi (UZS)",
    rub_rate: "RUB kursi (UZS)",
    show_usd_conversion: "Summa tagida UZS konvertatsiyasini ko'rsatish (Faqat USD dagi tovarlar uchun)"
  },
  ru: {
    dashboard: "Главная",
    products: "Товары",
    sales: "Касса (POS)",
    customers: "Клиенты",
    orders: "Заказы",
    marketing: "Маркетинг",
    reports: "Отчеты",
    finance: "Финансы",
    management: "Управление",
    settings: "Настройки",
    save: "Сохранить",
    cancel: "Отмена",
    delete: "Удалить",
    edit: "Изменить",
    add: "Добавить",
    search: "Поиск...",
    general: "Общие",
    language: "Язык",
    currency: "Основная валюта",
    theme: "Тема",
    light: "Светлая",
    dark: "Темная",
    usd_rate: "Курс USD",
    rub_rate: "Курс RUB",
    show_usd_conversion: "Показать конвертацию UZS под суммой (только для USD)"
  },
  en: {
    dashboard: "Dashboard",
    products: "Products",
    sales: "Point of Sale",
    customers: "Customers",
    orders: "Orders",
    marketing: "Marketing",
    reports: "Reports",
    finance: "Finance",
    management: "Management",
    settings: "Settings",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    search: "Search...",
    general: "General",
    language: "Language",
    currency: "Main Currency",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    usd_rate: "USD Rate (UZS)",
    rub_rate: "RUB Rate (UZS)",
    show_usd_conversion: "Show UZS conversion under amount (Only for USD)"
  }
};

export const useTranslation = () => {
  const { settings } = useSettings();
  const lang = settings.language || 'uz';

  const t = (key) => {
    return translations[lang]?.[key] || translations['uz'][key] || key;
  };

  return { t, lang };
};
