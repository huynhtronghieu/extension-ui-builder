// IndexedDB Manager for storing Pages and HTML History
class HTMLDatabase {
  constructor() {
    this.dbName = 'GeminiHTMLBuilder';
    this.dbVersion = 2; // Upgrade version for new schema
    this.pagesStore = 'pages';
    this.historyStore = 'htmlHistory';
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open database'));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Pages store - each page is a conversation
        if (!db.objectStoreNames.contains(this.pagesStore)) {
          const pagesStore = db.createObjectStore(this.pagesStore, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          pagesStore.createIndex('createdAt', 'createdAt', { unique: false });
          pagesStore.createIndex('name', 'name', { unique: false });
        }

        // History store - linked to pages
        if (!db.objectStoreNames.contains(this.historyStore)) {
          const historyStore = db.createObjectStore(this.historyStore, { 
            keyPath: 'id', 
            autoIncrement: true 
          });
          historyStore.createIndex('pageId', 'pageId', { unique: false });
          historyStore.createIndex('timestamp', 'timestamp', { unique: false });
        } else {
          // Add pageId index if upgrading from v1
          const transaction = event.target.transaction;
          const historyStore = transaction.objectStore(this.historyStore);
          if (!historyStore.indexNames.contains('pageId')) {
            historyStore.createIndex('pageId', 'pageId', { unique: false });
          }
        }
      };
    });
  }

  // ============ PAGE METHODS ============

  async createPage(name = null) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.pagesStore], 'readwrite');
      const store = transaction.objectStore(this.pagesStore);

      const page = {
        name: name || `Page ${Date.now()}`,
        createdAt: Date.now(),
        // Gemini conversation state
        conversationId: '',
        responseId: '',
        choiceId: '',
        // Last HTML for quick preview
        lastHtml: '',
        lastPrompt: ''
      };

      const request = store.add(page);

      request.onsuccess = () => {
        // Return the page ID (not the whole page object)
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to create page'));
      };
    });
  }

  async getPage(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.pagesStore], 'readonly');
      const store = transaction.objectStore(this.pagesStore);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get page'));
      };
    });
  }

  async getAllPages() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.pagesStore], 'readonly');
      const store = transaction.objectStore(this.pagesStore);
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev'); // Newest first

      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get pages'));
      };
    });
  }

  async updatePage(idOrPage, updates = null) {
    if (!this.db) await this.init();

    // If first argument is a number and second is updates object
    // Otherwise, first argument is the full page object
    let page;
    if (typeof idOrPage === 'number' && updates) {
      page = await this.getPage(idOrPage);
      if (!page) return null;
      Object.assign(page, updates);
    } else {
      page = idOrPage;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.pagesStore], 'readwrite');
      const store = transaction.objectStore(this.pagesStore);
      const request = store.put(page);

      request.onsuccess = () => {
        resolve(page);
      };

      request.onerror = () => {
        reject(new Error('Failed to update page'));
      };
    });
  }

  async deletePage(id) {
    if (!this.db) await this.init();

    // Also delete all history for this page
    await this.clearPageHistory(id);

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.pagesStore], 'readwrite');
      const store = transaction.objectStore(this.pagesStore);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error('Failed to delete page'));
      };
    });
  }

  async renamePage(id, newName) {
    const page = await this.getPage(id);
    if (page) {
      page.name = newName;
      return await this.updatePage(page);
    }
    return null;
  }

  // ============ HISTORY METHODS ============

  async saveHTML(pageId, prompt, htmlContent) {
    if (!this.db) await this.init();
    
    // Validate HTML content before saving
    if (!htmlContent || (!htmlContent.includes('<!DOCTYPE') && !htmlContent.includes('<html') && !htmlContent.includes('<body'))) {
      console.warn('Invalid HTML content, not saving');
      return null;
    }

    // Update page's last HTML
    const page = await this.getPage(pageId);
    if (page) {
      page.lastHtml = htmlContent;
      page.lastPrompt = prompt;
      await this.updatePage(page);
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.historyStore], 'readwrite');
      const store = transaction.objectStore(this.historyStore);

      const record = {
        pageId: pageId,
        prompt: prompt,
        html: htmlContent,
        timestamp: Date.now(),
        date: new Date().toLocaleString('vi-VN')
      };

      const request = store.add(record);

      request.onsuccess = () => {
        record.id = request.result;
        resolve(record);
      };

      request.onerror = () => {
        reject(new Error('Failed to save HTML'));
      };
    });
  }

  async getHTML(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.historyStore], 'readonly');
      const store = transaction.objectStore(this.historyStore);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get HTML'));
      };
    });
  }

  async getPageHistory(pageId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.historyStore], 'readonly');
      const store = transaction.objectStore(this.historyStore);
      const index = store.index('pageId');
      const request = index.openCursor(IDBKeyRange.only(pageId), 'prev'); // Newest first

      const results = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get page history'));
      };
    });
  }

  async deleteHTML(id) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.historyStore], 'readwrite');
      const store = transaction.objectStore(this.historyStore);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        reject(new Error('Failed to delete HTML'));
      };
    });
  }

  async clearPageHistory(pageId) {
    if (!this.db) await this.init();

    const history = await this.getPageHistory(pageId);
    const transaction = this.db.transaction([this.historyStore], 'readwrite');
    const store = transaction.objectStore(this.historyStore);

    for (const item of history) {
      store.delete(item.id);
    }

    return true;
  }

  async clearAll() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.pagesStore, this.historyStore], 'readwrite');
      
      transaction.objectStore(this.pagesStore).clear();
      transaction.objectStore(this.historyStore).clear();

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = () => {
        reject(new Error('Failed to clear all'));
      };
    });
  }

  // Get latest history item for a page
  async getLatestForPage(pageId) {
    try {
      const history = await this.getPageHistory(pageId);
      const validHistory = history.filter(item => 
        item && item.html && 
        (item.html.includes('<!DOCTYPE') || item.html.includes('<html') || item.html.includes('<body'))
      );
      return validHistory.length > 0 ? validHistory[0] : null;
    } catch (error) {
      console.error('Error getting latest:', error);
      return null;
    }
  }
}

// Export singleton instance
const htmlDB = new HTMLDatabase();
