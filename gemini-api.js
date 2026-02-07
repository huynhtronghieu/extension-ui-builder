// Gemini API Handler
class GeminiAPI {
  constructor() {
    this.baseUrl = 'https://gemini.google.com/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate';
    this.cookies = '';
    this.sessionId = this.generateSessionId();
    this.conversationId = '';
    this.responseId = '';
    this.choiceId = '';
    this.requestId = Math.floor(Math.random() * 900000) + 100000;
  }

  generateSessionId() {
    return Math.floor(Math.random() * 9000000000000000000) + 1000000000000000000;
  }

  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16).toUpperCase();
    });
  }

  setCookies(cookies) {
    this.cookies = cookies;
    // Save to chrome storage
    chrome.storage.local.set({ geminiCookies: cookies });
  }

  async loadCookies() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['geminiCookies'], (result) => {
        if (result.geminiCookies) {
          this.cookies = result.geminiCookies;
        }
        resolve(this.cookies);
      });
    });
  }

  // Optimized prompt to only return HTML code
  buildOptimizedPrompt(userPrompt) {
    return `Bạn là một chuyên gia HTML/CSS. Hãy tạo mã HTML hoàn chỉnh theo yêu cầu sau:

${userPrompt}

QUAN TRỌNG - QUY TẮC BẮT BUỘC:
1. CHỈ trả về mã HTML thuần túy, KHÔNG có bất kỳ giải thích nào
2. Bắt đầu NGAY với <!DOCTYPE html>
3. KHÔNG viết "Đây là code", "Dưới đây là", "``html" hay bất kỳ text nào khác
4. HTML phải đầy đủ: DOCTYPE, html, head (với meta charset, viewport, title, style), body
5. CSS được viết trong thẻ <style> trong <head>
6. Thiết kế phải responsive và đẹp mắt
7. Sử dụng Google Fonts nếu cần
8. KHÔNG sử dụng JavaScript external hoặc hình ảnh external hoặc emoji icon (có thể dùng gradient, hoặc inline SVG)

Trả về NGAY mã HTML:`;
  }

  buildRequestBody(prompt) {
    const uuid = this.generateUUID();
    const optimizedPrompt = this.buildOptimizedPrompt(prompt);
    
    // Build the complex nested array structure that Gemini expects
    const requestData = [
      [optimizedPrompt, 0, null, null, null, null, 0],
      ["vi"],
      [this.conversationId || "", this.responseId || "", this.choiceId || "", null, null, null, null, null, null, ""],
      null,
      null,
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

    return `f.req=${encodeURIComponent(JSON.stringify([null, JSON.stringify(requestData)]))}&`;
  }

  buildUrl() {
    this.requestId += 1;
    const params = new URLSearchParams({
      'bl': 'boq_assistant-bard-web-server_20260128.03_p2',
      'f.sid': this.sessionId.toString(),
      'hl': 'vi',
      '_reqid': this.requestId.toString(),
      'rt': 'c'
    });
    return `${this.baseUrl}?${params.toString()}`;
  }

  buildHeaders() {
    return {
      'accept': '*/*',
      'accept-language': 'en-US,en;q=0.9',
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'origin': 'https://gemini.google.com',
      'referer': 'https://gemini.google.com/',
      'sec-ch-ua': '"Not(A:Brand";v="8", "Chromium";v="144", "Google Chrome";v="144"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-origin',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
      'x-same-domain': '1'
    };
  }

  // Parse the streaming response to extract HTML
  parseResponse(responseText) {
    try {
      // Split by lines and find the JSON data
      const lines = responseText.split('\n');
      let fullText = '';
      let htmlCode = '';

      for (const line of lines) {
        if (line.startsWith('[["wrb.fr"')) {
          try {
            const parsed = JSON.parse(line);
            if (parsed && parsed[0] && parsed[0][2]) {
              const innerData = JSON.parse(parsed[0][2]);
              
              // Extract the response text from the nested structure
              if (innerData && innerData[4] && innerData[4][0] && innerData[4][0][1]) {
                const responseContent = innerData[4][0][1];
                if (Array.isArray(responseContent)) {
                  fullText = responseContent[0] || '';
                } else {
                  fullText = responseContent;
                }
              }

              // Update conversation IDs for next request
              if (innerData && innerData[1]) {
                this.conversationId = innerData[1][0] || '';
                this.responseId = innerData[1][1] || '';
              }
              if (innerData && innerData[4] && innerData[4][0] && innerData[4][0][0]) {
                this.choiceId = innerData[4][0][0] || '';
              }
            }
          } catch (e) {
            // Continue to next line if parsing fails
          }
        }
      }

      // Extract HTML code from the response
      htmlCode = this.extractHTML(fullText);
      
      return {
        success: !!htmlCode,
        html: htmlCode,
        rawText: fullText
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

  extractHTML(text) {
    if (!text) return '';

    // Try to find HTML code block first
    const codeBlockMatch = text.match(/```html\s*([\s\S]*?)```/i);
    if (codeBlockMatch) {
      return this.cleanHTML(codeBlockMatch[1]);
    }

    // Try to find <!DOCTYPE html> or <html> directly
    const htmlMatch = text.match(/(<!DOCTYPE html[\s\S]*<\/html>)/i);
    if (htmlMatch) {
      return this.cleanHTML(htmlMatch[1]);
    }

    // Try alternative: find from <html> to </html>
    const htmlTagMatch = text.match(/(<html[\s\S]*<\/html>)/i);
    if (htmlTagMatch) {
      return '<!DOCTYPE html>\n' + this.cleanHTML(htmlTagMatch[1]);
    }

    // If no HTML found, return empty
    return '';
  }

  cleanHTML(html) {
    // Unescape special characters
    return html
      .replace(/\\u003c/g, '<')
      .replace(/\\u003e/g, '>')
      .replace(/\\u003d/g, '=')
      .replace(/\\u0026/g, '&')
      .replace(/\\n/g, '\n')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\')
      .replace(/\\([<>!\/=#"'{}()\[\]:;,.])/g, '$1')
      .trim();
  }

  async generate(prompt, onProgress) {
    if (!this.cookies) {
      throw new Error('Vui lòng cài đặt cookies trước');
    }

    const url = this.buildUrl();
    const body = this.buildRequestBody(prompt);
    const headers = this.buildHeaders();

    try {
      // We need to make the request through the background script
      // because of CORS restrictions
      const response = await this.makeRequest(url, body, headers);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const text = await response.text();
      const result = this.parseResponse(text);

      if (!result.success || !result.html) {
        // If no HTML found, try to use the raw response
        if (result.rawText && result.rawText.includes('<!DOCTYPE') || result.rawText.includes('<html')) {
          result.html = this.extractHTML(result.rawText);
          result.success = !!result.html;
        }
      }

      return result;
    } catch (error) {
      console.error('Gemini API Error:', error);
      throw error;
    }
  }

  async makeRequest(url, body, headers) {
    // Since we're in a Chrome extension, we can use fetch with cookies
    // The extension has host_permissions for gemini.google.com
    
    // Parse cookies string and set as Cookie header
    headers['Cookie'] = this.cookies;

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
      credentials: 'include'
    });

    return response;
  }
}

// Export singleton instance
const geminiAPI = new GeminiAPI();
