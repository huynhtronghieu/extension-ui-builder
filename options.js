// Options Page Controller
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize database
  await htmlDB.init();

  // DOM Elements
  const elements = {
    // Page section
    pageList: document.getElementById('pageList'),
    newPageBtn: document.getElementById('newPageBtn'),
    // History section
    historyList: document.getElementById('historyList'),
    clearHistory: document.getElementById('clearHistory'),
    // Prompt section
    promptInput: document.getElementById('promptInput'),
    modelToggle: document.getElementById('modelToggle'),
    generateBtn: document.getElementById('generateBtn'),
    // Preview
    previewFrame: document.getElementById('previewFrame'),
    refreshPreview: document.getElementById('refreshPreview'),
    openNewTab: document.getElementById('openNewTab'),
    downloadHtml: document.getElementById('downloadHtml'),
    copyHtml: document.getElementById('copyHtml'),
    status: document.getElementById('status'),
    // Inspect mode elements
    inspectBtn: document.getElementById('inspectBtn'),
    selectedElementInfo: document.getElementById('selectedElementInfo'),
    selectedSelector: document.getElementById('selectedSelector'),
    clearSelection: document.getElementById('clearSelection'),
    editModeLabel: document.getElementById('editModeLabel'),
    // Ghost text elements
    promptGhost: document.getElementById('promptGhost'),
    ghostTyped: document.getElementById('ghostTyped'),
    ghostSuggestion: document.getElementById('ghostSuggestion'),
    // Netlify deploy elements
    deployBtn: document.getElementById('deployBtn'),
    netlifyPanel: document.getElementById('netlifyPanel'),
    netlifyTokenInput: document.getElementById('netlifyTokenInput'),
    netlifyConnectBtn: document.getElementById('netlifyConnectBtn'),
    netlifyOpenBtn: document.getElementById('netlifyOpenBtn'),
    netlifyPanelClose: document.getElementById('netlifyPanelClose'),
    deployedUrlBar: document.getElementById('deployedUrlBar'),
    deployedUrl: document.getElementById('deployedUrl'),
    copyDeployedUrl: document.getElementById('copyDeployedUrl'),
    disconnectNetlify: document.getElementById('disconnectNetlify'),
    // Link navigation modal
    linkModal: document.getElementById('linkModal'),
    linkModalPageName: document.getElementById('linkModalPageName'),
    linkModalCancel: document.getElementById('linkModalCancel'),
    linkModalConfirm: document.getElementById('linkModalConfirm'),
    // Link modal prompt elements
    linkModalPromptInput: document.getElementById('linkModalPromptInput'),
    linkModalPromptGhost: document.getElementById('linkModalPromptGhost'),
    linkModalGhostTyped: document.getElementById('linkModalGhostTyped'),
    linkModalGhostSuggestion: document.getElementById('linkModalGhostSuggestion')
  };

  let currentHTML = '';
  let isConnected = false;
  let currentPageId = null; // Current active page
  
  // Revert state - tracks when user loads a previous history item
  let isReverted = false;
  let revertedFromPrompt = ''; // The prompt of the history item that was loaded
  let latestHistoryId = null;  // The ID of the most recent history item
  
  // Generation state
  let isGenerating = false;
  let lastPromptText = ''; // Store prompt text before clearing input
  
  // Inspect mode state
  let isInspectMode = false;
  let selectedElement = null;
  let selectedPath = null; // CSS selector path to the element

  // Sandbox configuration
  const SANDBOX_URL = 'https://sandbox.hieu.website';
  let sandboxState = 'loading'; // 'loading' | 'ready' | 'writing'
  let messageQueue = [];
  let pendingRequests = {};
  let requestCounter = 0;
  let pendingAfterReady = [];

  // Netlify deploy state
  let netlifyToken = null;

  // Link navigation modal state
  let pendingLinkPageName = null;
  let designContextHTML = '';
  let isLinkModalGhostActive = false;
  let modalSuggestionSource = null;

  // Debounce utility
  function debounce(fn, delay) {
    let timer = null;
    const debounced = (...args) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { timer = null; fn(...args); }, delay);
    };
    debounced.cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
    return debounced;
  }

  // Inline suggestion (ghost text) for prompt input
  const PROMPT_SUGGESTIONS = [
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
  ];

  // AI suggestion state
  let aiSuggestionPending = false;
  let aiSuggestionRequestId = 0;
  let currentSuggestionSource = null; // 'prefix' | 'ai' | null
  const aiSuggestionCache = new Map();
  const AI_CACHE_MAX = 50;

  // Find matching suggestion for current input text (prefix matching)
  function findSuggestion(text) {
    if (!text || text.length < 2) return null;
    const lower = text.toLowerCase();
    for (const suggestion of PROMPT_SUGGESTIONS) {
      if (suggestion.toLowerCase().startsWith(lower) && suggestion.length > text.length) {
        return suggestion;
      }
    }
    return null;
  }

  // Update ghost text display
  function updateGhostText() {
    const text = elements.promptInput.value;
    const suggestion = findSuggestion(text);
    if (suggestion && !elements.promptInput.disabled) {
      elements.ghostTyped.textContent = text;
      elements.ghostSuggestion.textContent = suggestion.substring(text.length);
      elements.ghostSuggestion.classList.remove('ai-loading');
      elements.promptGhost.scrollTop = elements.promptInput.scrollTop;
      currentSuggestionSource = 'prefix';
      cancelAISuggestion();
    } else {
      clearGhostText();
      scheduleAISuggestion(text);
    }
  }

  // Clear ghost text
  function clearGhostText() {
    elements.ghostTyped.textContent = '';
    elements.ghostSuggestion.textContent = '';
    elements.ghostSuggestion.classList.remove('ai-loading');
    currentSuggestionSource = null;
  }

  // Cancel any pending AI suggestion
  function cancelAISuggestion() {
    debouncedAISuggestion.cancel();
    aiSuggestionRequestId++;
    if (aiSuggestionPending) {
      aiSuggestionPending = false;
      if (isLinkModalGhostActive) {
        if (modalSuggestionSource === 'ai-loading') {
          clearModalGhostText();
        }
      } else {
        if (currentSuggestionSource === 'ai-loading') {
          clearGhostText();
        }
      }
    }
  }

  // Schedule an AI suggestion (debounced)
  function scheduleAISuggestion(text) {
    if (!text || text.trim().length < 5) {
      cancelAISuggestion();
      return;
    }
    if (isGenerating || !isConnected) return;
    isLinkModalGhostActive = false;
    debouncedAISuggestion(text.trim());
  }

  // Request AI suggestion (called after debounce)
  function requestAISuggestion(text) {
    const cacheKey = text.toLowerCase();
    if (aiSuggestionCache.has(cacheKey)) {
      if (isLinkModalGhostActive) {
        showModalAISuggestion(text, aiSuggestionCache.get(cacheKey));
      } else {
        showAISuggestion(text, aiSuggestionCache.get(cacheKey));
      }
      return;
    }

    aiSuggestionPending = true;

    if (isLinkModalGhostActive) {
      modalSuggestionSource = 'ai-loading';
      elements.linkModalGhostTyped.textContent = text;
      elements.linkModalGhostSuggestion.textContent = '...';
      elements.linkModalGhostSuggestion.classList.add('ai-loading');
    } else {
      currentSuggestionSource = 'ai-loading';
      elements.ghostTyped.textContent = text;
      elements.ghostSuggestion.textContent = '...';
      elements.ghostSuggestion.classList.add('ai-loading');
    }

    const requestId = ++aiSuggestionRequestId;
    chrome.runtime.sendMessage({
      type: 'SUGGEST_COMPLETION',
      text: text,
      requestId: requestId
    });
  }

  // Display AI suggestion result
  function showAISuggestion(inputText, completion) {
    const currentText = elements.promptInput.value.trim();
    if (currentText !== inputText) return;
    if (elements.promptInput.disabled) return;

    aiSuggestionPending = false;
    elements.ghostSuggestion.classList.remove('ai-loading');

    if (completion) {
      // If completion starts with the input, strip the overlap
      let suffix = completion;
      if (suffix.toLowerCase().startsWith(inputText.toLowerCase())) {
        suffix = suffix.substring(inputText.length);
      }
      // Ensure it starts with a space if needed
      if (suffix && !suffix.startsWith(' ') && !inputText.endsWith(' ')) {
        suffix = ' ' + suffix;
      }
      elements.ghostTyped.textContent = currentText;
      elements.ghostSuggestion.textContent = suffix;
      currentSuggestionSource = 'ai';
    } else {
      clearGhostText();
    }
  }

  const debouncedAISuggestion = debounce(requestAISuggestion, 800);

  // Modal ghost text functions
  function updateModalGhostText() {
    const text = elements.linkModalPromptInput.value;
    const suggestion = findSuggestion(text);
    if (suggestion && !elements.linkModalPromptInput.disabled) {
      elements.linkModalGhostTyped.textContent = text;
      elements.linkModalGhostSuggestion.textContent = suggestion.substring(text.length);
      elements.linkModalGhostSuggestion.classList.remove('ai-loading');
      elements.linkModalPromptGhost.scrollTop = elements.linkModalPromptInput.scrollTop;
      modalSuggestionSource = 'prefix';
      cancelAISuggestion();
    } else {
      clearModalGhostText();
      if (text && text.trim().length >= 5 && !isGenerating && isConnected) {
        isLinkModalGhostActive = true;
        debouncedAISuggestion(text.trim());
      }
    }
  }

  function clearModalGhostText() {
    elements.linkModalGhostTyped.textContent = '';
    elements.linkModalGhostSuggestion.textContent = '';
    elements.linkModalGhostSuggestion.classList.remove('ai-loading');
    modalSuggestionSource = null;
  }

  function showModalAISuggestion(inputText, completion) {
    const currentText = elements.linkModalPromptInput.value.trim();
    if (currentText !== inputText) return;
    if (elements.linkModalPromptInput.disabled) return;

    aiSuggestionPending = false;
    elements.linkModalGhostSuggestion.classList.remove('ai-loading');

    if (completion) {
      let suffix = completion;
      if (suffix.toLowerCase().startsWith(inputText.toLowerCase())) {
        suffix = suffix.substring(inputText.length);
      }
      if (suffix && !suffix.startsWith(' ') && !inputText.endsWith(' ')) {
        suffix = ' ' + suffix;
      }
      elements.linkModalGhostTyped.textContent = currentText;
      elements.linkModalGhostSuggestion.textContent = suffix;
      modalSuggestionSource = 'ai';
    } else {
      clearModalGhostText();
    }
  }


  // Bridge script - injected into sandbox iframe for cross-origin communication
  const BRIDGE_SCRIPT = `<script id="__sandbox_bridge__">
(function() {
  var inspStylesInjected = false;
  var isInspectMode = false;
  function injectInspectStyles() {
    if (inspStylesInjected || !document.head) return;
    var s = document.createElement('style');
    s.id = 'gemini-inspect-styles';
    s.textContent = '.gemini-hover-highlight{outline:2px dashed #00ff88!important;outline-offset:2px!important;background-color:rgba(0,255,136,0.1)!important;cursor:crosshair!important} .gemini-selected-element{outline:3px solid #00ff88!important;outline-offset:2px!important;background-color:rgba(0,255,136,0.15)!important;box-shadow:0 0 20px rgba(0,255,136,0.3)!important} .gemini-inspect-active *{cursor:crosshair!important}';
    document.head.appendChild(s);
    inspStylesInjected = true;
  }
  function generateSelector(el) {
    var path = [], cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      var sel = cur.tagName.toLowerCase();
      if (cur.id) { path.unshift('#' + cur.id); break; }
      if (cur.className && typeof cur.className === 'string') {
        var cls = cur.className.split(' ').filter(function(c) { return c && c.indexOf('gemini-') !== 0; }).slice(0, 2);
        if (cls.length > 0) sel += '.' + cls.join('.');
      }
      var par = cur.parentElement;
      if (par) {
        var sibs = Array.from(par.children).filter(function(c) { return c.tagName === cur.tagName; });
        if (sibs.length > 1) sel += ':nth-of-type(' + (sibs.indexOf(cur) + 1) + ')';
      }
      path.unshift(sel);
      cur = cur.parentElement;
    }
    return path.join(' > ');
  }
  function onHover(e) {
    if (!isInspectMode) return;
    e.stopPropagation();
    var t = e.target;
    if (t === e.currentTarget || t.classList.contains('gemini-selected-element')) return;
    t.classList.add('gemini-hover-highlight');
  }
  function onMouseOut(e) {
    if (!isInspectMode) return;
    e.stopPropagation();
    e.target.classList.remove('gemini-hover-highlight');
  }
  function onClick(e) {
    if (!isInspectMode) return;
    e.preventDefault();
    e.stopPropagation();
    var t = e.target;
    if (t === e.currentTarget) return;
    t.classList.remove('gemini-hover-highlight');
    window.parent.postMessage({ type: 'INSPECT_ELEMENT_SELECTED', selector: generateSelector(t), tagName: t.tagName.toLowerCase() }, '*');
  }
  function enableInspect() {
    isInspectMode = true;
    injectInspectStyles();
    if (document.body) {
      document.body.classList.add('gemini-inspect-active');
      document.body.addEventListener('mouseover', onHover, true);
      document.body.addEventListener('mouseout', onMouseOut, true);
      document.body.addEventListener('click', onClick, true);
    }
  }
  function disableInspect() {
    isInspectMode = false;
    if (document.body) {
      document.body.classList.remove('gemini-inspect-active');
      document.querySelectorAll('.gemini-hover-highlight').forEach(function(x) { x.classList.remove('gemini-hover-highlight'); });
      document.body.removeEventListener('mouseover', onHover, true);
      document.body.removeEventListener('mouseout', onMouseOut, true);
      document.body.removeEventListener('click', onClick, true);
    }
  }
  function clearHL() {
    document.querySelectorAll('.gemini-selected-element,.gemini-hover-highlight').forEach(function(x) {
      x.classList.remove('gemini-selected-element', 'gemini-hover-highlight');
    });
    if (document.body) document.body.classList.remove('gemini-inspect-active');
  }
  function highlightEl(sel) {
    injectInspectStyles();
    try { var el = document.querySelector(sel); if (el) el.classList.add('gemini-selected-element'); } catch(e) {}
  }
  function cleanHTML(h) {
    h = h.replace(/<script id="__sandbox_bridge__">[\\s\\S]*?<\\/script>/gi, '');
    h = h.replace(/<style id="gemini-inspect-styles">[\\s\\S]*?<\\/style>/gi, '');
    h = h.replace(/\\s*gemini-selected-element/gi, '');
    h = h.replace(/\\s*gemini-hover-highlight/gi, '');
    h = h.replace(/\\s*gemini-inspect-active/gi, '');
    h = h.replace(/\\s+class="\\s*"/gi, '');
    return h;
  }
  document.addEventListener('click', function(e) {
    if (isInspectMode) return;
    var anchor = e.target.closest ? e.target.closest('a') : null;
    if (!anchor) return;
    var href = anchor.getAttribute('href');
    if (!href || (href.startsWith('#') && href.length > 1) || href.startsWith('javascript:')) return;
    e.preventDefault();
    e.stopPropagation();
    if (href.startsWith('http://') || href.startsWith('https://')) {
      window.parent.postMessage({ type: 'LINK_EXTERNAL', href: href }, '*');
    } else {
      window.parent.postMessage({ type: 'LINK_CLICKED', href: href }, '*');
    }
  }, true);
  window.addEventListener('message', function(e) {
    var d = e.data;
    if (!d || !d.type) return;
    switch(d.type) {
      case 'PREVIEW_HTML':
        var html = d.html || '', br = d.bridgeScript || '';
        var bc = html.lastIndexOf('</body>');
        if (bc !== -1) { html = html.substring(0, bc) + br + html.substring(bc); }
        else { var hc = html.lastIndexOf('</html>'); if (hc !== -1) { html = html.substring(0, hc) + br + html.substring(hc); } else { html += br; } }
        document.open(); document.write(html); document.close();
        break;
      case 'ENABLE_INSPECT': enableInspect(); break;
      case 'DISABLE_INSPECT': disableInspect(); break;
      case 'CLEAR_HIGHLIGHTS': clearHL(); break;
      case 'HIGHLIGHT_ELEMENT': highlightEl(d.selector); break;
      case 'GET_OUTER_HTML':
        var oh = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
        window.parent.postMessage({ type: 'RESPONSE', requestId: d.requestId, html: cleanHTML(oh) }, '*');
        break;
      case 'SET_INNER_HTML':
        try {
          var t = document.querySelector(d.selector);
          if (t) {
            t.innerHTML = d.html;
            var fh = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
            window.parent.postMessage({ type: 'RESPONSE', requestId: d.requestId, success: true, html: cleanHTML(fh) }, '*');
          } else {
            window.parent.postMessage({ type: 'RESPONSE', requestId: d.requestId, success: false }, '*');
          }
        } catch(err) {
          window.parent.postMessage({ type: 'RESPONSE', requestId: d.requestId, success: false, error: err.message }, '*');
        }
        break;
      case 'GET_ELEMENT_DATA':
        try {
          var el = document.querySelector(d.selector);
          if (el) {
            window.parent.postMessage({ type: 'RESPONSE', requestId: d.requestId, found: true, outerHTML: el.outerHTML, innerHTML: el.innerHTML, tagName: el.tagName.toLowerCase() }, '*');
          } else {
            window.parent.postMessage({ type: 'RESPONSE', requestId: d.requestId, found: false }, '*');
          }
        } catch(err) {
          window.parent.postMessage({ type: 'RESPONSE', requestId: d.requestId, found: false }, '*');
        }
        break;
    }
  });
  injectInspectStyles();
  window.parent.postMessage({ type: 'SANDBOX_READY' }, '*');
})();</script>`;

  // Send message to sandbox iframe
  function postToSandbox(message) {
    if (sandboxState === 'ready' && elements.previewFrame.contentWindow) {
      if (message.type === 'PREVIEW_HTML') {
        sandboxState = 'writing';
      }
      elements.previewFrame.contentWindow.postMessage(message, SANDBOX_URL);
    } else {
      messageQueue.push(message);
    }
  }

  // Send message to sandbox and wait for response (Promise-based)
  function sendToSandbox(type, data = {}) {
    return new Promise((resolve) => {
      const requestId = ++requestCounter;
      pendingRequests[requestId] = resolve;
      postToSandbox({ type, requestId, ...data });
      setTimeout(() => {
        if (pendingRequests[requestId]) {
          delete pendingRequests[requestId];
          resolve(null);
        }
      }, 10000);
    });
  }

  // Handle sandbox ready event
  function onSandboxReady() {
    sandboxState = 'ready';
    const queue = [...messageQueue];
    messageQueue = [];
    queue.forEach(msg => postToSandbox(msg));
    const afterReady = [...pendingAfterReady];
    pendingAfterReady = [];
    afterReady.forEach(msg => postToSandbox(msg));
  }

  // Handle inspect element selected from sandbox
  function handleInspectElementSelected(data) {
    if (!isInspectMode) return;

    // Clear previous selection
    postToSandbox({ type: 'CLEAR_HIGHLIGHTS' });

    selectedPath = data.selector;
    selectedElement = null;

    // Highlight the new selection
    postToSandbox({ type: 'HIGHLIGHT_ELEMENT', selector: data.selector });

    // Update UI
    elements.selectedElementInfo.classList.remove('hidden');
    elements.selectedSelector.textContent = data.selector;
    elements.editModeLabel.classList.remove('hidden');
    elements.generateBtn.classList.add('edit-mode');
    const btnText = elements.generateBtn.querySelector('.btn-text');
    if (btnText) {
      btnText.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Chỉnh sửa`;
    }
    elements.promptInput.placeholder = `Mô tả thay đổi cho ${data.tagName}. Ví dụ: "Đổi màu nền sang xanh", "Thêm animation fade-in", "Thêm 2 card mới"...`;

    showStatus(`Đã chọn: <${data.tagName}>. Nhập yêu cầu chỉnh sửa.`, 'success');

    // Turn off inspect mode
    toggleInspectMode();
  }

  // Listen for messages from sandbox iframe
  window.addEventListener('message', (event) => {
    if (event.origin !== SANDBOX_URL) return;
    const data = event.data;
    if (!data || !data.type) return;
    switch (data.type) {
      case 'SANDBOX_READY':
        onSandboxReady();
        break;
      case 'INSPECT_ELEMENT_SELECTED':
        handleInspectElementSelected(data);
        break;
      case 'LINK_CLICKED':
        handlePreviewLinkClick(data.href);
        break;
      case 'LINK_EXTERNAL':
        chrome.tabs.create({ url: data.href });
        break;
      default:
        if (data.requestId && pendingRequests[data.requestId]) {
          pendingRequests[data.requestId](data);
          delete pendingRequests[data.requestId];
        }
        break;
    }
  });

  // Initialize sandbox iframe
  elements.previewFrame.src = SANDBOX_URL;

  // Initialize
  await init();

  // Event Listeners
  elements.newPageBtn.addEventListener('click', createNewPage);
  elements.clearHistory.addEventListener('click', clearHistory);
  elements.generateBtn.addEventListener('click', generateHTML);
  elements.refreshPreview.addEventListener('click', refreshPreview);
  elements.openNewTab.addEventListener('click', openInNewTab);
  elements.downloadHtml.addEventListener('click', downloadHTML);
  elements.copyHtml.addEventListener('click', copyHTML);
  
  // Inspect mode event listeners
  elements.inspectBtn.addEventListener('click', toggleInspectMode);
  elements.clearSelection.addEventListener('click', clearElementSelection);

  // Netlify deploy event listeners
  elements.deployBtn.addEventListener('click', handleDeploy);
  elements.netlifyOpenBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://app.netlify.com/user/applications#personal-access-tokens' });
  });
  elements.netlifyConnectBtn.addEventListener('click', async () => {
    const token = elements.netlifyTokenInput.value.trim();
    if (!token) {
      showStatus('Vui lòng nhập token', 'error');
      return;
    }
    await saveNetlifyToken(token);
    hideNetlifyPanel();
    showStatus('Đã kết nối Netlify', 'success');
    // Auto-deploy after connecting
    handleDeploy();
  });
  elements.netlifyPanelClose.addEventListener('click', hideNetlifyPanel);
  elements.netlifyTokenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      elements.netlifyConnectBtn.click();
    }
  });
  elements.copyDeployedUrl.addEventListener('click', async () => {
    const url = elements.deployedUrl.href;
    if (url && url !== '#') {
      try {
        await navigator.clipboard.writeText(url);
        showStatus('Đã copy URL', 'success');
      } catch (e) {
        showStatus('Không thể copy URL', 'error');
      }
    }
  });
  elements.disconnectNetlify.addEventListener('click', async () => {
    if (!confirm('Ngắt kết nối Netlify? Token sẽ bị xóa.')) return;
    await clearNetlifyToken();
    hideDeployedUrl();
    showStatus('Đã ngắt kết nối Netlify', 'info');
  });

  // Link navigation modal event listeners
  elements.linkModalCancel.addEventListener('click', hideLinkModal);
  elements.linkModalConfirm.addEventListener('click', confirmCreateLinkedPage);
  elements.linkModal.addEventListener('click', (e) => {
    if (e.target === elements.linkModal) hideLinkModal();
  });

  // Link modal prompt ghost text event listeners
  elements.linkModalPromptInput.addEventListener('input', updateModalGhostText);
  elements.linkModalPromptInput.addEventListener('scroll', () => {
    elements.linkModalPromptGhost.scrollTop = elements.linkModalPromptInput.scrollTop;
  });
  elements.linkModalPromptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && elements.linkModalGhostSuggestion.textContent && modalSuggestionSource) {
      e.preventDefault();
      if (modalSuggestionSource === 'prefix') {
        const suggestion = findSuggestion(elements.linkModalPromptInput.value);
        if (suggestion) {
          elements.linkModalPromptInput.value = suggestion;
        }
      } else if (modalSuggestionSource === 'ai') {
        elements.linkModalPromptInput.value = elements.linkModalPromptInput.value + elements.linkModalGhostSuggestion.textContent;
      }
      clearModalGhostText();
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      confirmCreateLinkedPage();
    }
  });

  // Ghost text (inline suggestion) event listeners
  elements.promptInput.addEventListener('input', updateGhostText);
  elements.promptInput.addEventListener('scroll', () => {
    elements.promptGhost.scrollTop = elements.promptInput.scrollTop;
  });
  elements.promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && elements.ghostSuggestion.textContent && currentSuggestionSource) {
      e.preventDefault();
      if (currentSuggestionSource === 'prefix') {
        const suggestion = findSuggestion(elements.promptInput.value);
        if (suggestion) {
          elements.promptInput.value = suggestion;
        }
      } else if (currentSuggestionSource === 'ai') {
        elements.promptInput.value = elements.promptInput.value + elements.ghostSuggestion.textContent;
      }
      clearGhostText();
    }
  });

  // Model toggle
  let currentModelType = 'flash';
  elements.modelToggle.querySelectorAll('.model-toggle-option').forEach(opt => {
    opt.addEventListener('click', () => {
      if (isGenerating) return;
      elements.modelToggle.querySelectorAll('.model-toggle-option').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      currentModelType = opt.dataset.value;
      // Move slider
      const slider = elements.modelToggle.querySelector('.model-toggle-slider');
      slider.style.transform = currentModelType === 'thinking' ? 'translateX(100%)' : 'translateX(0)';
    });
  });

  // Device toolbar listeners
  const deviceButtons = document.querySelectorAll('.device-btn');
  const deviceSizeLabel = document.getElementById('deviceSizeLabel');
  const deviceLabels = { desktop: 'Desktop', tablet: 'Tablet (768px)', mobile: 'Mobile (375px)' };
  
  deviceButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const device = btn.dataset.device;
      // Update active button
      deviceButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Update iframe class
      const iframe = elements.previewFrame;
      iframe.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
      iframe.classList.add('device-' + device);
      // Update label
      deviceSizeLabel.textContent = deviceLabels[device] || device;
    });
  });

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Options received message:', message.type);

    switch (message.type) {
      case 'GEMINI_CONNECTED':
        updateConnectionStatus(true);
        break;
      case 'GEMINI_DISCONNECTED':
        updateConnectionStatus(false);
        break;
      case 'GEMINI_OPENING':
        updateConnectionStatus(false, 'opening');
        break;
      case 'HTML_GENERATED':
        handleGenerationResult(message);
        break;
      case 'GENERATION_PROGRESS':
        showStatus(message.text, 'info');
        break;
      case 'SUGGESTION_COMPLETED':
        if (message.requestId === aiSuggestionRequestId && aiSuggestionPending) {
          if (message.success && message.completion) {
            const cacheKey = message.text.toLowerCase();
            if (aiSuggestionCache.size >= AI_CACHE_MAX) {
              const firstKey = aiSuggestionCache.keys().next().value;
              aiSuggestionCache.delete(firstKey);
            }
            aiSuggestionCache.set(cacheKey, message.completion);
            if (isLinkModalGhostActive) {
              showModalAISuggestion(message.text, message.completion);
            } else {
              showAISuggestion(message.text, message.completion);
            }
          } else {
            aiSuggestionPending = false;
            if (isLinkModalGhostActive) {
              elements.linkModalGhostSuggestion.classList.remove('ai-loading');
              clearModalGhostText();
            } else {
              elements.ghostSuggestion.classList.remove('ai-loading');
              clearGhostText();
            }
          }
        }
        break;
    }
  });

  // Initialize function
  async function init() {
    try {
      // Check Gemini connection status
      await checkGeminiStatus();

      // Load Netlify token
      await loadNetlifyToken();

      // Load pages
      await loadPages();

      // Load or create the first page
      const pages = await htmlDB.getAllPages();
      if (pages.length > 0) {
        await selectPage(pages[0].id);
      } else {
        // Create first page automatically
        await createNewPage();
      }
    } catch (error) {
      console.error('Init error:', error);
      try {
        await htmlDB.clearAll();
        console.log('Cleared corrupted database');
        await createNewPage();
      } catch (e) {
        console.error('Could not clear database:', e);
      }
      showEmptyPreview();
    }
  }

  // Check if Gemini tab is connected
  async function checkGeminiStatus() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: 'CHECK_GEMINI_STATUS' }, (response) => {
        if (response && response.connected) {
          updateConnectionStatus(true);
        } else {
          updateConnectionStatus(false);
        }
        resolve();
      });
    });
  }

  // Update connection status UI
  function updateConnectionStatus(connected, state = null) {
    isConnected = connected;

    if (state === 'opening') {
      showStatus('Đang mở Gemini...', 'info');
      return;
    }

    if (connected) {
      showStatus('Đã kết nối Gemini', 'success');
    } else {
      showStatus('Chưa kết nối Gemini', 'error');
    }
  }

  // =====================
  // PAGE MANAGEMENT
  // =====================
  
  // Load all pages
  async function loadPages() {
    try {
      const pages = await htmlDB.getAllPages();
      renderPages(pages);
    } catch (error) {
      console.error('Failed to load pages:', error);
    }
  }

  // Render pages list
  function renderPages(pages) {
    if (pages.length === 0) {
      elements.pageList.innerHTML = '<div class="empty-state">Chưa có page nào</div>';
      return;
    }

    const fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
    const deleteIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>`;

    elements.pageList.innerHTML = pages.map(page => `
      <div class="page-item${page.id === currentPageId ? ' active' : ''}" data-id="${page.id}">
        <span class="page-item-icon">${fileIcon}</span>
        <span class="page-item-name" title="${escapeHtml(page.name)}">${escapeHtml(page.name)}</span>
        <span class="page-item-date">${formatDate(page.createdAt)}</span>
        <button class="page-item-delete" data-id="${page.id}" title="Xóa page">${deleteIcon}</button>
      </div>
    `).join('');

    // Add click handlers
    elements.pageList.querySelectorAll('.page-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.closest('.page-item-delete')) {
          e.stopPropagation();
          const id = parseInt(e.target.closest('.page-item-delete').dataset.id);
          await deletePage(id);
          return;
        }
        
        // Double click to rename
        if (e.target.closest('.page-item-name') && e.detail === 2) {
          e.stopPropagation();
          startRenamePage(item);
          return;
        }
        
        const id = parseInt(item.dataset.id);
        await selectPage(id);
      });
    });
  }

  // Create new page
  async function createNewPage() {
    try {
      const pages = await htmlDB.getAllPages();
      const pageNumber = pages.length + 1;
      const pageId = await htmlDB.createPage(`Page ${pageNumber}`);
      
      currentPageId = pageId;
      await loadPages();
      await loadHistory();
      
      currentHTML = '';
      isReverted = false;
      revertedFromPrompt = '';
      showEmptyPreview();
      elements.promptInput.value = '';
      clearGhostText();
      cancelAISuggestion();
      hideDeployedUrl();

      showStatus(`Đã tạo Page ${pageNumber}`, 'success');
    } catch (error) {
      console.error('Failed to create page:', error);
      showStatus('Không thể tạo page mới', 'error');
    }
  }

  // Select a page
  async function selectPage(pageId) {
    if (currentPageId === pageId) return;
    
    try {
      currentPageId = pageId;
      
      // Update UI
      elements.pageList.querySelectorAll('.page-item').forEach(el => {
        el.classList.toggle('active', parseInt(el.dataset.id) === pageId);
      });
      
      // Load page data
      const page = await htmlDB.getPage(pageId);
      if (page) {
        // Load last HTML if available
        if (page.lastHtml) {
          currentHTML = page.lastHtml;
          updatePreview(page.lastHtml);
        } else {
          currentHTML = '';
          showEmptyPreview();
        }
        
        // Load last prompt
        elements.promptInput.value = '';
      }
      
      // Clear revert state when switching pages
      isReverted = false;
      revertedFromPrompt = '';

      // Load page history
      await loadHistory();

      // Clear element selection
      clearElementSelection();

      // Cancel any pending AI suggestions and clear cache for new page context
      cancelAISuggestion();
      aiSuggestionCache.clear();

      // Update deployed URL bar for this page
      if (page && page.netlifySiteUrl) {
        showDeployedUrl(page.netlifySiteUrl);
      } else {
        hideDeployedUrl();
      }
      
    } catch (error) {
      console.error('Failed to select page:', error);
      showStatus('Không thể chọn page', 'error');
    }
  }

  // Delete a page
  async function deletePage(pageId) {
    if (!confirm('Bạn có chắc muốn xóa page này và toàn bộ lịch sử?')) return;

    try {
      await htmlDB.deletePage(pageId);

      const remainingPages = await htmlDB.getAllPages();

      if (remainingPages.length === 0) {
        // Last page deleted — create a fresh one automatically
        currentPageId = null;
        currentHTML = '';
        isReverted = false;
        revertedFromPrompt = '';
        await createNewPage();
      } else if (currentPageId === pageId) {
        await selectPage(remainingPages[0].id);
        await loadPages();
      } else {
        await loadPages();
      }

      showStatus('Đã xóa page', 'info');
    } catch (error) {
      console.error('Failed to delete page:', error);
      showStatus('Không thể xóa page', 'error');
    }
  }

  // Start renaming a page
  function startRenamePage(pageItem) {
    const nameSpan = pageItem.querySelector('.page-item-name');
    const currentName = nameSpan.textContent;
    
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'page-rename-input';
    
    nameSpan.innerHTML = '';
    nameSpan.appendChild(input);
    input.focus();
    input.select();
    
    async function finishRename() {
      const newName = input.value.trim() || currentName;
      nameSpan.textContent = newName;
      
      if (newName !== currentName) {
        const pageId = parseInt(pageItem.dataset.id);
        await htmlDB.renamePage(pageId, newName);
      }
    }
    
    input.addEventListener('blur', finishRename);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        input.blur();
      } else if (e.key === 'Escape') {
        nameSpan.textContent = currentName;
      }
    });
  }

  // Format date for display
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút`;
    if (diffHours < 24) return `${diffHours} giờ`;
    if (diffDays < 7) return `${diffDays} ngày`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  }

  // =====================
  // HISTORY MANAGEMENT
  // =====================

  // Load history for current page
  async function loadHistory() {
    if (!currentPageId) {
      elements.historyList.innerHTML = '<div class="empty-state">Chưa có lịch sử</div>';
      return;
    }
    
    try {
      const history = await htmlDB.getPageHistory(currentPageId);
      renderHistory(history);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  }

  // Render history list
  function renderHistory(history) {
    if (history.length === 0) {
      elements.historyList.innerHTML = '<div class="empty-state">Chưa có lịch sử</div>';
      return;
    }

    // SVG icons
    const fileIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
    const deleteIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

    elements.historyList.innerHTML = history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <span class="history-item-icon">${fileIcon}</span>
        <span class="history-item-text" title="${escapeHtml(item.prompt)}">${escapeHtml(item.prompt)}</span>
        <span class="history-item-date">${item.date}</span>
        <button class="history-item-delete" data-id="${item.id}" title="Xóa">${deleteIcon}</button>
      </div>
    `).join('');

    // Add click handlers
    elements.historyList.querySelectorAll('.history-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        if (e.target.closest('.history-item-delete')) {
          e.stopPropagation();
          const id = parseInt(e.target.closest('.history-item-delete').dataset.id);
          await deleteHistoryItem(id);
          return;
        }
        
        const id = parseInt(item.dataset.id);
        await loadHistoryItem(id);
      });
    });
  }

  // Load a history item - Load full HTML from that history entry
  async function loadHistoryItem(id) {
    try {
      const item = await htmlDB.getHTML(id);
      if (item && item.html) {
        currentHTML = item.html;
        updatePreview(item.html);
        elements.promptInput.value = '';
        clearGhostText();
        cancelAISuggestion();

        // Check if this is a revert (not the latest history item)
        const history = await htmlDB.getPageHistory(currentPageId);
        const latestItem = history.length > 0 ? history[0] : null;
        latestHistoryId = latestItem ? latestItem.id : null;
        
        if (latestItem && latestItem.id !== id) {
          // User is reverting to an older version
          isReverted = true;
          revertedFromPrompt = item.prompt || '';
          showStatus(`Đã revert về: "${item.prompt}". Prompt tiếp theo sẽ tiếp tục từ phiên bản này.`, 'success');
        } else {
          // User clicked the latest item, not a revert
          isReverted = false;
          revertedFromPrompt = '';
          showStatus('Đã tải HTML từ lịch sử', 'success');
        }
        
        // Clear any element selection when loading from history
        clearElementSelection();
        
        // Highlight the selected history item
        elements.historyList.querySelectorAll('.history-item').forEach(el => {
          el.classList.remove('active');
        });
        const activeItem = elements.historyList.querySelector(`[data-id="${id}"]`);
        if (activeItem) activeItem.classList.add('active');
        
      } else {
        showStatus('Không có dữ liệu HTML trong mục này', 'error');
      }
    } catch (error) {
      console.error('Load history error:', error);
      showStatus('Không thể tải lịch sử', 'error');
    }
  }

  // Delete history item
  async function deleteHistoryItem(id) {
    try {
      await htmlDB.deleteHTML(id);
      await loadHistory();
      showStatus('Đã xóa', 'info');
    } catch (error) {
      showStatus('Không thể xóa', 'error');
    }
  }

  // Clear all history for current page
  async function clearHistory() {
    if (!currentPageId) return;
    if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử của page này?')) return;
    
    try {
      await htmlDB.clearPageHistory(currentPageId);
      await loadHistory();
      currentHTML = '';
      isReverted = false;
      revertedFromPrompt = '';
      showEmptyPreview();
      showStatus('Đã xóa toàn bộ lịch sử', 'info');
    } catch (error) {
      showStatus('Không thể xóa lịch sử', 'error');
    }
  }

  // Generate HTML via Gemini
  async function generateHTML() {
    if (!currentPageId) {
      showStatus('Vui lòng chọn hoặc tạo page trước', 'error');
      return;
    }
    
    let prompt = elements.promptInput.value.trim();
    
    if (!prompt) {
      showStatus('Vui lòng nhập mô tả', 'error');
      return;
    }

    // Get selected model
    const modelType = currentModelType; // 'flash' or 'thinking'

    // Set loading state first
    elements.generateBtn.classList.add('loading');
    elements.generateBtn.disabled = true;
    
    // Store prompt text before clearing (for history saving later)
    lastPromptText = prompt;
    
    // Clear and disable prompt input during generation
    elements.promptInput.value = '';
    elements.promptInput.disabled = true;
    elements.promptInput.placeholder = 'Đang tạo HTML...';
    clearGhostText();
    cancelAISuggestion();
    
    // Lock all UI
    lockUI();

    // Ensure connection before generating
    if (!isConnected) {
      showStatus('Đang kết nối Gemini...', 'info');
      
      try {
        const result = await new Promise((resolve) => {
          chrome.runtime.sendMessage({ type: 'ENSURE_CONNECTION' }, resolve);
        });
        
        if (!result || !result.connected) {
          elements.generateBtn.classList.remove('loading');
          elements.generateBtn.disabled = false;
          elements.promptInput.disabled = false;
          elements.promptInput.placeholder = 'Ví dụ: Tạo trang landing page cho quán cà phê với màu nâu ấm áp, có hero section với hình nền gradient, menu sản phẩm dạng card, và footer với thông tin liên hệ...';
          unlockUI();
          showStatus('Không thể kết nối Gemini. Vui lòng thử lại.', 'error');
          return;
        }
        
        isConnected = true;
        updateConnectionStatus(true);
      } catch (error) {
        elements.generateBtn.classList.remove('loading');
        elements.generateBtn.disabled = false;
        elements.promptInput.disabled = false;
        elements.promptInput.placeholder = 'Ví dụ: Tạo trang landing page cho quán cà phê với màu nâu ấm áp, có hero section với hình nền gradient, menu sản phẩm dạng card, và footer với thông tin liên hệ...';
        unlockUI();
        showStatus('Lỗi kết nối: ' + error.message, 'error');
        return;
      }
    }

    // Get page data for conversation context
    const page = await htmlDB.getPage(currentPageId);

    // Include current HTML context when modifying an existing page
    let finalPrompt = prompt;
    let isModification = false;
    if (currentHTML && !selectedPath) {
      // Truncate HTML if extremely long to fit in prompt context
      const maxHtmlContext = 60000;
      let htmlContext = currentHTML;
      if (htmlContext.length > maxHtmlContext) {
        // Smart truncation: keep <head> intact (contains CSS/links), truncate <body> middle
        const headEnd = htmlContext.toLowerCase().indexOf('</head>');
        const bodyEnd = htmlContext.toLowerCase().lastIndexOf('</body>');
        if (headEnd !== -1 && bodyEnd !== -1) {
          const headPart = htmlContext.substring(0, headEnd + 7);
          const bodyStart = htmlContext.substring(headEnd + 7, headEnd + 7 + 8000);
          const bodyTail = htmlContext.substring(Math.max(bodyEnd - 5000, headEnd + 7 + 8000));
          htmlContext = headPart + bodyStart + '\n<!-- ... content truncated ... -->\n' + bodyTail;
        } else {
          htmlContext = htmlContext.substring(0, maxHtmlContext) + '\n... (truncated)';
        }
      }

      const revertNote = isReverted ? '\nNOTE: I have reverted to a previous version of this page. ' : '';

      finalPrompt = `You are an HTML editor. You will receive an existing HTML file and a modification request.
Your job is to apply ONLY the requested change and return the FULL modified HTML file.${revertNote}

CURRENT HTML CODE:
${htmlContext}

MODIFICATION REQUEST: ${prompt}

CRITICAL RULES:
1. Copy the ENTIRE existing <style> block EXACTLY as-is, character by character. Do NOT remove, simplify, rewrite, or reorganize any CSS property (padding, margin, gap, font-size, colors, gradients, shadows, border-radius, line-height, display, flex, grid, etc.)
2. Copy ALL existing <link> tags (stylesheets, fonts, CDN) EXACTLY as-is
3. Copy the ENTIRE existing <script> block as-is. Add new JavaScript if the modification requires interactive functionality
4. Only ADD or MODIFY the specific CSS/HTML/JS related to the request
5. Keep ALL existing HTML structure, class names, ids, and attributes unchanged unless the request specifically asks to change them
6. Keep ALL existing content (text, emojis, links) unless the request specifically asks to change them
7. Do NOT reorganize, reformat, or "clean up" any code
8. Return the COMPLETE HTML file starting with <!DOCTYPE html>
9. The output must be ONLY HTML code, no explanation, no markdown`;
      
      isModification = true;
      console.log('Sending modification prompt with HTML context, length:', currentHTML.length);
    }
    
    // If element is selected, modify the prompt for element-specific editing
    let elementTag = '';
    if (selectedPath) {
      try {
        const elementData = await sendToSandbox('GET_ELEMENT_DATA', { selector: selectedPath });

        if (elementData && elementData.found) {
          const elementHTML = elementData.outerHTML;
          elementTag = elementData.tagName;

          finalPrompt = `TASK: Modify this HTML element's INNER content.

CURRENT ELEMENT (${elementTag}):
${elementHTML}

REQUEST: ${prompt}

RULES:
- Return ONLY the new innerHTML (content inside <${elementTag}>)
- DO NOT include the outer <${elementTag}> tags
- DO NOT explain, just return HTML
- Start your response with a < character

NEW INNER HTML:`;
        } else {
          showStatus('Không tìm thấy phần tử đã chọn, sẽ tạo mới toàn bộ', 'warning');
          clearElementSelection();
        }
      } catch (e) {
        console.error('Error accessing selected element:', e);
        clearElementSelection();
      }
    }

    showStatus(selectedPath ? 'Đang chỉnh sửa phần tử...' : 'Đang gửi yêu cầu đến Gemini...', 'info');

    // Send request to background script
    chrome.runtime.sendMessage({
      type: 'GENERATE_HTML',
      prompt: finalPrompt,
      isElementEdit: !!selectedPath,
      isModification: isModification,
      modelType: modelType, // 'flash' or 'thinking'
      pageId: currentPageId,
      conversationId: page?.conversationId ?? '',
      responseId: page?.responseId ?? '',
      choiceId: page?.choiceId ?? ''
    }, (response) => {
      if (!response || !response.success) {
        elements.generateBtn.classList.remove('loading');
        elements.generateBtn.disabled = false;
        elements.promptInput.disabled = false;
        elements.promptInput.placeholder = 'Ví dụ: Tạo trang landing page cho quán cà phê với màu nâu ấm áp, có hero section với hình nền gradient, menu sản phẩm dạng card, và footer với thông tin liên hệ...';
        unlockUI();
        
        // If connection lost, mark as disconnected
        if (response?.error?.includes('kết nối')) {
          isConnected = false;
          updateConnectionStatus(false);
        }
        
        showStatus(response?.error || 'Không thể kết nối Gemini', 'error');
      }
      // Wait for GENERATION_RESULT message
    });
  }

  // Handle generation result
  async function handleGenerationResult(message) {
    elements.generateBtn.classList.remove('loading');
    elements.generateBtn.disabled = false;
    
    // Re-enable prompt input
    elements.promptInput.disabled = false;
    elements.promptInput.placeholder = 'Ví dụ: Tạo trang landing page cho quán cà phê với màu nâu ấm áp, có hero section với hình nền gradient, menu sản phẩm dạng card, và footer với thông tin liên hệ...';
    
    // Unlock all UI
    unlockUI();

    console.log('Handle generation result:', message);
    console.log('Raw HTML length:', message.html?.length || 0);
    console.log('Raw text length:', message.rawText?.length || 0);

    // Update page's conversation state if provided
    if (currentPageId && (message.conversationId || message.responseId || message.choiceId)) {
      await htmlDB.updatePage(currentPageId, {
        conversationId: message.conversationId,
        responseId: message.responseId,
        choiceId: message.choiceId
      });
    }

    // Try to extract HTML from various sources
    let html = null;

    // First try the html field directly
    if (message.html && (message.html.toLowerCase().includes('<!doctype') || message.html.includes('<html'))) {
      html = message.html;
      // If it's embedded in thinking text, extract it
      if (html.includes('**') || !html.trim().toLowerCase().startsWith('<!doctype')) {
        html = tryExtractHTML(html);
      }
    }

    // Try rawText
    if (!html && message.rawText) {
      html = tryExtractHTML(message.rawText);
    }

    // Fallback: try tryExtractHTML on message.html itself (handles edge cases like truncated/wrapped HTML)
    if (!html && message.html) {
      html = tryExtractHTML(message.html);
    }

    // Try error message if it might contain HTML
    if (!html && message.error) {
      html = tryExtractHTML(message.error);
    }
    
    // Fix markdown-formatted URLs that Gemini sometimes generates
    if (html) html = fixMarkdownUrls(html);

    // Fix [suspicious link removed] by detecting libraries and injecting correct CDN links
    if (html) html = fixSuspiciousLinks(html);

    // Fix HTML entities inside <script> tags (Gemini encodes template literals)
    if (html) html = fixEncodedScripts(html);

    // Fix backslash-escaped ampersands in URLs (e.g. Google Fonts \&display=swap)
    if (html) html = fixBackslashAmpersands(html);

    // Fix backslash-escaped CSS comment markers (/\* → /*)
    if (html) html = fixEscapedCSS(html);

    // Ensure <!DOCTYPE html> is always present
    if (html && !html.trim().toLowerCase().startsWith('<!doctype')) {
      html = '<!DOCTYPE html>\n' + html;
    }

    console.log('Extracted HTML length:', html?.length || 0);
    console.log('HTML preview:', html?.substring(0, 200) || 'null');

    if (html || (selectedPath && (message.rawText || message.html))) {
      // Check if we're in element edit mode
      if (selectedPath) {
        // Replace only the selected element's content via sandbox postMessage
        try {
          let rawContent = message.html || message.rawText || html || '';
          rawContent = fixMarkdownUrls(rawContent);
          const newContent = extractInnerContent(rawContent, selectedPath);

          console.log('Element edit - raw:', rawContent.substring(0, 200));
          console.log('Element edit - extracted:', newContent.substring(0, 200));

          if (!newContent || newContent.length < 2) {
            showStatus('Không thể trích xuất nội dung HTML từ phản hồi AI', 'error');
            return;
          }

          const result = await sendToSandbox('SET_INNER_HTML', {
            selector: selectedPath,
            html: newContent
          });

          if (result && result.success) {
            currentHTML = cleanHTMLForSave(result.html);

            // Clear revert state after successful element edit
            isReverted = false;
            revertedFromPrompt = '';

            // Save to IndexedDB with page ID
            if (currentPageId) {
              await htmlDB.saveHTML(currentPageId, lastPromptText, currentHTML);
              await htmlDB.updatePage(currentPageId, { lastHtml: currentHTML, lastPrompt: lastPromptText });
            }

            // Reload history
            await loadHistory();

            showStatus('Đã cập nhật phần tử thành công!', 'success');

            // Keep selection active for further edits
            highlightSelectedElement(selectedPath);
          } else {
            showStatus('Không tìm thấy phần tử để cập nhật', 'error');
          }
        } catch (error) {
          console.error('Error updating element:', error);
          showStatus('Lỗi cập nhật phần tử: ' + error.message, 'error');
        }
      } else {
        // Full HTML replacement (original behavior)
        currentHTML = html;
        
        // Clear revert state after successful generation
        isReverted = false;
        revertedFromPrompt = '';
        
        // Save to IndexedDB with page ID
        if (currentPageId) {
          await htmlDB.saveHTML(currentPageId, lastPromptText, html);
          await htmlDB.updatePage(currentPageId, { lastHtml: html, lastPrompt: lastPromptText });
        }
        
        // Update preview
        updatePreview(html);
        
        // Reload history
        await loadHistory();
        
        showStatus('Tạo HTML thành công!', 'success');
      }
    } else {
      showStatus(message.error || 'Không thể trích xuất HTML', 'error');
    }
  }
  
  // Try to extract HTML from text (fallback parser)
  function tryExtractHTML(text) {
    if (!text) return null;

    // Decode unicode escapes
    let decoded = text;
    let prev = '';
    while (prev !== decoded) {
      prev = decoded;
      decoded = decoded.replace(/\\\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
      decoded = decoded.replace(/\\u([0-9a-fA-F]{4})/g, (m, h) => String.fromCharCode(parseInt(h, 16)));
    }
    decoded = decoded.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');

    // Remove markdown code fences
    decoded = decoded.replace(/```html\s*/gi, '').replace(/```\s*/g, '');

    // Remove thinking markers like **text**
    decoded = decoded.replace(/\*\*[^*]+\*\*/g, '');

    // Try to find HTML by index (more reliable than regex for large content)
    const doctypeIndex = decoded.toLowerCase().indexOf('<!doctype');
    if (doctypeIndex !== -1) {
      const htmlEndIndex = decoded.toLowerCase().lastIndexOf('</html>');
      if (htmlEndIndex !== -1) {
        return decoded.substring(doctypeIndex, htmlEndIndex + 7);
      }
    }

    const htmlStartIndex = decoded.toLowerCase().indexOf('<html');
    if (htmlStartIndex !== -1) {
      const htmlEndIndex = decoded.toLowerCase().lastIndexOf('</html>');
      if (htmlEndIndex !== -1) {
        return '<!DOCTYPE html>\n' + decoded.substring(htmlStartIndex, htmlEndIndex + 7);
      }
    }

    // Try regex as fallback
    const match = decoded.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>)/i);
    if (match) return match[1];

    const htmlMatch = decoded.match(/(<html[\s\S]*?<\/html>)/i);
    if (htmlMatch) return '<!DOCTYPE html>\n' + htmlMatch[1];

    return null;
  }

  // Fix markdown-formatted URLs in HTML attributes
  // Gemini sometimes generates: href="[actual-url](google-search-url)" instead of href="actual-url"
  // Also handles: href="[url](url)&display=swap" where extra params follow the markdown pattern
  function fixMarkdownUrls(html) {
    if (!html) return html;
    // Fix in HTML attributes (href, src, etc.)
    html = html.replace(/((?:href|src|action|poster|data-src)\s*=\s*["'])\[([^\]]+)\]\([^)]*\)([^"']*)(["'])/gi, '$1$2$3$4');
    // Fix markdown URLs inside <script> blocks (e.g. image URLs in JS arrays)
    // Pattern: [https://actual-url](https://google-search-url) → https://actual-url
    html = html.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, (scriptBlock) => {
      if (scriptBlock.includes('__sandbox_bridge__')) return scriptBlock;
      return scriptBlock.replace(/\[(https?:\/\/[^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1');
    });
    return html;
  }

  // Fix HTML entities inside <script> tags that Gemini sometimes generates
  // Browsers treat <script> as raw text (RAWTEXT state), so &#39; stays as literal "&#39;"
  // instead of being decoded to ' — this breaks all JavaScript execution
  function fixEncodedScripts(html) {
    if (!html) return html;
    return html.replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, (scriptBlock) => {
      // Skip the sandbox bridge script
      if (scriptBlock.includes('__sandbox_bridge__')) return scriptBlock;
      // Only fix if the script content actually contains HTML entities
      if (!/&(?:lt|gt|amp|quot|#39|#x27|#34|#60|#62);/i.test(scriptBlock)) return scriptBlock;
      // Extract tag and content
      const openTagEnd = scriptBlock.indexOf('>') + 1;
      const closeTagStart = scriptBlock.lastIndexOf('</script>');
      if (openTagEnd <= 0 || closeTagStart <= 0) return scriptBlock;
      const openTag = scriptBlock.substring(0, openTagEnd);
      const content = scriptBlock.substring(openTagEnd, closeTagStart);
      const closeTag = scriptBlock.substring(closeTagStart);
      // Decode HTML entities in the script content
      let decoded = content
        .replace(/&#39;/g, "'")
        .replace(/&#x27;/gi, "'")
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&#60;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#62;/g, '>')
        .replace(/&amp;/g, '&');
      // CRITICAL: Ensure decoded content doesn't create premature </script> closing tag
      // The HTML parser uses RAWTEXT state for <script> — a literal </script> would close it
      decoded = decoded.replace(/<\/script>/gi, '<\\/script>');
      return openTag + decoded + closeTag;
    });
  }

  // Fix backslash-escaped ampersands in URLs (e.g. \&amp; or \& in href/src attributes)
  function fixBackslashAmpersands(html) {
    if (!html) return html;
    // Fix \&amp; → & and \& → & inside attribute values
    return html.replace(/((?:href|src|action|poster|data-src)\s*=\s*["'])([^"']*)(["'])/gi, (match, prefix, url, quote) => {
      const fixed = url.replace(/\\&amp;/g, '&').replace(/\\&/g, '&');
      return prefix + fixed + quote;
    });
  }

  // Fix backslash-escaped CSS comment markers in <style> blocks
  // Gemini sometimes generates /\* comment \*/ instead of /* comment */
  // This completely breaks CSS parsing since the browser doesn't recognize /\* as comment start
  function fixEscapedCSS(html) {
    if (!html) return html;
    return html.replace(/<style(?:\s[^>]*)?>[\s\S]*?<\/style>/gi, (styleBlock) => {
      return styleBlock.replace(/\/\\\*/g, '/*').replace(/\\\*\//g, '*/');
    });
  }

  // Fix "[suspicious link removed]" placeholders that Gemini/Cloudflare may insert
  // Detects which libraries are used in the HTML and adds the correct CDN links
  function fixSuspiciousLinks(html) {
    if (!html || !html.includes('[suspicious link removed]')) return html;

    // Remove broken link/script tags containing [suspicious link removed]
    html = html.replace(/<link[^>]*href\s*=\s*["'][^"']*suspicious link removed[^"']*["'][^>]*\/?>/gi, '');
    html = html.replace(/<script[^>]*src\s*=\s*["'][^"']*suspicious link removed[^"']*["'][^>]*>[\s\S]*?<\/script>/gi, '');

    // Detect needed libraries from class usage and add correct CDN links
    const cdnLinks = [];

    // Font Awesome
    if (/class\s*=\s*"[^"]*(?:fa-solid|fa-regular|fa-brands|fa-light|fa-thin|fa-duotone|fas\s|far\s|fab\s|fal\s)\b/i.test(html) ||
        /class\s*=\s*"[^"]*\bfa\s+fa-/i.test(html)) {
      cdnLinks.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">');
    }

    // Bootstrap CSS
    if (/class\s*=\s*"[^"]*(?:btn-primary|btn-secondary|btn-success|btn-danger|container-fluid|navbar-expand|col-md-|col-lg-|col-sm-|modal-dialog|carousel-item|accordion-item)\b/i.test(html)) {
      cdnLinks.push('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css">');
    }

    // Bootstrap JS (if Bootstrap components are used)
    if (/\b(?:data-bs-toggle|data-bs-target|data-bs-dismiss)\b/i.test(html)) {
      cdnLinks.push('<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"><\/script>');
    }

    // AOS (Animate On Scroll)
    if (/\bdata-aos\s*=/i.test(html)) {
      cdnLinks.push('<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css">');
      cdnLinks.push('<script src="https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js"><\/script>');
    }

    // Animate.css
    if (/class\s*=\s*"[^"]*\banimate__/i.test(html)) {
      cdnLinks.push('<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css">');
    }

    // Inject detected CDN links before </head>
    if (cdnLinks.length > 0) {
      const headClose = html.indexOf('</head>');
      if (headClose !== -1) {
        html = html.substring(0, headClose) + '\n' + cdnLinks.join('\n') + '\n' + html.substring(headClose);
      }
      console.log('fixSuspiciousLinks: injected CDN links:', cdnLinks);
    }

    return html;
  }

  // Extract inner content from Gemini response (for element edit mode)
  function extractInnerContent(html, selectedSelector) {
    if (!html) return '';
    
    let content = html;
    
    // Remove code block markers
    content = content.replace(/```html\s*/gi, '').replace(/```\s*/g, '');
    
    // Remove thinking text before first HTML tag (e.g., "Here's the updated HTML:")
    content = content.replace(/^[\s\S]*?(?=<[a-zA-Z])/m, '');
    
    // If it's a full HTML document, we need to be smart about extraction
    if (content.includes('<!DOCTYPE') || content.includes('<html')) {
      // Try to find the selected element's tag in the response body
      if (selectedSelector) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(content, 'text/html');
          
          // Try to find the matching element in the response doc
          const matchedElement = doc.querySelector(selectedSelector);
          if (matchedElement) {
            console.log('Found matching element in full HTML response via selector:', selectedSelector);
            return matchedElement.innerHTML.trim();
          }
          
          // If exact selector doesn't match, try to find by tag type from the body
          // Get the tag name from the selector
          const tagMatch = selectedSelector.match(/^([a-zA-Z][a-zA-Z0-9]*)/);
          if (tagMatch) {
            const tagName = tagMatch[1].toLowerCase();
            const bodyEl = doc.querySelector('body');
            if (bodyEl) {
              // If body has exactly one child of the same tag type, use it
              const matchingChildren = bodyEl.querySelectorAll(':scope > ' + tagName);
              if (matchingChildren.length === 1) {
                console.log('Found single matching tag in body:', tagName);
                return matchingChildren[0].innerHTML.trim();
              }
            }
          }
          
          // Fallback: if body has only one direct child, use its innerHTML
          const bodyElement = doc.querySelector('body');
          if (bodyElement) {
            const directChildren = Array.from(bodyElement.children);
            if (directChildren.length === 1) {
              console.log('Body has single child, using its innerHTML');
              return directChildren[0].innerHTML.trim();
            }
            // If body has multiple children, return body innerHTML
            // This is the old behavior but logged as a warning
            console.warn('Full HTML response with multiple body children - using full body innerHTML');
            return bodyElement.innerHTML.trim();
          }
        } catch (e) {
          console.error('Error parsing full HTML for element extraction:', e);
        }
      }
      
      // Legacy fallback: extract body content
      const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      if (bodyMatch) {
        return bodyMatch[1].trim();
      }
    }
    
    // For HTML fragments (expected case), find the first HTML tag and extract from there
    const firstTagMatch = content.match(/(<[a-zA-Z][^>]*>[\s\S]*)/i);
    if (firstTagMatch) {
      content = firstTagMatch[1];
    }
    
    // Clean up any trailing thinking text after last closing tag
    const lastClosingTag = content.lastIndexOf('>');
    if (lastClosingTag !== -1) {
      content = content.substring(0, lastClosingTag + 1);
    }
    
    return content.trim();
  }

  // Update preview iframe via sandbox postMessage
  function updatePreview(html) {
    // Apply Gemini artifact fixes to ALL HTML before preview (covers DB-loaded pages too)
    if (html) {
      html = fixMarkdownUrls(html);
      html = fixEncodedScripts(html);
      html = fixBackslashAmpersands(html);
      html = fixEscapedCSS(html);
    }
    pendingAfterReady = [];
    if (isInspectMode) {
      pendingAfterReady.push({ type: 'ENABLE_INSPECT' });
    }
    if (selectedPath) {
      pendingAfterReady.push({ type: 'HIGHLIGHT_ELEMENT', selector: selectedPath });
    }
    postToSandbox({
      type: 'PREVIEW_HTML',
      html: html,
      bridgeScript: BRIDGE_SCRIPT
    });
  }

  // Show empty preview
  function showEmptyPreview() {
    const emptyHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #0a0a0f 0%, #1a1a25 100%);
            color: #666;
            font-family: 'Segoe UI', sans-serif;
          }
          .icon { font-size: 72px; margin-bottom: 20px; opacity: 0.3; }
          .text { font-size: 16px; color: #555; }
          .subtext { font-size: 13px; color: #444; margin-top: 8px; }
        </style>
      </head>
      <body>
        <div class="icon">🎨</div>
        <div class="text">Nhập prompt để tạo HTML</div>
        <div class="subtext">Kết nối với Gemini và bắt đầu sáng tạo</div>
      </body>
      </html>
    `;
    updatePreview(emptyHTML);
  }

  // Refresh preview
  function refreshPreview() {
    if (currentHTML) {
      updatePreview(currentHTML);
      showStatus('Đã làm mới preview', 'info');
    }
  }

  // Open in new tab
  function openInNewTab() {
    if (!currentHTML) {
      showStatus('Không có HTML để mở', 'error');
      return;
    }

    const blob = new Blob([currentHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    chrome.tabs.create({ url: url });
  }

  // Download HTML
  function downloadHTML() {
    if (!currentHTML) {
      showStatus('Không có HTML để tải', 'error');
      return;
    }

    const blob = new Blob([currentHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-html-${Date.now()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus('Đã tải xuống HTML', 'success');
  }

  // Copy HTML to clipboard
  async function copyHTML() {
    if (!currentHTML) {
      showStatus('Không có HTML để copy', 'error');
      return;
    }

    try {
      await navigator.clipboard.writeText(currentHTML);
      showStatus('Đã copy HTML vào clipboard', 'success');
    } catch (error) {
      showStatus('Không thể copy HTML', 'error');
    }
  }

  // Show status message
  function showStatus(message, type = 'info') {
    const el = elements.status;
    el.textContent = message;
    el.className = 'toast-island visible ' + type;

    // Add loading state during generation
    if (type === 'info' && elements.generateBtn.classList.contains('loading')) {
      el.classList.add('loading');
    }

    // Clear existing hide timer
    if (el._hideTimer) {
      clearTimeout(el._hideTimer);
      el._hideTimer = null;
    }

    // Auto hide after 3 seconds (except info during generation)
    if (type !== 'info' || !elements.generateBtn.classList.contains('loading')) {
      el._hideTimer = setTimeout(() => {
        el.classList.remove('visible');
      }, 3000);
    }
  }

  // Escape HTML for safe display
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // =====================
  // UI LOCK DURING GENERATION
  // =====================

  // Lock all interactive UI elements during generation
  function lockUI() {
    isGenerating = true;
    document.body.classList.add('generating');
  }

  // Unlock all interactive UI elements after generation
  function unlockUI() {
    isGenerating = false;
    document.body.classList.remove('generating');
  }

  // Global click handler: shake-reject any click on interactive elements during generation
  document.addEventListener('click', (e) => {
    if (!isGenerating) return;
    
    const target = e.target.closest('button, select, .page-item, .history-item, a, [role="button"], #modelToggle');
    if (!target) return;
    // Allow nothing except reading — block all interactive clicks
    if (target === elements.generateBtn) return; // already handled by its own disabled state
    
    e.preventDefault();
    e.stopPropagation();
    
    // Trigger red shake animation
    target.classList.remove('shake-reject');
    // Force reflow to restart animation
    void target.offsetWidth;
    target.classList.add('shake-reject');
    target.addEventListener('animationend', () => {
      target.classList.remove('shake-reject');
    }, { once: true });
  }, true); // Use capture phase to intercept before other handlers

  // =====================
  // INSPECT MODE FUNCTIONS
  // =====================

  // Toggle inspect mode
  function toggleInspectMode() {
    isInspectMode = !isInspectMode;
    
    if (isInspectMode) {
      elements.inspectBtn.classList.add('active');
      elements.previewFrame.parentElement.classList.add('inspect-mode');
      showStatus('🎯 Chế độ Inspect: Click vào phần tử trong preview để chọn', 'info');
      enableInspectInIframe();
    } else {
      elements.inspectBtn.classList.remove('active');
      elements.previewFrame.parentElement.classList.remove('inspect-mode');
      disableInspectInIframe();
    }
  }

  // Enable inspect mode in iframe (via sandbox postMessage)
  function enableInspectInIframe() {
    postToSandbox({ type: 'ENABLE_INSPECT' });
  }

  // Disable inspect mode in iframe (via sandbox postMessage)
  function disableInspectInIframe() {
    postToSandbox({ type: 'DISABLE_INSPECT' });
  }

  // Highlight selected element (via sandbox postMessage)
  function highlightSelectedElement(selector) {
    postToSandbox({ type: 'HIGHLIGHT_ELEMENT', selector: selector });
  }

  // Clear all highlights (via sandbox postMessage)
  function clearHighlights() {
    postToSandbox({ type: 'CLEAR_HIGHLIGHTS' });
  }

  // Clean gemini inspect artifacts from HTML
  function cleanHTMLForSave(html) {
    if (!html) return html;
    // Remove sandbox bridge script
    html = html.replace(/<script id="__sandbox_bridge__">[\s\S]*?<\/script>/gi, '');
    // Remove gemini-selected-element and gemini-hover-highlight classes
    html = html.replace(/\s*class="gemini-selected-element"/gi, '');
    html = html.replace(/\s*class="gemini-hover-highlight"/gi, '');
    html = html.replace(/\s+gemini-selected-element/gi, '');
    html = html.replace(/\s+gemini-hover-highlight/gi, '');
    html = html.replace(/\s+gemini-inspect-active/gi, '');
    // Remove the injected style block
    html = html.replace(/<style id="gemini-inspect-styles">[\s\S]*?<\/style>/gi, '');
    // Clean up empty class attributes left behind
    html = html.replace(/\s+class="\s*"/gi, '');
    return html;
  }

  // Clear element selection
  function clearElementSelection() {
    clearHighlights();
    
    selectedElement = null;
    selectedPath = null;
    
    // Update UI
    elements.selectedElementInfo.classList.add('hidden');
    elements.editModeLabel.classList.add('hidden');
    elements.generateBtn.classList.remove('edit-mode');
    const btnText = elements.generateBtn.querySelector('.btn-text');
    if (btnText) {
      btnText.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg> Tạo HTML`;
    }
    elements.promptInput.placeholder = 'Ví dụ: Tạo trang landing page cho quán cà phê với màu nâu ấm áp, có hero section với hình nền gradient, menu sản phẩm dạng card, và footer với thông tin liên hệ...';
    
    showStatus('Đã bỏ chọn phần tử', 'info');
  }

  // =====================
  // NETLIFY DEPLOY
  // =====================

  const NETLIFY_API = 'https://api.netlify.com/api/v1';

  // Load Netlify token from chrome.storage.local
  async function loadNetlifyToken() {
    return new Promise((resolve) => {
      chrome.storage.local.get('netlifyToken', (result) => {
        netlifyToken = result.netlifyToken || null;
        resolve();
      });
    });
  }

  // Save Netlify token to chrome.storage.local
  async function saveNetlifyToken(token) {
    netlifyToken = token;
    return new Promise((resolve) => {
      chrome.storage.local.set({ netlifyToken: token }, resolve);
    });
  }

  // Clear Netlify token
  async function clearNetlifyToken() {
    netlifyToken = null;
    return new Promise((resolve) => {
      chrome.storage.local.remove('netlifyToken', resolve);
    });
  }

  // Compute SHA1 hash using Web Crypto API
  async function sha1(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Create a new Netlify site
  async function netlifyCreateSite(token) {
    const response = await fetch(`${NETLIFY_API}/sites`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (response.status === 401) {
      throw new Error('TOKEN_INVALID');
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Netlify API error: ${response.status} - ${text}`);
    }

    return await response.json();
  }

  // Deploy HTML to a Netlify site using file digest method
  async function netlifyDeploy(token, siteId, html) {
    // Step 1: Compute SHA1 of the HTML content
    const hash = await sha1(html);

    // Step 2: Create deploy with file digest
    const deployResponse = await fetch(`${NETLIFY_API}/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: { '/index.html': hash }
      })
    });

    if (deployResponse.status === 401) {
      throw new Error('TOKEN_INVALID');
    }

    if (deployResponse.status === 404) {
      throw new Error('SITE_NOT_FOUND');
    }

    if (!deployResponse.ok) {
      const text = await deployResponse.text();
      throw new Error(`Deploy error: ${deployResponse.status} - ${text}`);
    }

    const deploy = await deployResponse.json();

    // Step 3: Upload the file if required
    if (deploy.required && deploy.required.includes(hash)) {
      const uploadResponse = await fetch(`${NETLIFY_API}/deploys/${deploy.id}/files/index.html`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/octet-stream'
        },
        body: html
      });

      if (!uploadResponse.ok) {
        const text = await uploadResponse.text();
        throw new Error(`Upload error: ${uploadResponse.status} - ${text}`);
      }
    }

    return deploy;
  }

  // Main deploy handler
  async function handleDeploy() {
    if (!currentHTML) {
      showStatus('Không có HTML để deploy', 'error');
      return;
    }

    if (!currentPageId) {
      showStatus('Vui lòng chọn page trước', 'error');
      return;
    }

    if (!netlifyToken) {
      showNetlifyPanel();
      return;
    }

    // Start deploying
    elements.deployBtn.classList.add('deploying');
    showStatus('Đang deploy lên Netlify...', 'info');

    try {
      const page = await htmlDB.getPage(currentPageId);
      let siteId = page?.netlifySiteId;
      let siteUrl = page?.netlifySiteUrl;

      // Create site if this page doesn't have one yet
      if (!siteId) {
        showStatus('Đang tạo site mới trên Netlify...', 'info');
        const site = await netlifyCreateSite(netlifyToken);
        siteId = site.id;
        siteUrl = site.ssl_url || site.url;
        await htmlDB.updatePage(currentPageId, {
          netlifySiteId: siteId,
          netlifySiteUrl: siteUrl
        });
      }

      // Deploy the HTML
      await netlifyDeploy(netlifyToken, siteId, currentHTML);

      elements.deployBtn.classList.remove('deploying');
      elements.deployBtn.classList.add('deployed');
      showDeployedUrl(siteUrl);
      showStatus('Deploy thành công!', 'success');

    } catch (error) {
      elements.deployBtn.classList.remove('deploying');
      console.error('Deploy error:', error);

      if (error.message === 'TOKEN_INVALID') {
        await clearNetlifyToken();
        showNetlifyPanel();
        showStatus('Token không hợp lệ hoặc đã hết hạn. Vui lòng kết nối lại.', 'error');
        return;
      }

      if (error.message === 'SITE_NOT_FOUND') {
        // Site was deleted on Netlify, create a new one and retry
        showStatus('Site đã bị xóa, đang tạo lại...', 'info');
        try {
          const site = await netlifyCreateSite(netlifyToken);
          await htmlDB.updatePage(currentPageId, {
            netlifySiteId: site.id,
            netlifySiteUrl: site.ssl_url || site.url
          });
          await netlifyDeploy(netlifyToken, site.id, currentHTML);
          elements.deployBtn.classList.add('deployed');
          showDeployedUrl(site.ssl_url || site.url);
          showStatus('Deploy thành công!', 'success');
        } catch (retryError) {
          console.error('Retry deploy error:', retryError);
          showStatus('Không thể deploy: ' + retryError.message, 'error');
        }
        return;
      }

      showStatus('Lỗi deploy: ' + error.message, 'error');
    }
  }

  // Show/hide Netlify connect panel
  function showNetlifyPanel() {
    elements.netlifyPanel.classList.remove('hidden');
    elements.netlifyTokenInput.value = '';
    elements.netlifyTokenInput.focus();
  }

  function hideNetlifyPanel() {
    elements.netlifyPanel.classList.add('hidden');
  }

  // Show/hide deployed URL bar
  function showDeployedUrl(url) {
    if (!url) return;
    elements.deployedUrlBar.classList.remove('hidden');
    elements.deployedUrl.href = url;
    elements.deployedUrl.textContent = url;
    elements.deployBtn.classList.add('deployed');
  }

  function hideDeployedUrl() {
    elements.deployedUrlBar.classList.add('hidden');
    elements.deployedUrl.href = '#';
    elements.deployedUrl.textContent = '';
    elements.deployBtn.classList.remove('deployed');
  }

  // =====================
  // LINK NAVIGATION
  // =====================

  // Extract page name from href
  function extractPageNameFromHref(href) {
    if (!href) return '';
    // Remove query string and hash
    let name = href.split('?')[0].split('#')[0];
    // Get filename only (strip path)
    const lastSlash = name.lastIndexOf('/');
    if (lastSlash !== -1) name = name.substring(lastSlash + 1);
    // Remove file extension
    name = name.replace(/\.(html?|php|asp|jsp)$/i, '');
    // Skip empty or index
    if (!name || name.toLowerCase() === 'index') return '';
    // Replace hyphens and underscores with spaces
    name = name.replace(/[-_]/g, ' ');
    // Capitalize each word
    name = name.replace(/\b\w/g, c => c.toUpperCase());
    return name.trim();
  }

  // Handle link click from preview iframe
  async function handlePreviewLinkClick(href) {
    if (isGenerating) return;

    const pageName = extractPageNameFromHref(href)  || 'Trang Mới ' + Date.now();
    if (!pageName) {
      showStatus('Liên kết không hợp lệ', 'info');
      return;
    }

    // Check if a page with this name already exists
    const pages = await htmlDB.getAllPages();
    const matchedPage = pages.find(p =>
      p.name.toLowerCase() === pageName.toLowerCase()
    );

    if (matchedPage) {
      // Page exists, navigate to it
      await selectPage(matchedPage.id);
      await loadPages();
      showStatus(`Đã chuyển sang trang "${matchedPage.name}"`, 'success');
    } else {
      // Page doesn't exist, show confirmation modal
      showLinkModal(pageName);
    }
  }

  // Show link navigation modal
  function showLinkModal(pageName) {
    pendingLinkPageName = pageName;
    designContextHTML = currentHTML;
    elements.linkModalPageName.textContent = pageName;
    elements.linkModalPromptInput.value = `Thay nội dung chính thành nội dung phù hợp cho trang ${pageName}. Giữ nguyên toàn bộ style, header, footer, nav.`;
    clearModalGhostText();
    cancelAISuggestion();
    elements.linkModal.classList.remove('hidden');
    setTimeout(() => {
      elements.linkModalPromptInput.focus();
      elements.linkModalPromptInput.select();
    }, 100);
  }

  // Hide link navigation modal
  function hideLinkModal() {
    elements.linkModal.classList.add('hidden');
    pendingLinkPageName = null;
    isLinkModalGhostActive = false;
    clearModalGhostText();
    cancelAISuggestion();
  }

  // Confirm creating a linked page
  async function confirmCreateLinkedPage() {
    if (!pendingLinkPageName) return;

    const pageName = pendingLinkPageName;
    const contextHTML = designContextHTML;
    const userPrompt = elements.linkModalPromptInput.value.trim() || `Thay nội dung chính thành nội dung phù hợp cho trang ${pageName}. Giữ nguyên toàn bộ style, header, footer, nav.`;
    hideLinkModal();

    try {
      // Create the new page
      const pageId = await htmlDB.createPage(pageName);
      currentPageId = pageId;
      await loadPages();
      await loadHistory();

      // Set the design context so generateHTML treats it as a modification
      currentHTML = contextHTML;
      isReverted = false;
      revertedFromPrompt = '';

      // Clear any element selection from previous page
      clearElementSelection();

      // Show empty preview temporarily
      showEmptyPreview();
      hideDeployedUrl();

      // Set the user's prompt from the modal into the main prompt input
      elements.promptInput.value = userPrompt;
      clearGhostText();
      cancelAISuggestion();

      showStatus(`Đã tạo trang "${pageName}", đang tạo nội dung...`, 'success');

      // Auto-trigger generation
      elements.generateBtn.click();
    } catch (error) {
      console.error('Failed to create linked page:', error);
      showStatus('Không thể tạo trang mới', 'error');
    }
  }
});
