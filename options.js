// Options Page Controller
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize database
  await htmlDB.init();

  // DOM Elements
  const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
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
    editModeLabel: document.getElementById('editModeLabel')
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
  
  // Inspect mode state
  let isInspectMode = false;
  let selectedElement = null;
  let selectedPath = null; // CSS selector path to the element

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
  elements.previewFrame.addEventListener('load', setupPreviewInspector);

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
    }
  });

  // Initialize function
  async function init() {
    try {
      // Check Gemini connection status
      await checkGeminiStatus();

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
    const statusDot = elements.connectionStatus?.querySelector('.status-dot');
    const statusText = elements.connectionStatus?.querySelector('.status-text');

    if (state === 'opening') {
      if (statusDot) statusDot.className = 'status-dot connecting';
      if (statusText) statusText.textContent = 'Đang mở...';
      return;
    }

    if (connected) {
      if (statusDot) statusDot.className = 'status-dot connected';
      if (statusText) statusText.textContent = 'Đã kết nối';
    } else {
      if (statusDot) statusDot.className = 'status-dot disconnected';
      if (statusText) statusText.textContent = 'Chưa kết nối';
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
        elements.promptInput.value = page.lastPrompt || '';
      }
      
      // Clear revert state when switching pages
      isReverted = false;
      revertedFromPrompt = '';
      
      // Load page history
      await loadHistory();
      
      // Clear element selection
      clearElementSelection();
      
    } catch (error) {
      console.error('Failed to select page:', error);
      showStatus('Không thể chọn page', 'error');
    }
  }

  // Delete a page
  async function deletePage(pageId) {
    const pages = await htmlDB.getAllPages();
    if (pages.length <= 1) {
      showStatus('Cần ít nhất 1 page', 'error');
      return;
    }
    
    if (!confirm('Bạn có chắc muốn xóa page này và toàn bộ lịch sử?')) return;
    
    try {
      await htmlDB.deletePage(pageId);
      
      // If deleted current page, select another
      if (currentPageId === pageId) {
        const remainingPages = await htmlDB.getAllPages();
        if (remainingPages.length > 0) {
          await selectPage(remainingPages[0].id);
        }
      }
      
      await loadPages();
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
    
    // Clear and disable prompt input during generation
    elements.promptInput.value = '';
    elements.promptInput.disabled = true;
    elements.promptInput.placeholder = 'Đang tạo HTML...';
    
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
      // Truncate HTML if too long to fit in prompt context
      const maxHtmlContext = 15000;
      let htmlContext = currentHTML;
      if (htmlContext.length > maxHtmlContext) {
        htmlContext = htmlContext.substring(0, maxHtmlContext) + '\n... (truncated)';
      }
      
      const revertNote = isReverted ? '\nNOTE: I have reverted to a previous version of this page. ' : '';
      
      finalPrompt = `You are an HTML editor. You will receive an existing HTML file and a modification request.
Your job is to apply ONLY the requested change and return the FULL modified HTML file.${revertNote}

CURRENT HTML CODE:
${htmlContext}

MODIFICATION REQUEST: ${prompt}

CRITICAL RULES:
1. Copy the ENTIRE existing <style> block as-is. Do NOT remove, simplify, or rewrite any CSS property (padding, margin, gap, font-size, colors, gradients, shadows, border-radius, etc.)
2. Only ADD or MODIFY the specific CSS/HTML related to the request
3. Keep ALL existing HTML structure, class names, ids, and attributes unchanged unless the request specifically asks to change them
4. Keep ALL existing content (text, emojis, links) unless the request specifically asks to change them
5. Do NOT reorganize, reformat, or "clean up" any code
6. Return the COMPLETE HTML file starting with <!DOCTYPE html>
7. The output must be ONLY HTML code, no explanation, no markdown`;
      
      isModification = true;
      console.log('Sending modification prompt with HTML context, length:', currentHTML.length);
    }
    
    // If element is selected, modify the prompt for element-specific editing
    let elementTag = '';
    if (selectedPath) {
      try {
        const iframe = elements.previewFrame;
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const currentElement = iframeDoc.querySelector(selectedPath);
        
        if (currentElement) {
          const elementHTML = currentElement.outerHTML;
          elementTag = currentElement.tagName.toLowerCase();
          
          // Get inner HTML for context
          const innerContent = currentElement.innerHTML;
          
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
    if (message.html && (message.html.includes('<!DOCTYPE') || message.html.includes('<html'))) {
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
    
    // Try error message if it might contain HTML
    if (!html && message.error) {
      html = tryExtractHTML(message.error);
    }
    
    console.log('Extracted HTML length:', html?.length || 0);
    console.log('HTML preview:', html?.substring(0, 200) || 'null');

    if (html || (selectedPath && (message.rawText || message.html))) {
      // Check if we're in element edit mode
      if (selectedPath) {
        // Replace only the selected element's content
        try {
          const iframe = elements.previewFrame;
          const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
          const targetElement = iframeDoc.querySelector(selectedPath);
          
          if (targetElement) {
            // For element edit, prefer rawText/html from message over extracted full-doc html
            // because extractInnerContent is smarter at handling the raw response
            let rawContent = message.html || message.rawText || html || '';
            const newContent = extractInnerContent(rawContent, selectedPath);
            
            console.log('Element edit - raw:', rawContent.substring(0, 200));
            console.log('Element edit - extracted:', newContent.substring(0, 200));
            
            if (!newContent || newContent.length < 2) {
              showStatus('Không thể trích xuất nội dung HTML từ phản hồi AI', 'error');
              return;
            }
            
            targetElement.innerHTML = newContent;
            
            // Update selectedElement reference to the new element
            selectedElement = targetElement;
            
            // Update currentHTML with the modified document (clean inspect artifacts)
            currentHTML = '<!DOCTYPE html>\n' + iframeDoc.documentElement.outerHTML;
            currentHTML = cleanHTMLForSave(currentHTML);
            
            // Clear revert state after successful element edit
            isReverted = false;
            revertedFromPrompt = '';
            
            // Save to IndexedDB with page ID
            const prompt = elements.promptInput.value.trim();
            if (currentPageId) {
              await htmlDB.saveHTML(currentPageId, prompt, currentHTML);
              await htmlDB.updatePage(currentPageId, { lastHtml: currentHTML, lastPrompt: prompt });
            }
            
            // Reload history
            await loadHistory();
            
            showStatus('Đã cập nhật phần tử thành công!', 'success');
            
            // Keep selection active for further edits
            highlightSelectedElement(targetElement);
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
        const prompt = elements.promptInput.value.trim();
        if (currentPageId) {
          await htmlDB.saveHTML(currentPageId, prompt, html);
          await htmlDB.updatePage(currentPageId, { lastHtml: html, lastPrompt: prompt });
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

  // Update preview iframe
  function updatePreview(html) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    elements.previewFrame.src = url;
    
    // Setup inspector after iframe loads (with small delay to ensure DOM is ready)
    setTimeout(() => {
      setupPreviewInspector();
    }, 100);
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
    elements.status.textContent = message;
    elements.status.className = `status-bar ${type}`;
    elements.status.classList.remove('hidden');

    // Auto hide after 3 seconds (except for info during generation)
    if (type !== 'info' || !elements.generateBtn.classList.contains('loading')) {
      setTimeout(() => {
        elements.status.classList.add('hidden');
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
    
    const target = e.target.closest('button, select, .page-item, .history-item, a, [role="button"]');
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

  // Setup preview inspector when iframe loads
  function setupPreviewInspector() {
    try {
      const iframe = elements.previewFrame;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      if (!iframeDoc || !iframeDoc.body) return;
      
      // Inject inspect styles
      injectInspectStyles(iframeDoc);
      
      // If inspect mode is active, re-enable it
      if (isInspectMode) {
        enableInspectInIframe();
      }
      
      // If there was a selected element, try to re-select it
      if (selectedPath) {
        const element = iframeDoc.querySelector(selectedPath);
        if (element) {
          highlightSelectedElement(element);
        }
      } else {
        // No active selection — clean any leftover gemini highlights from saved HTML
        // Keep the style element (it only applies when classes are present)
        const leftover = iframeDoc.querySelectorAll('.gemini-selected-element, .gemini-hover-highlight');
        leftover.forEach(el => {
          el.classList.remove('gemini-selected-element');
          el.classList.remove('gemini-hover-highlight');
        });
        iframeDoc.body?.classList.remove('gemini-inspect-active');
      }
    } catch (e) {
      console.log('Cannot setup inspector:', e);
    }
  }

  // Inject inspect styles into iframe
  function injectInspectStyles(iframeDoc) {
    const styleId = 'gemini-inspect-styles';
    if (iframeDoc.getElementById(styleId)) return;
    
    const style = iframeDoc.createElement('style');
    style.id = styleId;
    style.textContent = `
      .gemini-hover-highlight {
        outline: 2px dashed #00ff88 !important;
        outline-offset: 2px !important;
        background-color: rgba(0, 255, 136, 0.1) !important;
        cursor: crosshair !important;
      }
      .gemini-selected-element {
        outline: 3px solid #00ff88 !important;
        outline-offset: 2px !important;
        background-color: rgba(0, 255, 136, 0.15) !important;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.3) !important;
      }
      .gemini-inspect-active * {
        cursor: crosshair !important;
      }
    `;
    iframeDoc.head.appendChild(style);
  }

  // Enable inspect mode in iframe
  function enableInspectInIframe() {
    try {
      const iframe = elements.previewFrame;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      if (!iframeDoc || !iframeDoc.body) return;
      
      iframeDoc.body.classList.add('gemini-inspect-active');
      
      // Add event listeners
      iframeDoc.body.addEventListener('mouseover', handleInspectHover);
      iframeDoc.body.addEventListener('mouseout', handleInspectMouseOut);
      iframeDoc.body.addEventListener('click', handleInspectClick);
    } catch (e) {
      console.log('Cannot enable inspect in iframe:', e);
    }
  }

  // Disable inspect mode in iframe
  function disableInspectInIframe() {
    try {
      const iframe = elements.previewFrame;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      if (!iframeDoc || !iframeDoc.body) return;
      
      iframeDoc.body.classList.remove('gemini-inspect-active');
      
      // Remove hover highlights
      const highlighted = iframeDoc.querySelectorAll('.gemini-hover-highlight');
      highlighted.forEach(el => el.classList.remove('gemini-hover-highlight'));
      
      // Remove event listeners
      iframeDoc.body.removeEventListener('mouseover', handleInspectHover);
      iframeDoc.body.removeEventListener('mouseout', handleInspectMouseOut);
      iframeDoc.body.removeEventListener('click', handleInspectClick);
    } catch (e) {
      console.log('Cannot disable inspect in iframe:', e);
    }
  }

  // Handle hover during inspect
  function handleInspectHover(e) {
    if (!isInspectMode) return;
    e.stopPropagation();
    
    const target = e.target;
    if (target === e.currentTarget) return; // Don't highlight body itself
    if (target.classList.contains('gemini-selected-element')) return;
    
    target.classList.add('gemini-hover-highlight');
  }

  // Handle mouse out during inspect
  function handleInspectMouseOut(e) {
    if (!isInspectMode) return;
    e.stopPropagation();
    
    const target = e.target;
    target.classList.remove('gemini-hover-highlight');
  }

  // Handle click during inspect
  function handleInspectClick(e) {
    if (!isInspectMode) return;
    e.preventDefault();
    e.stopPropagation();
    
    const target = e.target;
    if (target === e.currentTarget) return; // Don't select body itself
    
    // Remove hover highlight
    target.classList.remove('gemini-hover-highlight');
    
    // Select the element
    selectElement(target);
    
    // Turn off inspect mode
    toggleInspectMode();
  }

  // Select an element for editing
  function selectElement(element) {
    // Clear previous selection
    clearHighlights();
    
    // Store the element and generate a unique selector
    selectedElement = element;
    selectedPath = generateUniqueSelector(element);
    
    // Highlight the selected element
    highlightSelectedElement(element);
    
    // Update UI
    elements.selectedElementInfo.classList.remove('hidden');
    elements.selectedSelector.textContent = selectedPath;
    elements.editModeLabel.classList.remove('hidden');
    elements.generateBtn.classList.add('edit-mode');
    const btnText = elements.generateBtn.querySelector('.btn-text');
    if (btnText) {
      btnText.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> Chỉnh sửa`;
    }
    
    // Update placeholder
    elements.promptInput.placeholder = `Mô tả thay đổi cho ${element.tagName.toLowerCase()}. Ví dụ: "Đổi màu nền sang xanh", "Thêm animation fade-in", "Thêm 2 card mới"...`;
    
    showStatus(`Đã chọn: <${element.tagName.toLowerCase()}>. Nhập yêu cầu chỉnh sửa.`, 'success');
  }

  // Generate unique CSS selector for element
  function generateUniqueSelector(element) {
    const path = [];
    let current = element;
    
    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();
      
      // Add ID if available
      if (current.id) {
        selector = `#${current.id}`;
        path.unshift(selector);
        break; // ID is unique, no need to go further
      }
      
      // Add classes
      if (current.className && typeof current.className === 'string') {
        const classes = current.className
          .split(' ')
          .filter(c => c && !c.startsWith('gemini-'))
          .slice(0, 2);
        if (classes.length > 0) {
          selector += '.' + classes.join('.');
        }
      }
      
      // Add nth-child for uniqueness
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += `:nth-of-type(${index})`;
        }
      }
      
      path.unshift(selector);
      current = current.parentElement;
    }
    
    return path.join(' > ');
  }

  // Highlight selected element
  function highlightSelectedElement(element) {
    element.classList.add('gemini-selected-element');
  }

  // Clear all highlights
  function clearHighlights() {
    try {
      const iframe = elements.previewFrame;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      
      if (!iframeDoc) return;
      
      const highlighted = iframeDoc.querySelectorAll('.gemini-selected-element, .gemini-hover-highlight');
      highlighted.forEach(el => {
        el.classList.remove('gemini-selected-element');
        el.classList.remove('gemini-hover-highlight');
      });
    } catch (e) {
      console.log('Cannot clear highlights:', e);
    }
  }

  // Clean gemini inspect artifacts from HTML (classes, styles injected into iframe)
  function cleanHTMLForSave(html) {
    if (!html) return html;
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
});
