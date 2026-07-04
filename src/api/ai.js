import { adminClient } from './client';

// ── SSE Streaming Helper ──
// Reads a Server-Sent Events stream via fetch (supports POST + auth headers).
function readSSEStream(response, onEvent) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  return new Promise((resolve, reject) => {
    function pump() {
      reader.read().then(({ done, value }) => {
        if (done) {
          // Process any remaining data in the buffer
          if (buffer.trim()) {
            const lines = buffer.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.slice(6));
                  onEvent(event);
                } catch { /* skip malformed */ }
              }
            }
          }
          resolve();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              onEvent(event);
            } catch { /* skip malformed */ }
          }
        }

        pump();
      }).catch(reject);
    }
    pump();
  });
}

export const aiAPI = {
  // ── Product AI ──
  generateProductDescription: (data) => adminClient.post('/admin/ai/generate-product-description', data),
  generateShortDescription: (data) => adminClient.post('/admin/ai/generate-short-description', data),

  // ── SEO AI ──
  generateSeoMeta: (data) => adminClient.post('/admin/ai/generate-seo-meta', data),

  // ── Image Generation (DALL-E) ──
  generateImage: (data) => adminClient.post('/admin/ai/generate-image', data),

  // ── Category AI ──
  generateCategoryDescription: (data) => adminClient.post('/admin/ai/generate-category-description', data),

  // ── Variant AI ──
  generateVariantDescription: (data) => adminClient.post('/admin/ai/generate-variant-description', data),
  generateVariantImages: (data) => adminClient.post('/admin/ai/generate-variant-images', data),

  /**
   * Stream variant images with per-view progress events.
   * Calls `onProgress(event)` for each SSE event:
   *   { view: 'front', status: 'generating' }
   *   { view: 'reference', status: 'done' }  // when reference image analysis is complete
   *   { view: 'front', status: 'done', url: '...' }
   *   { status: 'complete' }
   * Supports referenceImageUrl to replicate the style of a reference image.
   * Returns a promise that resolves when streaming is done.
   */
  generateVariantImagesStream: (data, onProgress) => {
    const token = localStorage.getItem('adminToken') || localStorage.getItem('authToken');
    const baseURL = adminClient.defaults.baseURL;

    return new Promise((resolve, reject) => {
      fetch(`${baseURL}/admin/ai/generate-variant-images-stream`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errBody = await response.json().catch(() => ({}));
            reject(new Error(errBody.message || `HTTP ${response.status}`));
            return;
          }

          await readSSEStream(response, (event) => {
            if (event.status === 'complete') {
              resolve(event);
              return;
            }
            if (event.status === 'error') {
              reject(new Error(event.message || 'Generation failed'));
              return;
            }
            if (onProgress) onProgress(event);
          });

          // If stream ended without a complete/error event, reject
          reject(new Error('Stream ended unexpectedly — connection may have been lost'));
        })
        .catch(reject);
    });
  },

  // ── Provider Connection Test ──
  testConnection: (data) => adminClient.post('/admin/ai/test-connection', data),

  // ── Page / CMS AI ──
  generatePageContent: (data) => adminClient.post('/admin/ai/generate-page-content', data),

  // ── Translation AI ──
  /**
   * Translate a batch of translation keys using AI.
   * @param {string} sourceLanguage - Source language code (e.g. 'en')
   * @param {string} targetLanguage - Target language code (e.g. 'hi', 'fr')
   * @param {string} targetLanguageName - Display name of target language (e.g. 'Hindi', 'French')
   * @param {Object} translations - { key: value } pairs to translate
   */
  translateWithAI: (data) => adminClient.post('/admin/ai/translate', data),
};
