export const uk = {
  appName: 'Meet Copilot',
  appTagline: 'Слухає зустріч і готує відповідь',

  auth: {
    title: 'Увійдіть, щоб почати',
    explanation:
      'Вхід відкриється в браузері. Після підтвердження застосунок підхопить сесію сам.',
    signIn: 'Увійти через Google',
    opening: 'Відкриваємо браузер…',
    signOut: 'Вийти',
    signedInAs: 'Ви увійшли як',
  },

  settings: {
    title: 'Налаштування',
    local: 'Цей комп’ютер',
    backendUrl: 'Адреса сервера',
    checkConnection: 'Перевірити з’єднання',
    connectionOk: 'Сервер відповідає',
    account: 'Ваш профіль',
    style: 'Стиль відповідей',
    stylePlaceholder: 'Коротко, розмовно, без канцеляриту',
    styleHint: 'Порожнє поле означає стиль за замовчуванням.',
    defaultLanguage: 'Мова за замовчуванням',
    defaultProfile: 'Тип зустрічі за замовчуванням',
    save: 'Зберегти',
    saved: 'Збережено',
  },

  language: {
    uk: 'Українська',
    en: 'Англійська',
    ru: 'Російська',
  },

  profile: {
    daily: 'Дейлі',
    interview_candidate: 'Співбесіда, я кандидат',
    client_call: 'Дзвінок з клієнтом',
  },

  errors: {
    login: 'Не вдалося увійти',
    settings: 'Не вдалося зберегти налаштування',
    backend: 'Сервер недоступний',
  },
} as const;
