// i18n.js — Internationalization module for UI Builder
// Translations are loaded from _locales/<lang>/messages.json (chrome.i18n format)
const I18n = (() => {
  let currentLang = 'vi';

  // Cache for fetched locale data: { vi: {...}, en: {...} }
  const cache = {};

  const promptSuggestions = {
    vi: [
      'Tạo trang landing page cho quán cà phê với màu nâu ấm áp, có hero section, menu sản phẩm dạng card và footer',
      'Tạo trang portfolio cá nhân với thiết kế hiện đại, có hero section, phần giới thiệu, dự án và liên hệ',
      'Tạo dashboard quản lý với sidebar, biểu đồ thống kê, bảng dữ liệu và thông báo',
      'Tạo trang e-commerce với sản phẩm nổi bật, giỏ hàng, bộ lọc và thanh tìm kiếm',
      'Tạo form đăng nhập và đăng ký với validation, hiệu ứng chuyển đổi mượt mà',
      'Tạo trang giới thiệu công ty với timeline, đội ngũ nhân sự và đối tác',
      'Tạo trang menu nhà hàng với danh mục món ăn, giá và mô tả hấp dẫn',
      'Tạo trang blog với sidebar, bài viết nổi bật, phân trang và tag',
      'Tạo pricing table so sánh 3 gói dịch vụ với nút đăng ký',
      'Tạo trang weather app hiển thị thời tiết theo thành phố với icon và animation',
      'Tạo trang quản lý todo list với thêm, xóa, đánh dấu hoàn thành và bộ lọc',
      'Tạo trang calculator máy tính với giao diện đẹp và các phép tính cơ bản',
      'Tạo trang FAQ với accordion mở rộng/thu gọn và thanh tìm kiếm',
      'Tạo trang gallery ảnh với lightbox, grid layout responsive và hiệu ứng hover',
      'Tạo trang countdown timer đếm ngược sự kiện với thiết kế nổi bật',
      'Tạo trang đặt bàn nhà hàng với form chọn ngày, giờ, số khách và ghi chú',
      'Tạo trang giới thiệu khách sạn với phòng, tiện nghi, đánh giá và đặt phòng',
      'Tạo trang bán hàng thời trang với banner sale, sản phẩm hot và bộ lọc kích cỡ',
      'Tạo trang quản lý dự án kiểu Kanban với cột Todo, In Progress, Done',
      'Tạo trang đăng nhập admin dashboard với form xác thực và giao diện tối giản',
      'Tạo trang tin tức với bài viết nổi bật, sidebar danh mục và phân trang',
      'Tạo trang fitness tracker với biểu đồ tiến trình, mục tiêu và lịch tập',
      'Tạo trang recipe book với công thức nấu ăn, nguyên liệu và hướng dẫn từng bước',
      'Tạo trang music player với playlist, controls và thanh tiến trình',
      'Tạo trang chat messenger với danh sách hội thoại, tin nhắn và input gửi',
      'Tạo trang event invitation với countdown, thông tin sự kiện và RSVP form',
      'Tạo trang resume CV online với timeline kinh nghiệm, kỹ năng và liên hệ',
      'Tạo trang quiz game với câu hỏi, đáp án, điểm số và màn hình kết quả',
      'Tạo trang booking spa với dịch vụ, chọn thời gian và thanh toán',
      'Tạo trang social media profile với avatar, bio, bài đăng và followers',
    ],
    en: [
      'Create a landing page for a coffee shop with warm brown tones, hero section, product cards menu and footer',
      'Create a personal portfolio with modern design, hero section, about section, projects and contact',
      'Create an admin dashboard with sidebar, statistics charts, data table and notifications',
      'Create an e-commerce page with featured products, cart, filters and search bar',
      'Create a login and registration form with validation, smooth transition effects',
      'Create a company about page with timeline, team members and partners',
      'Create a restaurant menu page with food categories, prices and appetizing descriptions',
      'Create a blog page with sidebar, featured posts, pagination and tags',
      'Create a pricing table comparing 3 service plans with sign-up buttons',
      'Create a weather app page showing weather by city with icons and animations',
      'Create a todo list manager with add, delete, mark complete and filters',
      'Create a calculator app with beautiful design and basic operations',
      'Create an FAQ page with expandable/collapsible accordion and search bar',
      'Create a photo gallery with lightbox, responsive grid layout and hover effects',
      'Create a countdown timer page for events with eye-catching design',
      'Create a restaurant booking page with date, time, guests and notes form',
      'Create a hotel page with rooms, amenities, reviews and booking form',
      'Create a fashion store page with sale banner, hot products and size filters',
      'Create a Kanban project board with Todo, In Progress and Done columns',
      'Create an admin login page with authentication form and minimal design',
      'Create a news page with featured articles, category sidebar and pagination',
      'Create a fitness tracker with progress charts, goals and workout schedule',
      'Create a recipe book with cooking instructions, ingredients and step-by-step guide',
      'Create a music player with playlist, controls and progress bar',
      'Create a chat messenger with conversation list, messages and send input',
      'Create an event invitation with countdown, event info and RSVP form',
      'Create an online resume/CV with experience timeline, skills and contact',
      'Create a quiz game with questions, answers, scores and results screen',
      'Create a spa booking page with services, time selection and payment',
      'Create a social media profile with avatar, bio, posts and followers',
    ]
  };

  /**
   * Fetch and cache a locale's messages.json file.
   */
  async function loadLocale(lang) {
    if (cache[lang]) return cache[lang];
    try {
      const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
      const response = await fetch(url);
      const data = await response.json();
      cache[lang] = data;
      return data;
    } catch (e) {
      console.error(`Failed to load locale: ${lang}`, e);
      cache[lang] = {};
      return {};
    }
  }

  /**
   * Convert dot-notation key to underscore key for messages.json lookup.
   * "status.geminiConnected" -> "status_geminiConnected"
   */
  function normalizeKey(key) {
    return key.replace(/\./g, '_');
  }

  /**
   * Translate a key, with optional parameter substitution.
   * Looks up in currentLang first, falls back to 'en', then returns the key itself.
   * Placeholders use $paramName$ format (chrome.i18n style).
   */
  function t(key, params) {
    const nk = normalizeKey(key);
    const entry = (cache[currentLang] && cache[currentLang][nk])
               || (cache['en'] && cache['en'][nk]);

    let str = entry ? entry.message : key;

    if (params) {
      for (const k in params) {
        str = str.replace(new RegExp('\\$' + k + '\\$', 'g'), params[k]);
      }
    }
    return str;
  }

  function getSuggestions() {
    return promptSuggestions[currentLang] || promptSuggestions['en'];
  }

  function getLang() {
    return currentLang;
  }

  async function setLang(lang) {
    currentLang = lang;
    await loadLocale(lang);
    applyToDOM();
    document.body.setAttribute('data-lang', lang);
    chrome.storage.local.set({ appLanguage: lang });
  }

  function applyToDOM() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      el.title = t(el.getAttribute('data-i18n-title'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    document.documentElement.lang = currentLang;
  }

  /**
   * Initialize: determine language, preload both locales, apply to DOM.
   * Both locales are preloaded so t() is always synchronous after init.
   */
  async function init() {
    const result = await chrome.storage.local.get('appLanguage');
    if (result.appLanguage) {
      currentLang = result.appLanguage;
    } else {
      const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
      currentLang = browserLang.startsWith('vi') ? 'vi' : 'en';
    }

    // Preload both locales so t() never needs to be async
    await Promise.all([loadLocale('vi'), loadLocale('en')]);

    applyToDOM();
    document.body.setAttribute('data-lang', currentLang);
    return currentLang;
  }

  return { init, t, setLang, getLang, getSuggestions, applyToDOM };
})();
