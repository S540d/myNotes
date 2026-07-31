export class WrongPassphraseError extends Error {
  constructor(message = 'Falsche Passphrase.') {
    super(message);
    this.name = 'WrongPassphraseError';
  }
}
