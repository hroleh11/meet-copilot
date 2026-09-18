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
    hotkeys: 'Гарячі клавіші',
    hotkeyReply: 'Відповідь',
    hotkeyAlternative: 'Інший варіант',
    hotkeyHide: 'Показати або сховати оверлей',
    audio: 'Звук',
    microphone: 'Мікрофон',
    systemAudio: 'Звук зустрічі',
    microphoneDefault: 'за замовчуванням',
    checkAudio: 'Перевірити звук',
    stopCheck: 'Зупинити',
    screenRecordingNeeded:
      'Щоб чути співрозмовників, дозвольте запис екрана: Системні налаштування → Конфіденційність і безпека → Запис екрана.',
  },

  meeting: {
    title: 'Зустріч',
    profile: 'Тип зустрічі',
    language: 'Мова',
    start: 'Почати слухати',
    stop: 'Зупинити',
    starting: 'Запускаємо…',
    stopping: 'Зупиняємо…',
    listening: 'Слухаю',
    idle: 'Не слухаю',
    emptyTranscript: 'Транскрипт з’явиться, щойно хтось заговорить.',
    me: 'Я',
    other: 'Співрозмовник',
  },

  transcript: {
    title: 'Транскрипт',
  },

  answer: {
    reply: 'Відповідь',
    alternative: 'Інший варіант',
    writing: 'пишу…',
    waiting: 'Готую відповідь…',
    copy: 'Копіювати',
    copied: 'Скопійовано',
    close: 'Закрити',
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
    session: 'Не вдалося керувати зустріччю',
    generation: 'Не вдалося отримати відповідь',
    microphone:
      'Мікрофон недоступний. Дозвольте доступ у Системних налаштуваннях → Конфіденційність і безпека → Мікрофон.',
  },
} as const;
