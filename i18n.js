// i18n.js — Internationalization module for UI Builder
const I18n = (() => {
  let currentLang = 'vi';

  const translations = {
    vi: {
      // App
      'app.title': 'UI Builder với Gemini AI',

      // Deploy
      'deploy.button': 'Triển khai',
      'deploy.title': 'Triển khai lên Netlify',

      // Preview panel
      'preview.heading': 'Xem trước',
      'inspect.title': 'Kiểm tra & Chọn phần tử',
      'refresh.title': 'Làm mới',
      'openTab.title': 'Mở tab mới',
      'download.title': 'Tải xuống',
      'copyHtml.title': 'Sao chép HTML',

      // Netlify panel
      'netlify.label': 'Kết nối Netlify để triển khai',
      'netlify.step1': 'Bước 1: Mở Netlify',
      'netlify.step1Hint': 'Tạo token tại mục Personal Access Tokens',
      'netlify.step2Placeholder': 'Bước 2: Dán token vào đây...',
      'netlify.connect': 'Kết nối',
      'netlify.closeTitle': 'Đóng',
      'netlify.liveLabel': 'Live',
      'netlify.copyUrlTitle': 'Sao chép URL',
      'netlify.disconnectTitle': 'Ngắt kết nối Netlify',

      // Selected element
      'editing.label': 'Đang chỉnh sửa:',
      'editing.clearTitle': 'Bỏ chọn',

      // Device toolbar
      'device.desktop': 'Desktop (100%)',
      'device.tablet': 'Tablet (768px)',
      'device.mobile': 'Mobile (375px)',
      'device.desktopLabel': 'Desktop',
      'device.tabletLabel': 'Tablet (768px)',
      'device.mobileLabel': 'Mobile (375px)',

      // Pages section
      'pages.heading': 'Trang',
      'pages.newTitle': 'Tạo trang mới',
      'pages.newBtn': 'Mới',

      // History section
      'history.heading': 'Lịch sử',
      'history.clearTitle': 'Xóa lịch sử',

      // Prompt section
      'prompt.heading': 'Mô tả HTML',
      'prompt.editModeLabel': 'Chế độ sửa phần tử',
      'prompt.placeholder': 'Ví dụ: Tạo trang landing page cho quán cà phê với màu nâu ấm áp, có hero section với hình nền gradient, menu sản phẩm dạng card, và footer với thông tin liên hệ...',
      'prompt.editPlaceholder': 'Mô tả thay đổi cho <${tagName}>. Ví dụ: "Đổi màu nền sang xanh", "Thêm animation fade-in", "Thêm 2 card mới"...',

      // Model toggle
      'model.title': 'Chế độ AI',
      'model.fast': 'Nhanh',
      'model.thinking': 'Tư duy',

      // Generate button
      'generate.btn': 'Tạo HTML',
      'generate.loading': 'Đang tạo...',
      'generate.editBtn': 'Chỉnh sửa',

      // Link modal
      'linkModal.title': 'Tạo trang mới',
      'linkModal.descBefore': 'Trang ',
      'linkModal.descAfter': ' chưa tồn tại.',
      'linkModal.descPrompt': 'Mô tả nội dung bạn muốn tạo:',
      'linkModal.placeholder': 'Ví dụ: Trang giới thiệu với thông tin công ty, đội ngũ, tầm nhìn...',
      'linkModal.cancel': 'Hủy',
      'linkModal.confirm': 'Tạo trang',
      'linkModal.defaultPrompt': 'Tạo trang ${name}',
      'linkModal.promptSuffix': '. Giữ nguyên toàn bộ style, header, footer, nav. Thay nội dung chính thành nội dung phù hợp.',

      // Status / Toast messages
      'status.geminiConnected': 'Đã kết nối Gemini',
      'status.geminiDisconnected': 'Chưa kết nối Gemini',
      'status.geminiOpening': 'Đang mở Gemini...',
      'status.geminiConnecting': 'Đang kết nối Gemini...',
      'status.geminiConnectFailed': 'Không thể kết nối Gemini. Vui lòng thử lại.',
      'status.geminiConnectionError': 'Lỗi kết nối: ${message}',
      'status.geminiCannotConnect': 'Không thể kết nối Gemini',
      'status.tokenRequired': 'Vui lòng nhập token',
      'status.netlifyConnected': 'Đã kết nối Netlify',
      'status.urlCopied': 'Đã copy URL',
      'status.urlCopyFailed': 'Không thể sao chép URL',
      'status.netlifyDisconnected': 'Đã ngắt kết nối Netlify',
      'status.pageCreated': 'Đã tạo Trang ${pageNumber}',
      'status.pageCreateFailed': 'Không thể tạo trang mới',
      'status.pageSelectFailed': 'Không thể chọn trang',
      'status.pageDeleted': 'Đã xóa trang',
      'status.pageDeleteFailed': 'Không thể xóa trang',
      'status.pagesEmpty': 'Chưa có trang nào',
      'status.historyEmpty': 'Chưa có lịch sử',
      'status.historyNoData': 'Không có dữ liệu HTML trong mục này',
      'status.historyLoadFailed': 'Không thể tải lịch sử',
      'status.historyItemDeleted': 'Đã xóa',
      'status.historyItemDeleteFailed': 'Không thể xóa',
      'status.historyCleared': 'Đã xóa toàn bộ lịch sử',
      'status.historyClearFailed': 'Không thể xóa lịch sử',
      'status.noPageSelected': 'Vui lòng chọn hoặc tạo trang trước',
      'status.promptRequired': 'Vui lòng nhập mô tả',
      'status.editingElement': 'Đang chỉnh sửa phần tử...',
      'status.sendingToGemini': 'Đang gửi yêu cầu đến Gemini...',
      'status.elementNotFound': 'Không tìm thấy phần tử đã chọn, sẽ tạo mới toàn bộ',
      'status.extractFailed': 'Không thể trích xuất nội dung HTML từ phản hồi AI',
      'status.elementUpdated': 'Đã cập nhật phần tử thành công!',
      'status.elementUpdateNotFound': 'Không tìm thấy phần tử để cập nhật',
      'status.elementUpdateError': 'Lỗi cập nhật phần tử: ${message}',
      'status.htmlGenerated': 'Tạo HTML thành công!',
      'status.htmlExtractFailed': 'Không thể trích xuất HTML',
      'status.previewRefreshed': 'Đã làm mới preview',
      'status.noHtmlToOpen': 'Không có HTML để mở',
      'status.noHtmlToDownload': 'Không có HTML để tải',
      'status.htmlDownloaded': 'Đã tải xuống HTML',
      'status.noHtmlToCopy': 'Không có HTML để copy',
      'status.htmlCopied': 'Đã sao chép HTML vào clipboard',
      'status.htmlCopyFailed': 'Không thể sao chép HTML',
      'status.inspectMode': '🎯 Chế độ Inspect: Click vào phần tử trong preview để chọn',
      'status.selectionCleared': 'Đã bỏ chọn phần tử',
      'status.noContentToDeploy': 'Không có trang nào có nội dung để triển khai',
      'status.deploying': 'Đang triển khai ${count} trang lên Netlify...',
      'status.creatingSite': 'Đang tạo site mới trên Netlify...',
      'status.uploadingPages': 'Đang tải lên ${count} trang...',
      'status.deploySuccess': 'Triển khai thành công! ${count} trang đã được publish.',
      'status.tokenInvalid': 'Token không hợp lệ hoặc đã hết hạn. Vui lòng kết nối lại.',
      'status.siteDeleted': 'Site đã bị xóa, đang tạo lại...',
      'status.deployFailed': 'Không thể triển khai: ${message}',
      'status.deployError': 'Lỗi triển khai: ${message}',
      'status.invalidLink': 'Liên kết không hợp lệ',
      'status.navigatedToPage': 'Đã chuyển sang trang "${name}"',
      'status.creatingPageContent': 'Đã tạo trang "${name}", đang tạo nội dung...',
      'status.createLinkedPageFailed': 'Không thể tạo trang mới',

      // Confirm dialogs
      'confirm.disconnectNetlify': 'Ngắt kết nối Netlify? Token sẽ bị xóa.',
      'confirm.deletePage': 'Bạn có chắc muốn xóa trang này và toàn bộ lịch sử?',
      'confirm.clearHistory': 'Bạn có chắc muốn xóa toàn bộ lịch sử của trang này?',

      // Empty preview
      'preview.emptyTitle': 'Nhập prompt để tạo HTML',
      'preview.emptySubtitle': 'Kết nối với Gemini và bắt đầu sáng tạo',

      // Date formatting
      'date.justNow': 'Vừa xong',
      'date.minutes': '${n} phút',
      'date.hours': '${n} giờ',
      'date.days': '${n} ngày',
      'date.locale': 'vi-VN',

      // Dynamic element titles
      'page.deleteTitle': 'Xóa trang',
      'history.deleteItemTitle': 'Xóa',

      // Revert / history load
      'status.revertedTo': 'Đã revert về: "${prompt}". Prompt tiếp theo sẽ tiếp tục từ phiên bản này.',
      'status.loadedFromHistory': 'Đã tải HTML từ lịch sử',

      // Generating placeholder
      'prompt.generatingPlaceholder': 'Đang tạo HTML...',

      // Selected element
      'status.selectedElement': 'Đã chọn: <${tagName}>. Nhập yêu cầu chỉnh sửa.',

      // Link fallback
      'linkModal.newPageFallback': 'Trang Mới',

      // AI suggestion system prompts
      'ai.suggestSystemPrompt': 'You are an autocomplete assistant for a UI generation tool. Complete the user\'s partial Vietnamese prompt. Return ONLY the completion text (the part after what they typed). Keep it concise (<80 chars). If you cannot complete, return: NONE',
      'ai.suggestLang': 'Vietnamese',
    },

    en: {
      // App
      'app.title': 'UI Builder with Gemini AI',

      // Deploy
      'deploy.button': 'Deploy',
      'deploy.title': 'Deploy to Netlify',

      // Preview panel
      'preview.heading': 'Preview',
      'inspect.title': 'Inspect & Select element',
      'refresh.title': 'Refresh',
      'openTab.title': 'Open in new tab',
      'download.title': 'Download',
      'copyHtml.title': 'Copy HTML',

      // Netlify panel
      'netlify.label': 'Connect Netlify to deploy',
      'netlify.step1': 'Step 1: Open Netlify',
      'netlify.step1Hint': 'Create token under Personal Access Tokens',
      'netlify.step2Placeholder': 'Step 2: Paste token here...',
      'netlify.connect': 'Connect',
      'netlify.closeTitle': 'Close',
      'netlify.liveLabel': 'Live',
      'netlify.copyUrlTitle': 'Copy URL',
      'netlify.disconnectTitle': 'Disconnect Netlify',

      // Selected element
      'editing.label': 'Editing:',
      'editing.clearTitle': 'Deselect',

      // Device toolbar
      'device.desktop': 'Desktop (100%)',
      'device.tablet': 'Tablet (768px)',
      'device.mobile': 'Mobile (375px)',
      'device.desktopLabel': 'Desktop',
      'device.tabletLabel': 'Tablet (768px)',
      'device.mobileLabel': 'Mobile (375px)',

      // Pages section
      'pages.heading': 'Pages',
      'pages.newTitle': 'Create new page',
      'pages.newBtn': 'New',

      // History section
      'history.heading': 'History',
      'history.clearTitle': 'Clear history',

      // Prompt section
      'prompt.heading': 'Describe HTML',
      'prompt.editModeLabel': 'Element edit mode',
      'prompt.placeholder': 'E.g.: Create a landing page for a coffee shop with warm brown tones, a hero section with gradient background, product cards menu, and a footer with contact info...',
      'prompt.editPlaceholder': 'Describe changes for <${tagName}>. E.g.: "Change background to blue", "Add fade-in animation", "Add 2 new cards"...',

      // Model toggle
      'model.title': 'AI mode',
      'model.fast': 'Fast',
      'model.thinking': 'Think',

      // Generate button
      'generate.btn': 'Generate',
      'generate.loading': 'Generating...',
      'generate.editBtn': 'Edit',

      // Link modal
      'linkModal.title': 'Create new page',
      'linkModal.descBefore': 'Page ',
      'linkModal.descAfter': ' does not exist.',
      'linkModal.descPrompt': 'Describe the content you want to create:',
      'linkModal.placeholder': 'E.g.: About page with company info, team, vision...',
      'linkModal.cancel': 'Cancel',
      'linkModal.confirm': 'Create page',
      'linkModal.defaultPrompt': 'Create page ${name}',
      'linkModal.promptSuffix': '. Keep all existing styles, header, footer, nav. Replace main content with appropriate content.',

      // Status / Toast messages
      'status.geminiConnected': 'Connected to Gemini',
      'status.geminiDisconnected': 'Not connected to Gemini',
      'status.geminiOpening': 'Opening Gemini...',
      'status.geminiConnecting': 'Connecting to Gemini...',
      'status.geminiConnectFailed': 'Cannot connect to Gemini. Please try again.',
      'status.geminiConnectionError': 'Connection error: ${message}',
      'status.geminiCannotConnect': 'Cannot connect to Gemini',
      'status.tokenRequired': 'Please enter a token',
      'status.netlifyConnected': 'Connected to Netlify',
      'status.urlCopied': 'URL copied',
      'status.urlCopyFailed': 'Cannot copy URL',
      'status.netlifyDisconnected': 'Disconnected from Netlify',
      'status.pageCreated': 'Created Page ${pageNumber}',
      'status.pageCreateFailed': 'Cannot create new page',
      'status.pageSelectFailed': 'Cannot select page',
      'status.pageDeleted': 'Page deleted',
      'status.pageDeleteFailed': 'Cannot delete page',
      'status.pagesEmpty': 'No pages yet',
      'status.historyEmpty': 'No history yet',
      'status.historyNoData': 'No HTML data in this entry',
      'status.historyLoadFailed': 'Cannot load history',
      'status.historyItemDeleted': 'Deleted',
      'status.historyItemDeleteFailed': 'Cannot delete',
      'status.historyCleared': 'All history cleared',
      'status.historyClearFailed': 'Cannot clear history',
      'status.noPageSelected': 'Please select or create a page first',
      'status.promptRequired': 'Please enter a description',
      'status.editingElement': 'Editing element...',
      'status.sendingToGemini': 'Sending request to Gemini...',
      'status.elementNotFound': 'Selected element not found, will regenerate entire page',
      'status.extractFailed': 'Cannot extract HTML content from AI response',
      'status.elementUpdated': 'Element updated successfully!',
      'status.elementUpdateNotFound': 'Element not found for update',
      'status.elementUpdateError': 'Element update error: ${message}',
      'status.htmlGenerated': 'HTML generated successfully!',
      'status.htmlExtractFailed': 'Cannot extract HTML',
      'status.previewRefreshed': 'Preview refreshed',
      'status.noHtmlToOpen': 'No HTML to open',
      'status.noHtmlToDownload': 'No HTML to download',
      'status.htmlDownloaded': 'HTML downloaded',
      'status.noHtmlToCopy': 'No HTML to copy',
      'status.htmlCopied': 'HTML copied to clipboard',
      'status.htmlCopyFailed': 'Cannot copy HTML',
      'status.inspectMode': '🎯 Inspect Mode: Click an element in the preview to select it',
      'status.selectionCleared': 'Selection cleared',
      'status.noContentToDeploy': 'No pages with content to deploy',
      'status.deploying': 'Deploying ${count} pages to Netlify...',
      'status.creatingSite': 'Creating new site on Netlify...',
      'status.uploadingPages': 'Uploading ${count} pages...',
      'status.deploySuccess': 'Deploy successful! ${count} pages published.',
      'status.tokenInvalid': 'Token is invalid or expired. Please reconnect.',
      'status.siteDeleted': 'Site was deleted, recreating...',
      'status.deployFailed': 'Cannot deploy: ${message}',
      'status.deployError': 'Deploy error: ${message}',
      'status.invalidLink': 'Invalid link',
      'status.navigatedToPage': 'Switched to page "${name}"',
      'status.creatingPageContent': 'Created page "${name}", generating content...',
      'status.createLinkedPageFailed': 'Cannot create new page',

      // Confirm dialogs
      'confirm.disconnectNetlify': 'Disconnect Netlify? Token will be removed.',
      'confirm.deletePage': 'Are you sure you want to delete this page and all its history?',
      'confirm.clearHistory': 'Are you sure you want to clear all history for this page?',

      // Empty preview
      'preview.emptyTitle': 'Enter a prompt to generate HTML',
      'preview.emptySubtitle': 'Connect to Gemini and start creating',

      // Date formatting
      'date.justNow': 'Just now',
      'date.minutes': '${n}m ago',
      'date.hours': '${n}h ago',
      'date.days': '${n}d ago',
      'date.locale': 'en-US',

      // Dynamic element titles
      'page.deleteTitle': 'Delete page',
      'history.deleteItemTitle': 'Delete',

      // Revert / history load
      'status.revertedTo': 'Reverted to: "${prompt}". Next prompt will continue from this version.',
      'status.loadedFromHistory': 'Loaded HTML from history',

      // Generating placeholder
      'prompt.generatingPlaceholder': 'Generating HTML...',

      // Selected element
      'status.selectedElement': 'Selected: <${tagName}>. Enter edit request.',

      // Link fallback
      'linkModal.newPageFallback': 'New Page',

      // AI suggestion system prompts
      'ai.suggestSystemPrompt': 'You are an autocomplete assistant for a UI generation tool. Complete the user\'s partial English prompt. Return ONLY the completion text (the part after what they typed). Keep it concise (<80 chars). If you cannot complete, return: NONE',
      'ai.suggestLang': 'English',
    }
  };

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

  function t(key, params) {
    let str = (translations[currentLang] && translations[currentLang][key])
           || (translations['en'] && translations['en'][key])
           || key;
    if (params) {
      for (const k in params) {
        str = str.replace(new RegExp('\\$\\{' + k + '\\}', 'g'), params[k]);
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

  function setLang(lang) {
    currentLang = lang;
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

  function init() {
    return new Promise((resolve) => {
      chrome.storage.local.get('appLanguage', (result) => {
        if (result.appLanguage) {
          currentLang = result.appLanguage;
        } else {
          const browserLang = navigator.language || (navigator.languages && navigator.languages[0]) || 'en';
          currentLang = browserLang.startsWith('vi') ? 'vi' : 'en';
        }
        applyToDOM();
        document.body.setAttribute('data-lang', currentLang);
        resolve(currentLang);
      });
    });
  }

  return { init, t, setLang, getLang, getSuggestions, applyToDOM };
})();
