export type SheetColumnRole =
  | 'ignore'
  | 'date'
  | 'amount' // signed: negative = expense
  | 'debit' // separate expense column, always positive
  | 'credit' // separate income column, always positive
  | 'description' // → paymentPurpose
  | 'counterparty' // → counterpartyName
  | 'category'
  | 'wallet'
  | 'currency'
  | 'externalId'; // user-supplied stable row id, wins over fingerprint for dedup
