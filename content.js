// Content Script - Runs on gemini.google.com
// This script communicates with the page and extension

(function() {
  'use strict';
  
  // Check if already initialized
  if (window.__geminiHtmlBuilderInitialized) {
    console.log('Gemini HTML Builder: Re-injecting script...');
    // Just re-inject the page script
    injectPageScript();
    return;
  }
  window.__geminiHtmlBuilderInitialized = true;
  
  console.log('Gemini HTML Builder: Content script loaded at', new Date().toISOString());

  // State
  let isGenerating = false;
  let injectedScriptReady = false;

  // Notify background that content script is ready
  chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });

  // Inject the API script into the page context
  function injectPageScript() {
    // Remove old script if exists
    const oldScript = document.getElementById('gemini-html-builder-injected');
    if (oldScript) {
      oldScript.remove();
    }
    
    // Reset ready state when re-injecting
    injectedScriptReady = false;
    
    const script = document.createElement('script');
    script.id = 'gemini-html-builder-injected';
    script.src = chrome.runtime.getURL('injected.js');
    script.onload = function() {
      console.log('Injected script element loaded');
    };
    script.onerror = function(e) {
      console.error('Failed to load injected script:', e);
    };
    (document.head || document.documentElement).appendChild(script);
  }
  
  // Make function available globally for re-injection
  window.injectPageScript = injectPageScript;

  // Inject script
  injectPageScript();

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received:', message.type);

    // Handle PING for connection check
    if (message.type === 'PING') {
      sendResponse({ pong: true, injectedReady: injectedScriptReady });
      return true;
    }

    if (message.type === 'GENERATE_REQUEST') {
      // Reset isGenerating if it's been stuck
      if (isGenerating) {
        console.log('Warning: Previous generation in progress, forcing new request');
      }

      // If injected script not ready, wait for it
      if (!injectedScriptReady) {
        console.log('Injected script not ready, waiting...');
        let attempts = 0;
        const checkReady = setInterval(() => {
          attempts++;
          console.log('Checking injected script ready, attempt:', attempts, 'ready:', injectedScriptReady);
          if (injectedScriptReady) {
            clearInterval(checkReady);
            doGenerate(message);
          } else if (attempts > 30) { // 3 seconds timeout
            clearInterval(checkReady);
            console.error('Injected script timeout');
            sendResponse({ success: false, error: 'Script timeout. Vui lòng refresh trang Gemini.' });
          }
        }, 100);
        return true;
      }

      doGenerate(message);
      sendResponse({ success: true, status: 'started' });
      return true;
    }

    return false;
  });

  function doGenerate(message) {
    isGenerating = true;
    console.log('Sending generate request to injected script');
    
    window.postMessage({
      type: 'GEMINI_GENERATE_REQUEST',
      prompt: message.prompt,
      modelType: message.modelType || 'flash',
      conversationId: message.conversationId,
      responseId: message.responseId,
      choiceId: message.choiceId,
      pageId: message.pageId
    }, '*');
  }

  // Listen for responses from injected script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    const data = event.data;

    if (data.type === 'GEMINI_INJECTED_READY') {
      console.log('Injected script ready signal received');
      injectedScriptReady = true;
    }

    if (data.type === 'GEMINI_GENERATE_RESULT') {
      isGenerating = false;
      
      chrome.runtime.sendMessage({
        type: 'GENERATION_RESULT',
        success: data.success,
        html: data.html,
        rawText: data.rawText || '',
        error: data.error,
        conversationId: data.conversationId,
        responseId: data.responseId,
        choiceId: data.choiceId
      });
    }

    if (data.type === 'GEMINI_GENERATE_PROGRESS') {
      chrome.runtime.sendMessage({
        type: 'GENERATION_PROGRESS',
        text: data.text
      });
    }
  });

  // Re-notify on page load
  window.addEventListener('load', () => {
    isGenerating = false;
    setTimeout(() => {
      chrome.runtime.sendMessage({ type: 'CONTENT_SCRIPT_READY' });
    }, 1000);
  });

})();
