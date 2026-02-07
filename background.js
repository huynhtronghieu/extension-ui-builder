// Background Service Worker
// Handles communication between content script and options page

// Store for current state
let geminiTabId = null;
let optionsTabId = null;

// When extension icon is clicked, open options page
chrome.action.onClicked.addListener(async (tab) => {
  // Check if options page is already open
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('options.html') });
  
  if (tabs.length > 0) {
    // Focus existing options tab
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
    optionsTabId = tabs[0].id;
  } else {
    // Open new options page
    const newTab = await chrome.tabs.create({ url: 'options.html' });
    optionsTabId = newTab.id;
  }
});

// Find and connect to existing Gemini tab
async function findAndConnectGeminiTab() {
  try {
    const tabs = await chrome.tabs.query({ url: 'https://gemini.google.com/*' });
    
    for (const tab of tabs) {
      // Always try to inject/re-inject content script to ensure it's fresh
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        console.log('Injected content script to tab:', tab.id);
      } catch (injectError) {
        console.log('Script injection skipped (may already exist):', injectError.message);
      }
      
      // Wait for script to initialize
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Now try to ping
      try {
        const response = await sendMessageWithTimeout(tab.id, { type: 'PING' }, 3000);
        if (response && response.pong) {
          geminiTabId = tab.id;
          console.log('Connected to Gemini tab:', geminiTabId);
          notifyOptionsPage({ type: 'GEMINI_CONNECTED', tabId: geminiTabId });
          return { connected: true, tabId: geminiTabId };
        }
      } catch (e) {
        console.log('Tab not responding after injection:', e.message);
      }
    }
    
    return { connected: false };
  } catch (error) {
    console.error('Error finding Gemini tab:', error);
    return { connected: false };
  }
}

// Open Gemini tab and focus back to options
async function openGeminiAndFocusBack() {
  // Store current options tab
  const optionsTabs = await chrome.tabs.query({ url: chrome.runtime.getURL('options.html') });
  const currentOptionsTab = optionsTabs.length > 0 ? optionsTabs[0] : null;
  
  // Open Gemini tab
  const geminiTab = await chrome.tabs.create({ url: 'https://gemini.google.com/app?hl=vi' });
  
  // Wait for Gemini page to load and content script to be ready
  return new Promise((resolve) => {
    const checkReady = async (attempts = 0) => {
      if (attempts > 30) { // Max 15 seconds
        resolve({ success: false, error: 'Timeout waiting for Gemini' });
        return;
      }
      
      try {
        const response = await chrome.tabs.sendMessage(geminiTab.id, { type: 'PING' });
        if (response && response.pong) {
          geminiTabId = geminiTab.id;
          console.log('Gemini tab ready:', geminiTabId);
          
          // Focus back to options tab
          if (currentOptionsTab) {
            await chrome.tabs.update(currentOptionsTab.id, { active: true });
          }
          
          notifyOptionsPage({ type: 'GEMINI_CONNECTED', tabId: geminiTabId });
          resolve({ success: true, tabId: geminiTabId });
          return;
        }
      } catch (e) {
        // Not ready yet
      }
      
      setTimeout(() => checkReady(attempts + 1), 500);
    };
    
    // Start checking after a short delay
    setTimeout(() => checkReady(), 1000);
  });
}

// Ensure Gemini connection before sending request
async function ensureGeminiConnection(forceRecheck = false) {
  // First check if current geminiTabId is still valid
  if (geminiTabId && !forceRecheck) {
    try {
      const tab = await chrome.tabs.get(geminiTabId);
      if (tab) {
        const response = await sendMessageWithTimeout(geminiTabId, { type: 'PING' }, 2000);
        if (response && response.pong) {
          return { connected: true, tabId: geminiTabId };
        }
      }
    } catch (e) {
      console.log('Current Gemini tab not responding, will reconnect');
      geminiTabId = null;
    }
  }
  
  // Try to find existing Gemini tab
  const findResult = await findAndConnectGeminiTab();
  if (findResult.connected) {
    return findResult;
  }
  
  // No Gemini tab found, open a new one
  notifyOptionsPage({ type: 'GEMINI_OPENING' });
  const openResult = await openGeminiAndFocusBack();
  return openResult.success ? { connected: true, tabId: openResult.tabId } : { connected: false };
}

