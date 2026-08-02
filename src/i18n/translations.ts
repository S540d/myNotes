export type Language = 'de' | 'en';

export interface Translations {
  common: {
    back: string;
    loading: string;
  };
  home: {
    syncLink: string;
    newEntry: string;
    searchPlaceholder: string;
    emptyState: string;
  };
  note: {
    titlePlaceholder: string;
    titleSuggestion: (title: string) => string;
    bodyPlaceholder: string;
    save: string;
    delete: string;
    deleteConfirm: string;
    templateLabel: string;
  };
  tagInput: {
    placeholder: string;
    textSuggestionLabel: string;
    removeAria: (tag: string) => string;
  };
  onThisDay: {
    heading: string;
    yearsAgo: (n: number, title: string) => string;
  };
  similarNotes: {
    heading: string;
  };
  noteCard: {
    noTitle: string;
    synced: string;
    pending: string;
    conflict: string;
  };
  templates: {
    travelReport: string;
    dailyReview: string;
  };
  passphraseUnlock: {
    heading: string;
    description: string;
    placeholder: string;
    unlock: string;
    checking: string;
  };
  settings: {
    heading: string;
    webdavUrlLabel: string;
    usernameLabel: string;
    passwordLabel: string;
    credentialsEncrypted: string;
    credentialsPlaintext: string;
    save: string;
    testConnection: string;
    syncNow: string;
    syncing: string;
    connectionOk: string;
    connectionErrorPrefix: string;
    syncSummary: (s: {
      pushed: number;
      pulled: number;
      deletedRemote: number;
      deletedLocal: number;
      conflicts: number;
    }) => string;
    notConfigured: string;
    encryptionHeading: string;
    encryptionActive: (unlocked: boolean) => string;
    lock: string;
    encryptAll: string;
    decryptAll: string;
    bulkProgress: (kind: 'encrypt' | 'decrypt', done: number, total: number) => string;
    needsTestFirst: string;
    newPassphraseSetup: string;
    existingVaultFound: string;
    passphraseLabel: string;
    passphraseConfirmLabel: string;
    passphraseTooShort: string;
    passphraseMismatch: string;
    activateEncryption: string;
    connectDevice: string;
    settingUp: string;
    appearanceHeading: string;
    themeLabel: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    languageLabel: string;
  };
}

const de: Translations = {
  common: {
    back: '← Zurück',
    loading: 'Lade…',
  },
  home: {
    syncLink: 'Sync',
    newEntry: '+ Neuer Eintrag',
    searchPlaceholder: 'Einträge durchsuchen…',
    emptyState: 'Noch keine Einträge. Leg mit „+ Neuer Eintrag“ los.',
  },
  note: {
    titlePlaceholder: 'Titel',
    titleSuggestion: (title) => `Titel übernehmen: „${title}“`,
    bodyPlaceholder: 'Schreib deinen Eintrag…',
    save: 'Speichern',
    delete: 'Löschen',
    deleteConfirm: 'Diesen Eintrag wirklich löschen?',
    templateLabel: 'Vorlage:',
  },
  tagInput: {
    placeholder: 'Tags hinzufügen…',
    textSuggestionLabel: 'Vorschlag aus dem Text:',
    removeAria: (tag) => `Tag ${tag} entfernen`,
  },
  onThisDay: {
    heading: 'Am gleichen Tag',
    yearsAgo: (n, title) => `Vor ${n} ${n === 1 ? 'Jahr' : 'Jahren'}: ${title}`,
  },
  similarNotes: {
    heading: 'Ähnliche Einträge',
  },
  noteCard: {
    noTitle: 'Ohne Titel',
    synced: 'Synchronisiert',
    pending: 'Noch nicht synchronisiert',
    conflict: 'Sync-Konflikt',
  },
  templates: {
    travelReport: 'Reisebericht',
    dailyReview: 'Tagesrückblick',
  },
  passphraseUnlock: {
    heading: 'myNotes ist gesperrt',
    description: 'Bitte gib deine Passphrase ein, um deine Notizen zu entschlüsseln und zu synchronisieren.',
    placeholder: 'Passphrase',
    unlock: 'Entsperren',
    checking: 'Prüfe…',
  },
  settings: {
    heading: 'NAS-Sync (WebDAV)',
    webdavUrlLabel: 'WebDAV-URL',
    usernameLabel: 'Benutzername',
    passwordLabel: 'Passwort',
    credentialsEncrypted: 'Zugangsdaten liegen passphrase-verschlüsselt im lokalen Tresor.',
    credentialsPlaintext:
      'Zugangsdaten werden aktuell unverschlüsselt lokal gespeichert. Verschlüsselung unten aktivieren, um das zu ändern.',
    save: 'Speichern',
    testConnection: 'Verbindung testen',
    syncNow: 'Jetzt synchronisieren',
    syncing: 'Synchronisiere…',
    connectionOk: 'Verbindung erfolgreich.',
    connectionErrorPrefix: 'Fehler:',
    syncSummary: (s) =>
      `Gepusht: ${s.pushed} · Geholt: ${s.pulled} · Gelöscht (remote): ${s.deletedRemote} · Gelöscht (lokal übernommen): ${s.deletedLocal} · Konflikte: ${s.conflicts}`,
    notConfigured: 'Noch nicht konfiguriert.',
    encryptionHeading: 'Verschlüsselung',
    encryptionActive: (unlocked) => `Verschlüsselung ist aktiv und ${unlocked ? 'entsperrt' : 'gesperrt'}.`,
    lock: 'Sperren',
    encryptAll: 'Alle Notizen verschlüsseln',
    decryptAll: 'Alle Notizen entschlüsseln',
    bulkProgress: (kind, done, total) =>
      `${kind === 'encrypt' ? 'Verschlüssele' : 'Entschlüssele'} ${done} / ${total} Notizen…`,
    needsTestFirst: 'Erst „Verbindung testen“ oben, um zu prüfen, ob dieses NAS bereits eine Verschlüsselung eingerichtet hat.',
    newPassphraseSetup:
      'Neue Passphrase festlegen. Titel, Text, Datum und Tags werden damit vor dem Hochladen auf das NAS verschlüsselt (AES-256-GCM); das NAS sieht nur Chiffretext.',
    existingVaultFound: 'Dieses NAS hat bereits eine Verschlüsselung eingerichtet. Gib die passende Passphrase ein, um dieses Gerät damit zu verbinden.',
    passphraseLabel: 'Passphrase',
    passphraseConfirmLabel: 'Passphrase bestätigen',
    passphraseTooShort: 'Die Passphrase sollte mindestens 8 Zeichen lang sein.',
    passphraseMismatch: 'Die Passphrasen stimmen nicht überein.',
    activateEncryption: 'Verschlüsselung aktivieren',
    connectDevice: 'Gerät verbinden',
    settingUp: 'Richte ein…',
    appearanceHeading: 'Darstellung',
    themeLabel: 'Erscheinungsbild',
    themeSystem: 'System',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    languageLabel: 'Sprache',
  },
};

