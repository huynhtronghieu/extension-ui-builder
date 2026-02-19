// Background Service Worker
// Handles communication between content script and options page

// Store for current state
let geminiTabId = null;
let optionsTabId = null;

// Persistent conversation context for AI suggestions
let suggestConversation = {
  conversationId: '',
  responseId: '',
  choiceId: ''
};

// Load suggest conversation from storage on startup
chrome.storage.local.get('suggestConversation', (result) => {
  if (result.suggestConversation) {
    suggestConversation = result.suggestConversation;
    console.log('Loaded suggestConversation from storage:', !!suggestConversation.conversationId);
  }
});

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
      // Content script is auto-injected by manifest.json, just ping directly
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
            isModification: message.isModification || false,
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
                isModification: message.isModification || false,
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

    case 'SUGGEST_COMPLETION':
      // Forward AI suggestion request to content script (fail silently)
      // Attach persisted conversation IDs so injected.js can continue the conversation
      (async () => {
        if (!geminiTabId) {
          sendResponse({ success: false });
          return;
        }
        try {
          await sendMessageWithTimeout(geminiTabId, {
            type: 'SUGGEST_REQUEST',
            text: message.text,
            requestId: message.requestId,
            conversationId: suggestConversation.conversationId,
            responseId: suggestConversation.responseId,
            choiceId: suggestConversation.choiceId
          }, 8000);
          sendResponse({ success: true });
        } catch (e) {
          sendResponse({ success: false });
        }
      })();
      return true;

    case 'SUGGESTION_RESULT':
      // Relay AI suggestion result back to options page
      notifyOptionsPage({
        type: 'SUGGESTION_COMPLETED',
        success: message.success,
        completion: message.completion || '',
        text: message.text || '',
        requestId: message.requestId
      });
      if (message.success) {
        // Persist updated conversation IDs on success
        if (message.suggestConversationId || message.suggestResponseId || message.suggestChoiceId) {
          if (message.suggestConversationId) suggestConversation.conversationId = message.suggestConversationId;
          if (message.suggestResponseId) suggestConversation.responseId = message.suggestResponseId;
          if (message.suggestChoiceId) suggestConversation.choiceId = message.suggestChoiceId;
          chrome.storage.local.set({ suggestConversation });
          console.log('Saved suggestConversation to storage');
        }
      } else if (suggestConversation.conversationId) {
        // Conversation may have been deleted — clear stale IDs so next request starts fresh
        suggestConversation = { conversationId: '', responseId: '', choiceId: '' };
        chrome.storage.local.remove('suggestConversation');
        console.log('Cleared stale suggestConversation after failure');
      }
      break;
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

console.log('UI Builder với Gemini AI background script loaded');