// Send message with timeout to avoid hanging
function sendMessageWithTimeout(tabId, message, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, timeout);
    
    chrome.tabs.sendMessage(tabId, message, (response) => {
      clearTimeout(timer);
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Listen for messages from content script and options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message.type);

  switch (message.type) {
    case 'CONTENT_SCRIPT_READY':
      // Content script is ready on Gemini page
      geminiTabId = sender.tab.id;
      console.log('Gemini tab ready:', geminiTabId);
      
      // Notify options page if open
      notifyOptionsPage({ type: 'GEMINI_CONNECTED', tabId: geminiTabId });
      sendResponse({ success: true });
      break;

    case 'GENERATE_HTML':
      // Ensure connection and forward request
      (async () => {
        // Force recheck connection before generating
        let connectionResult = await ensureGeminiConnection(true);
        
        if (!connectionResult.connected) {
          sendResponse({ success: false, error: 'Không thể kết nối Gemini. Vui lòng thử lại.' });
          return;
        }
        
        try {
          // Use timeout wrapper to prevent hanging
          const response = await sendMessageWithTimeout(geminiTabId, {
            type: 'GENERATE_REQUEST',
            prompt: message.prompt,
            isElementEdit: message.isElementEdit || false,
            modelType: message.modelType || 'flash',
            conversationId: message.conversationId,
            responseId: message.responseId,
            choiceId: message.choiceId,
            pageId: message.pageId
          }, 10000);
          
          sendResponse(response);
        } catch (error) {
          console.log('Generate request failed, trying to reconnect:', error.message);
          // Connection lost, try to reconnect once
          geminiTabId = null;
          connectionResult = await ensureGeminiConnection(true);
          
          if (connectionResult.connected) {
            try {
              const retryResponse = await sendMessageWithTimeout(geminiTabId, {
                type: 'GENERATE_REQUEST',
                prompt: message.prompt,
                isElementEdit: message.isElementEdit || false,
                modelType: message.modelType || 'flash',
                conversationId: message.conversationId,
                responseId: message.responseId,
                choiceId: message.choiceId,
                pageId: message.pageId
              }, 10000);
              sendResponse(retryResponse);
            } catch (retryError) {
              sendResponse({ success: false, error: 'Mất kết nối. Vui lòng refresh trang Gemini và thử lại.' });
            }
          } else {
            sendResponse({ success: false, error: 'Không thể kết nối lại. Vui lòng mở trang Gemini.' });
          }
        }
      })();
      return true; // Keep channel open for async response

    case 'GENERATION_RESULT':
      // Forward result from content script to options page
      notifyOptionsPage({
        type: 'HTML_GENERATED',
        success: message.success,
        html: message.html,
        rawText: message.rawText || '',
        isElementEdit: message.isElementEdit || false,
        error: message.error,
        conversationId: message.conversationId,
        responseId: message.responseId,
        choiceId: message.choiceId
      });
      sendResponse({ success: true });
      break;

    case 'GENERATION_PROGRESS':
      // Forward progress updates
      notifyOptionsPage({
        type: 'GENERATION_PROGRESS',
        text: message.text
      });
      break;

    case 'CHECK_GEMINI_STATUS':
      // Check if Gemini tab is connected (with auto-reconnect)
      (async () => {
        const result = await ensureGeminiConnection();
        sendResponse(result);
      })();
      return true;

    case 'ENSURE_CONNECTION':
      // Explicitly ensure connection (called before generate)
      (async () => {
        const result = await ensureGeminiConnection();
        sendResponse(result);
      })();
      return true;
  }

  return false;
});

// Notify options page
async function notifyOptionsPage(message) {
  try {
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('options.html') });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, message).catch(() => {});
    }
  } catch (e) {
    console.log('Options page not open');
  }
}

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === geminiTabId) {
    geminiTabId = null;
    // Don't notify disconnect immediately - let auto-reconnect handle it
    console.log('Gemini tab closed');
  }
});

// Listen for tab updates to detect when Gemini page is navigated to
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && tab.url.includes('gemini.google.com')) {
    // Gemini page loaded, try to connect
    setTimeout(async () => {
      try {
        const response = await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        if (response && response.pong) {
          geminiTabId = tabId;
          notifyOptionsPage({ type: 'GEMINI_CONNECTED', tabId: geminiTabId });
        }
      } catch (e) {
        // Content script not ready yet
      }
    }, 1000);
  }
});

console.log('Gemini HTML Builder background script loaded');