const en: Translations = {
  common: {
    back: '← Back',
    loading: 'Loading…',
  },
  home: {
    syncLink: 'Sync',
    newEntry: '+ New entry',
    searchPlaceholder: 'Search entries…',
    emptyState: 'No entries yet. Get started with "+ New entry".',
  },
  note: {
    titlePlaceholder: 'Title',
    titleSuggestion: (title) => `Use title: "${title}"`,
    bodyPlaceholder: 'Write your entry…',
    save: 'Save',
    delete: 'Delete',
    deleteConfirm: 'Really delete this entry?',
    templateLabel: 'Template:',
  },
  tagInput: {
    placeholder: 'Add tags…',
    textSuggestionLabel: 'Suggested from text:',
    removeAria: (tag) => `Remove tag ${tag}`,
  },
  onThisDay: {
    heading: 'On this day',
    yearsAgo: (n, title) => `${n} ${n === 1 ? 'year' : 'years'} ago: ${title}`,
  },
  similarNotes: {
    heading: 'Similar entries',
  },
  noteCard: {
    noTitle: 'Untitled',
    synced: 'Synced',
    pending: 'Not synced yet',
    conflict: 'Sync conflict',
  },
  templates: {
    travelReport: 'Travel report',
    dailyReview: 'Daily review',
  },
  passphraseUnlock: {
    heading: 'myNotes is locked',
    description: 'Please enter your passphrase to decrypt and sync your notes.',
    placeholder: 'Passphrase',
    unlock: 'Unlock',
    checking: 'Checking…',
  },
  settings: {
    heading: 'NAS sync (WebDAV)',
    webdavUrlLabel: 'WebDAV URL',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    credentialsEncrypted: 'Credentials are stored passphrase-encrypted in the local vault.',
    credentialsPlaintext:
      'Credentials are currently stored locally in plain text. Activate encryption below to change that.',
    save: 'Save',
    testConnection: 'Test connection',
    syncNow: 'Sync now',
    syncing: 'Syncing…',
    connectionOk: 'Connection successful.',
    connectionErrorPrefix: 'Error:',
    syncSummary: (s) =>
      `Pushed: ${s.pushed} · Pulled: ${s.pulled} · Deleted (remote): ${s.deletedRemote} · Deleted (adopted locally): ${s.deletedLocal} · Conflicts: ${s.conflicts}`,
    notConfigured: 'Not configured yet.',
    encryptionHeading: 'Encryption',
    encryptionActive: (unlocked) => `Encryption is active and ${unlocked ? 'unlocked' : 'locked'}.`,
    lock: 'Lock',
    encryptAll: 'Encrypt all notes',
    decryptAll: 'Decrypt all notes',
    bulkProgress: (kind, done, total) => `${kind === 'encrypt' ? 'Encrypting' : 'Decrypting'} ${done} / ${total} notes…`,
    needsTestFirst: 'Run "Test connection" above first, to check whether this NAS already has encryption set up.',
    newPassphraseSetup:
      'Set a new passphrase. Title, text, date, and tags will be encrypted with it before upload to the NAS (AES-256-GCM); the NAS only ever sees ciphertext.',
    existingVaultFound: 'This NAS already has encryption set up. Enter the matching passphrase to connect this device to it.',
    passphraseLabel: 'Passphrase',
    passphraseConfirmLabel: 'Confirm passphrase',
    passphraseTooShort: 'The passphrase should be at least 8 characters long.',
    passphraseMismatch: 'The passphrases do not match.',
    activateEncryption: 'Activate encryption',
    connectDevice: 'Connect device',
    settingUp: 'Setting up…',
    appearanceHeading: 'Appearance',
    themeLabel: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    languageLabel: 'Language',
  },
};

export const translations: Record<Language, Translations> = { de, en };
