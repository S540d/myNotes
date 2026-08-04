export type Language = 'de' | 'en';

export interface Translations {
  common: {
    back: string;
    loading: string;
  };
  home: {
    settingsAria: string;
    newEntry: string;
    searchPlaceholder: string;
    emptyState: string;
  };
  note: {
    titlePlaceholder: string;
    titleSuggestion: (title: string) => string;
    bodyPlaceholder: string;
    save: string;
    saved: string;
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
  tagFilterBar: {
    editParentAria: (name: string) => string;
    parentLabel: string;
    noParent: string;
  };
  homeGrouping: {
    groupByDate: string;
    groupByTag: string;
    noTagGroup: string;
  };
  similarNotes: {
    heading: string;
  };
  importExport: {
    heading: string;
    exportHeading: string;
    exportJson: string;
    exportMarkdownZip: string;
    importHeading: string;
    dropzoneText: string;
    chooseFile: string;
    formatNotRecognized: string;
    parseError: (message: string) => string;
    detectedFormat: (label: string) => string;
    previewCount: (n: number) => string;
    columnTitle: string;
    columnDate: string;
    columnTags: string;
    selectAll: string;
    deselectAll: string;
    importButton: (n: number) => string;
    importing: string;
    importResult: (n: number) => string;
  };
  conflict: {
    bannerHeading: string;
    bannerDescription: (n: number) => string;
    resolve: string;
    dialogHeading: string;
    dialogDescription: string;
    localHeading: string;
    remoteHeading: string;
    noShadowNotice: string;
    fieldTitle: string;
    fieldDate: string;
    fieldTags: string;
    fieldBody: string;
    keepLocal: string;
    keepRemote: string;
    keepBoth: string;
    copyTitleSuffix: string;
    close: string;
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
    storagePersistenceWarning: string;
  };
  settingsMenu: {
    heading: string;
    appearanceHeading: string;
    themeLabel: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    languageLabel: string;
    syncCardTitle: string;
    syncCardDesc: string;
    importExportCardTitle: string;
    importExportCardDesc: string;
  };
}

const de: Translations = {
  common: {
    back: '← Zurück',
    loading: 'Lade…',
  },
  home: {
    settingsAria: 'Einstellungen',
    newEntry: '+ Neuer Eintrag',
    searchPlaceholder: 'Einträge durchsuchen…',
    emptyState: 'Noch keine Einträge. Leg mit „+ Neuer Eintrag“ los.',
  },
  note: {
    titlePlaceholder: 'Titel',
    titleSuggestion: (title) => `Titel übernehmen: „${title}“`,
    bodyPlaceholder: 'Schreib deinen Eintrag…',
    save: 'Speichern',
    saved: 'Gespeichert',
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
  tagFilterBar: {
    editParentAria: (name) => `Übergeordneten Tag für ${name} festlegen`,
    parentLabel: 'Übergeordneter Tag:',
    noParent: '– keiner –',
  },
  homeGrouping: {
    groupByDate: 'Nach Datum',
    groupByTag: 'Nach Tag',
    noTagGroup: 'Ohne Tag',
  },
  similarNotes: {
    heading: 'Ähnliche Einträge',
  },
  importExport: {
    heading: 'Import & Export',
    exportHeading: 'Export',
    exportJson: 'Als JSON exportieren',
    exportMarkdownZip: 'Als Markdown-ZIP exportieren',
    importHeading: 'Import',
    dropzoneText: 'Datei hierher ziehen oder auswählen',
    chooseFile: 'Datei auswählen',
    formatNotRecognized: 'Dateiformat nicht erkannt.',
    parseError: (message) => `Datei konnte nicht gelesen werden: ${message}`,
    detectedFormat: (label) => `Erkanntes Format: ${label}`,
    previewCount: (n) => (n === 1 ? '1 Eintrag gefunden' : `${n} Einträge gefunden`),
    columnTitle: 'Titel',
    columnDate: 'Datum',
    columnTags: 'Tags',
    selectAll: 'Alle auswählen',
    deselectAll: 'Alle abwählen',
    importButton: (n) => (n === 1 ? '1 Eintrag importieren' : `${n} Einträge importieren`),
    importing: 'Importiere…',
    importResult: (n) => (n === 1 ? '1 Eintrag importiert.' : `${n} Einträge importiert.`),
  },
  conflict: {
    bannerHeading: 'Sync-Konflikte',
    bannerDescription: (n) =>
      n === 1
        ? 'Ein Eintrag wurde auf einem anderen Gerät parallel geändert und braucht deine Entscheidung.'
        : `${n} Einträge wurden auf einem anderen Gerät parallel geändert und brauchen deine Entscheidung.`,
    resolve: 'Auflösen',
    dialogHeading: 'Konflikt auflösen',
    dialogDescription:
      'Dieser Eintrag wurde seit dem letzten Sync auf diesem und einem anderen Gerät geändert. Wähle, welche Version gelten soll.',
    localHeading: 'Deine Version (dieses Gerät)',
    remoteHeading: 'Andere Version',
    noShadowNotice:
      'Die andere Version konnte nicht geladen werden (z.B. weil sie verschlüsselt und gesperrt ist). Du kannst trotzdem deine Version behalten.',
    fieldTitle: 'Titel',
    fieldDate: 'Datum',
    fieldTags: 'Tags',
    fieldBody: 'Text',
    keepLocal: 'Meine behalten',
    keepRemote: 'Andere behalten',
    keepBoth: 'Beide behalten',
    copyTitleSuffix: ' (Konfliktkopie)',
    close: 'Schließen',
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
    storagePersistenceWarning:
      'Der Browser hat dauerhaften Speicher für myNotes noch nicht zugesichert. Bei seltener Nutzung könnten Daten, die noch nicht mit dem NAS synchronisiert sind, gelöscht werden. „Zum Home-Bildschirm hinzufügen“ verringert dieses Risiko.',
  },
  settingsMenu: {
    heading: 'Einstellungen',
    appearanceHeading: 'Darstellung',
    themeLabel: 'Erscheinungsbild',
    themeSystem: 'System',
    themeLight: 'Hell',
    themeDark: 'Dunkel',
    languageLabel: 'Sprache',
    syncCardTitle: 'Sync',
    syncCardDesc: 'NAS-Verbindung (WebDAV) und Verschlüsselung verwalten.',
    importExportCardTitle: 'Import/Export',
    importExportCardDesc: 'Notizen exportieren oder aus anderen Formaten importieren.',
  },
};

const en: Translations = {
  common: {
    back: '← Back',
    loading: 'Loading…',
  },
  home: {
    settingsAria: 'Settings',
    newEntry: '+ New entry',
    searchPlaceholder: 'Search entries…',
    emptyState: 'No entries yet. Get started with "+ New entry".',
  },
  note: {
    titlePlaceholder: 'Title',
    titleSuggestion: (title) => `Use title: "${title}"`,
    bodyPlaceholder: 'Write your entry…',
    save: 'Save',
    saved: 'Saved',
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
  tagFilterBar: {
    editParentAria: (name) => `Set parent tag for ${name}`,
    parentLabel: 'Parent tag:',
    noParent: '– none –',
  },
  homeGrouping: {
    groupByDate: 'By date',
    groupByTag: 'By tag',
    noTagGroup: 'No tag',
  },
  similarNotes: {
    heading: 'Similar entries',
  },
  importExport: {
    heading: 'Import & Export',
    exportHeading: 'Export',
    exportJson: 'Export as JSON',
    exportMarkdownZip: 'Export as Markdown ZIP',
    importHeading: 'Import',
    dropzoneText: 'Drag a file here or choose one',
    chooseFile: 'Choose file',
    formatNotRecognized: "File format not recognized.",
    parseError: (message) => `Couldn't read the file: ${message}`,
    detectedFormat: (label) => `Detected format: ${label}`,
    previewCount: (n) => (n === 1 ? '1 entry found' : `${n} entries found`),
    columnTitle: 'Title',
    columnDate: 'Date',
    columnTags: 'Tags',
    selectAll: 'Select all',
    deselectAll: 'Deselect all',
    importButton: (n) => (n === 1 ? 'Import 1 entry' : `Import ${n} entries`),
    importing: 'Importing…',
    importResult: (n) => (n === 1 ? '1 entry imported.' : `${n} entries imported.`),
  },
  conflict: {
    bannerHeading: 'Sync conflicts',
    bannerDescription: (n) =>
      n === 1
        ? 'One entry was changed on another device at the same time and needs your decision.'
        : `${n} entries were changed on another device at the same time and need your decision.`,
    resolve: 'Resolve',
    dialogHeading: 'Resolve conflict',
    dialogDescription:
      'This entry was changed on both this and another device since the last sync. Choose which version should win.',
    localHeading: 'Your version (this device)',
    remoteHeading: 'Other version',
    noShadowNotice:
      "The other version couldn't be loaded (e.g. because it's encrypted and locked). You can still keep your version.",
    fieldTitle: 'Title',
    fieldDate: 'Date',
    fieldTags: 'Tags',
    fieldBody: 'Text',
    keepLocal: 'Keep mine',
    keepRemote: 'Keep theirs',
    keepBoth: 'Keep both',
    copyTitleSuffix: ' (conflict copy)',
    close: 'Close',
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
    storagePersistenceWarning:
      "The browser hasn't granted persistent storage for myNotes yet. With infrequent use, data not yet synced to the NAS could be evicted. \"Add to Home Screen\" reduces this risk.",
  },
  settingsMenu: {
    heading: 'Settings',
    appearanceHeading: 'Appearance',
    themeLabel: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    languageLabel: 'Language',
    syncCardTitle: 'Sync',
    syncCardDesc: 'Manage the NAS connection (WebDAV) and encryption.',
    importExportCardTitle: 'Import/Export',
    importExportCardDesc: 'Export notes or import them from other formats.',
  },
};

export const translations: Record<Language, Translations> = { de, en };
