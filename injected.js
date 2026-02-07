// Injected Script - Runs in page context of gemini.google.com
// Has access to page's fetch, cookies, etc.

(function() {
  'use strict';

  console.log('Gemini HTML Builder: Injected script loaded at', new Date().toISOString());

  // Notify content script that injected script is ready
  window.postMessage({ type: 'GEMINI_INJECTED_READY' }, '*');

  // API Configuration
  let API_CONFIG = {
    baseUrl: 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate',
    sessionId: null,
    requestId: Math.floor(Math.random() * 900000) + 100000,
    atValue: '', // SNlM0e token
    blValue: '', // bl parameter
    cfb2h: '', // cfb2h token
    conversationId: '',
    responseId: '',
    choiceId: ''
  };

  // Extract required tokens from page
  function extractTokens() {
    try {
      // Try to get SNlM0e (at value) from page
      const scripts = document.querySelectorAll('script');
      for (const script of scripts) {
        const text = script.textContent || '';
        
        // Extract SNlM0e
        const atMatch = text.match(/SNlM0e":"([^"]+)"/);
        if (atMatch) {
          API_CONFIG.atValue = atMatch[1];
          console.log('Found SNlM0e token');
        }

        // Extract cfb2h
        const cfbMatch = text.match(/cfb2h":"([^"]+)"/);
        if (cfbMatch) {
          API_CONFIG.cfb2h = cfbMatch[1];
        }

        // Extract bl value
        const blMatch = text.match(/bl":"([^"]+)"/);
        if (blMatch) {
          API_CONFIG.blValue = blMatch[1];
        }

        // Extract session ID (FdrFJe)
        const sidMatch = text.match(/FdrFJe":"(\d+)"/);
        if (sidMatch) {
          API_CONFIG.sessionId = sidMatch[1];
        }
      }

      // Fallback: try window object
      if (!API_CONFIG.atValue && window.WIZ_global_data) {
        API_CONFIG.atValue = window.WIZ_global_data.SNlM0e || '';
        API_CONFIG.cfb2h = window.WIZ_global_data.cfb2h || '';
      }

      // Default bl value if not found
      if (!API_CONFIG.blValue) {
        API_CONFIG.blValue = 'boq_assistant-bard-web-server_20260128.03_p2';
      }

      // Generate session ID if not found
      if (!API_CONFIG.sessionId) {
        API_CONFIG.sessionId = Math.floor(Math.random() * 9000000000000000000) + 1000000000000000000;
      }

      console.log('Tokens extracted:', {
        hasAt: !!API_CONFIG.atValue,
        hasBl: !!API_CONFIG.blValue,
        hasSid: !!API_CONFIG.sessionId
      });

      return !!API_CONFIG.atValue;
    } catch (e) {
      console.error('Error extracting tokens:', e);
      return false;
    }
  }

  // Generate UUID
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }

  // Build optimized prompt for HTML generation
  function buildOptimizedPrompt(userPrompt) {
    // Use a more direct prompt that forces immediate HTML output
    return `Generate HTML code only. No explanation, no markdown, no thinking.
    
Requirements: ${userPrompt}

Technical specs:
- Single HTML file with inline CSS in <style> tag
- Vietnamese content
- Responsive design
- Use emojis and CSS gradients instead of images
- Modern, clean UI

Start your response with exactly: <!DOCTYPE html>`;
  }

  // Build request body - match the curl format
  function buildRequestBody(prompt, options = {}) {
    const optimizedPrompt = buildOptimizedPrompt(prompt);
    const uuid = generateUUID();
    
    // Use conversation context from options if provided (for continuing conversation)
    const conversationId = options.conversationId || API_CONFIG.conversationId || "";
    const responseId = options.responseId || API_CONFIG.responseId || "";
    const choiceId = options.choiceId || API_CONFIG.choiceId || "";
    
    // Build the complex nested array structure that Gemini expects (from curl)
    const requestData = [
      [optimizedPrompt, 0, null, null, null, null, 0],
      ["vi"],
      [conversationId, responseId, choiceId, null, null, null, null, null, null, ""],
      "", // token placeholder
      uuid,
      null,
      [1],
      1,
      null,
      null,
      1,
      0,
      null,
      null,
      null,
      null,
      null,
      [[1]],
      0,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      1,
      null,
      null,
      [4],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      [2],
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      0,
      null,
      null,
      null,
      null,
      null,
      uuid,
      null,
      [],
      null,
      null,
      null,
      null,
      null,
      null,
      2
    ];

    // Encode the same way as curl
    const innerJson = JSON.stringify(requestData);
    const outerJson = JSON.stringify([null, innerJson]);
    
    return `f.req=${encodeURIComponent(outerJson)}&at=${encodeURIComponent(API_CONFIG.atValue)}&`;
  }

  // Build URL with parameters
  function buildUrl() {
    API_CONFIG.requestId += 1;
    const params = new URLSearchParams({
      'bl': API_CONFIG.blValue,
      'f.sid': API_CONFIG.sessionId.toString(),
      'hl': 'vi',
      '_reqid': API_CONFIG.requestId.toString(),
      'rt': 'c'
    });
    return `${API_CONFIG.baseUrl}?${params.toString()}`;
  }

  // Extract HTML from response
  function extractHTML(text) {
    if (!text) return '';

    // First, decode all unicode escapes
    text = decodeUnicodeEscapes(text);
    
    // Remove thinking markers like **text**
    text = text.replace(/\*\*[^*]+\*\*/g, '');

    // Try to find HTML code block first
    const codeBlockMatch = text.match(/```html\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
      return cleanHTML(codeBlockMatch[1]);
    }

    // Remove markdown code block markers if present
    text = text.replace(/```html\s*/gi, '');
    text = text.replace(/```\s*/g, '');

    // Try to find <!DOCTYPE html> or <html> directly
    const htmlMatch = text.match(/(<!DOCTYPE\s+html[\s\S]*?<\/html>)/i);
    if (htmlMatch) {
      return cleanHTML(htmlMatch[1]);
    }

    // Try alternative: find from <html> to </html>
    const htmlTagMatch = text.match(/(<html[\s\S]*?<\/html>)/i);
    if (htmlTagMatch) {
      return '<!DOCTYPE html>\n' + cleanHTML(htmlTagMatch[1]);
    }
    
    // Try to find HTML by looking for opening tags and building from there
    // This handles cases where thinking text comes before HTML
    const doctypeIndex = text.toLowerCase().indexOf('<!doctype');
    if (doctypeIndex !== -1) {
      const htmlEndIndex = text.toLowerCase().lastIndexOf('</html>');
      if (htmlEndIndex !== -1) {
        return cleanHTML(text.substring(doctypeIndex, htmlEndIndex + 7));
      }
    }
    
    const htmlStartIndex = text.toLowerCase().indexOf('<html');
    if (htmlStartIndex !== -1) {
      const htmlEndIndex = text.toLowerCase().lastIndexOf('</html>');
      if (htmlEndIndex !== -1) {
        return '<!DOCTYPE html>\n' + cleanHTML(text.substring(htmlStartIndex, htmlEndIndex + 7));
      }
    }

    // Try to find partial HTML (from title onwards)
    const titleMatch = text.match(/(<title>[\s\S]*<\/html>)/i);
    if (titleMatch) {
      return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
` + cleanHTML(titleMatch[1]);
    }

    // Try to find from <head> or <style>
    const headMatch = text.match(/(<head[\s\S]*<\/html>)/i);
    if (headMatch) {
      return '<!DOCTYPE html>\n<html lang="vi">\n' + cleanHTML(headMatch[1]);
    }

    const styleMatch = text.match(/(<style[\s\S]*<\/html>)/i);
    if (styleMatch) {
      return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page</title>
` + cleanHTML(styleMatch[1]);
    }

    return '';
  }

  // Decode unicode escapes like \u003c or \\u003c - handles multiple levels
  function decodeUnicodeEscapes(str) {
    if (!str) return str;
    
    let prev = '';
    let current = str;
    
    // Keep decoding until no more changes (handle multiple escape levels)
    while (prev !== current) {
      prev = current;
      
      // Handle triple-escaped: \\\\u003c
      current = current.replace(/\\\\\\\\u([0-9a-fA-F]{4})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      
      // Handle double-escaped: \\u003c
      current = current.replace(/\\\\u([0-9a-fA-F]{4})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
      
      // Handle single-escaped: \u003c
      current = current.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
    }
    
    // Also handle escaped backslashes and other escapes
    current = current.replace(/\\\\/g, '\\');
    current = current.replace(/\\n/g, '\n');
    current = current.replace(/\\t/g, '\t');
    current = current.replace(/\\r/g, '\r');
    current = current.replace(/\\"/g, '"');
    
    return current;
  }

  // Clean HTML string
  function cleanHTML(html) {
    // First decode all unicode escapes
    html = decodeUnicodeEscapes(html);
    
    // Remove markdown code blocks
    html = html.replace(/```html\s*/gi, '');
    html = html.replace(/```\s*/g, '');
    
    // Remove any remaining backslash escapes
    html = html.replace(/\\\[/g, '[');
    html = html.replace(/\\\]/g, ']');
    
    return html.trim();
  }

  // Deep search for HTML content in nested arrays
  function deepSearchForHTML(obj, depth = 0) {
    if (depth > 25) return null; // Prevent infinite recursion
    
    if (typeof obj === 'string') {
      // First decode the string
      const decoded = decodeUnicodeEscapes(obj);
      
      // Check if this string contains HTML
      if (decoded.includes('<!DOCTYPE') || decoded.includes('<html')) {
        return decoded;
      }
      // Also check for partial HTML that might be useful
      if (decoded.length > 200 && decoded.includes('<') && decoded.includes('>') && 
          (decoded.includes('<head') || decoded.includes('<body') || decoded.includes('<style'))) {
        return decoded;
      }
      return null;
    }
    
    if (Array.isArray(obj)) {
      // First pass: look for string elements that contain HTML
      for (const item of obj) {
        if (typeof item === 'string' && item.length > 100) {
          const decoded = decodeUnicodeEscapes(item);
          if (decoded.includes('<!DOCTYPE') || decoded.includes('<html') || decoded.includes('<head')) {
            return decoded;
          }
        }
      }
      
      // Second pass: recurse into arrays
      for (const item of obj) {
        const result = deepSearchForHTML(item, depth + 1);
        if (result) return result;
      }
    }
    
    return null;
  }

  // Parse streaming response - IMPROVED VERSION
  function parseResponse(responseText) {
    try {
      console.log('Parsing response, length:', responseText.length);
      
      let fullHtml = '';
      let allTextParts = [];
      let largestHtmlChunk = '';
      
      // First, try to find HTML directly in the raw response (handles deeply nested escaping)
      const rawDecoded = decodeUnicodeEscapes(responseText);
      const directHtmlMatch = rawDecoded.match(/(<!DOCTYPE html[\s\S]*?<\/html>)/i);
      if (directHtmlMatch) {
        largestHtmlChunk = directHtmlMatch[1];
        console.log('Found HTML directly in response, length:', largestHtmlChunk.length);
      }
      
      // Split by lines and find JSON chunks
      const lines = responseText.split('\n');
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines and number-only lines (chunk sizes)
        if (!line || /^\d+$/.test(line)) continue;
        
        // Look for wrb.fr response chunks
        if (line.includes('[["wrb.fr"') || line.startsWith('[[')) {
          try {
            const parsed = JSON.parse(line);
            
            if (parsed && Array.isArray(parsed)) {
              for (const item of parsed) {
                if (Array.isArray(item) && item[0] === 'wrb.fr' && item[2]) {
                  try {
                    const innerData = JSON.parse(item[2]);
                    
                    // Deep search for HTML in the nested structure
                    const foundHtml = deepSearchForHTML(innerData);
                    if (foundHtml && foundHtml.length > largestHtmlChunk.length) {
                      largestHtmlChunk = foundHtml;
                      console.log('Found larger HTML chunk, length:', largestHtmlChunk.length);
                    }
                    
                    // Also try specific paths known to contain response text
                    // Path: innerData[4][0][1][0] - main response text
                    if (innerData && innerData[4] && innerData[4][0] && innerData[4][0][1]) {
                      const responseArr = innerData[4][0][1];
                      if (Array.isArray(responseArr) && responseArr[0]) {
                        const textPart = decodeUnicodeEscapes(responseArr[0]);
                        if (textPart) allTextParts.push(textPart);
                      } else if (typeof responseArr === 'string') {
                        const textPart = decodeUnicodeEscapes(responseArr);
                        if (textPart) allTextParts.push(textPart);
                      }
                    }
                    
                    // Update conversation IDs for continuation
                    if (innerData && innerData[1]) {
                      if (innerData[1][0]) API_CONFIG.conversationId = innerData[1][0];
                      if (innerData[1][1]) API_CONFIG.responseId = innerData[1][1];
                    }
                    if (innerData && innerData[4] && innerData[4][0] && innerData[4][0][0]) {
                      API_CONFIG.choiceId = innerData[4][0][0];
                    }
                  } catch (e) {
                    // Inner parse failed, continue
                  }
                }
              }
            }
          } catch (e) {
            // Line parse failed, try to extract JSON from within the line
            const jsonMatch = line.match(/(\[\["wrb\.fr"[\s\S]*?\]\])/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[1]);
                const foundHtml = deepSearchForHTML(parsed);
                if (foundHtml && foundHtml.length > largestHtmlChunk.length) {
                  largestHtmlChunk = foundHtml;
                }
              } catch (e2) {}
            }
          }
        }
      }

      // Use the largest HTML chunk found
      if (largestHtmlChunk) {
        const htmlCode = extractHTML(largestHtmlChunk);
        if (htmlCode) {
          console.log('Extracted HTML, length:', htmlCode.length);
          return {
            success: true,
            html: htmlCode,
            rawText: largestHtmlChunk
          };
        }
      }

      // Try to combine text parts and extract HTML
      const combinedText = allTextParts.join('');
      if (combinedText) {
        const htmlCode = extractHTML(combinedText);
        if (htmlCode) {
          console.log('Extracted HTML from combined text, length:', htmlCode.length);
          return {
            success: true,
            html: htmlCode,
            rawText: combinedText
          };
        }
      }

      // Last resort: search entire decoded response for HTML
      if (rawDecoded) {
        const htmlCode = extractHTML(rawDecoded);
        if (htmlCode) {
          console.log('Extracted HTML from whole decoded response, length:', htmlCode.length);
          return {
            success: true,
            html: htmlCode,
            rawText: rawDecoded
          };
        }
      }

      console.log('Could not find HTML in response');
      console.log('Response preview (decoded):', rawDecoded.substring(0, 1000));
      return {
        success: false,
        html: '',
        rawText: combinedText || largestHtmlChunk || rawDecoded.substring(0, 5000),
        error: 'Không tìm thấy HTML trong response'
      };
    } catch (error) {
      console.error('Parse error:', error);
      return {
        success: false,
        html: '',
        rawText: '',
        error: error.message
      };
    }
  }

  // Main generate function via API
  async function generateHTML(prompt, options = {}) {
    try {
      // Extract tokens first
      if (!extractTokens()) {
        console.warn('Could not extract all tokens, trying anyway...');
      }

      if (!API_CONFIG.atValue) {
        throw new Error('Không tìm thấy token xác thực (SNlM0e). Vui lòng refresh trang Gemini (F5) và thử lại.');
      }

      const url = buildUrl();
      const body = buildRequestBody(prompt, options);

      console.log('Sending request to:', url);
      console.log('Request body preview:', body.substring(0, 200));
      console.log('Conversation context:', {
        conversationId: options.conversationId,
        responseId: options.responseId,
        choiceId: options.choiceId
      });

      // Send progress update
      window.postMessage({
        type: 'GEMINI_GENERATE_PROGRESS',
        text: 'Đang gửi yêu cầu đến Gemini...'
      }, '*');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'X-Same-Domain': '1',
        },
        body: body,
        credentials: 'include'
      });

      if (!response.ok) {
        console.error('HTTP Error:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response:', errorText.substring(0, 500));
        throw new Error(`HTTP Error: ${response.status} - Vui lòng refresh trang Gemini và thử lại`);
      }

      window.postMessage({
        type: 'GEMINI_GENERATE_PROGRESS',
        text: 'Đang xử lý phản hồi...'
      }, '*');

      const text = await response.text();
      console.log('Response received, length:', text.length);
      
      const result = parseResponse(text);

      if (!result.success || !result.html) {
        // Try to find HTML in raw text
        if (result.rawText && (result.rawText.includes('<!DOCTYPE') || result.rawText.includes('<html'))) {
          result.html = extractHTML(result.rawText);
          result.success = !!result.html;
        }
      }

      if (result.success) {
        console.log('HTML extracted successfully, length:', result.html.length);
        window.postMessage({
          type: 'GEMINI_GENERATE_RESULT',
          success: true,
          html: result.html,
          rawText: result.rawText || '',
          error: null,
          // Return conversation IDs for saving per page
          conversationId: API_CONFIG.conversationId,
          responseId: API_CONFIG.responseId,
          choiceId: API_CONFIG.choiceId
        }, '*');
      } else {
        console.log('Could not extract HTML from response');
        console.log('Raw text preview:', (result.rawText || '').substring(0, 500));
        // Still send rawText so element edit mode can try to extract content
        window.postMessage({
          type: 'GEMINI_GENERATE_RESULT',
          success: false,
          html: '',
          rawText: result.rawText || '',
          error: 'Không thể trích xuất HTML từ phản hồi. Hãy thử mô tả chi tiết hơn.',
          conversationId: API_CONFIG.conversationId,
          responseId: API_CONFIG.responseId,
          choiceId: API_CONFIG.choiceId
        }, '*');
      }

    } catch (error) {
      console.error('Gemini API Error:', error);
      window.postMessage({
        type: 'GEMINI_GENERATE_RESULT',
        success: false,
        html: '',
        error: error.message
      }, '*');
    }
  }

  // Listen for generate requests from content script
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;

    if (event.data.type === 'GEMINI_GENERATE_REQUEST') {
      console.log('Injected script: Received generate request');
      console.log('Model type:', event.data.modelType);
      console.log('Page ID:', event.data.pageId);
      
      generateHTML(event.data.prompt, {
        modelType: event.data.modelType,
        conversationId: event.data.conversationId,
        responseId: event.data.responseId,
        choiceId: event.data.choiceId
      });
    }
  });

  // Auto-extract tokens on load
  setTimeout(() => {
    extractTokens();
  }, 2000);

  console.log('Gemini HTML Builder: Injected script ready');
})();
