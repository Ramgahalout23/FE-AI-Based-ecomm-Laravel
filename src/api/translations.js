import client from './client';

export const translationsAPI = {
  /** Get translations for a language and group */
  getTranslations: (lang = 'en', group = 'frontend') =>
    client.get('/translations', { params: { lang, group } }),

  /** Get all supported languages */
  getLanguages: () => client.get('/translations/languages'),
};
