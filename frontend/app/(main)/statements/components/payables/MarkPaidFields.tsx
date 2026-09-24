'use client';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Typography from '@mui/material/Typography';
import type { Category } from '@/app/components/transactions/types';
import { Input } from '@/app/components/ui/input';
import { Select } from '@/app/components/ui/select';
import { useIntlayer } from '@/app/i18n';
import { formatMoney } from '@/app/lib/format-money';
import type { PaymentCandidate } from '@/app/lib/payables-api';

export type WalletOption = { id: string; name: string; currency: string; isActive?: boolean };

export const today = (): string => new Date().toISOString().slice(0, 10);

/** The transactions that may have settled the bill, one to pick. */
export function CandidateList(props: {
  candidates: PaymentCandidate[];
  loading: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
  locale: string;
}): React.JSX.Element {
  const t = useIntlayer('payableMarkPaid');
  if (props.loading) {
    return <Typography variant="body2">{t.loading.value}</Typography>;
  }
  if (props.candidates.length === 0) {
    return <Alert severity="info">{t.noCandidates.value}</Alert>;
  }
  return (
    <Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
        {t.matchHint.value}
      </Typography>
      <RadioGroup
        value={props.selected ?? ''}
        onChange={event => props.onSelect(event.target.value)}
      >
        {props.candidates.map(candidate => (
          <FormControlLabel
            key={candidate.id}
            value={candidate.id}
            control={<Radio size="small" />}
            // The label is a block of its own; the default <p> wrapper cannot hold it.
            disableTypography
            sx={{ alignItems: 'flex-start', mb: 1, minWidth: 0 }}
            label={<CandidateLabel candidate={candidate} locale={props.locale} />}
          />
        ))}
      </RadioGroup>
    </Box>
  );
}

function CandidateLabel(props: { candidate: PaymentCandidate; locale: string }): React.JSX.Element {
  const t = useIntlayer('payableMarkPaid');
  const { candidate } = props;
  return (
    <Box sx={{ minWidth: 0 }}>
      {/* A div, not a p: the chip inside it renders a div. */}
      <Typography
        component="div"
        variant="body2"
        fontWeight={600}
        sx={{ overflowWrap: 'anywhere' }}
      >
        {candidate.transactionDate} ·{' '}
        {formatMoney(Number(candidate.amount), candidate.currency, props.locale)}
        {candidate.vendorMatch && <Chip size="small" label={t.vendorMatch.value} sx={{ ml: 1 }} />}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', overflowWrap: 'anywhere' }}>
        {candidate.counterpartyName} — {candidate.paymentPurpose}
      </Typography>
    </Box>
  );
}

export type CashState = { walletId: string | null; paidOn: string; categoryId: string };

/** Where and when a cash payment was made; the server records it as a transaction. */
export function CashFields(props: {
  currency: string;
  wallets: WalletOption[];
  walletsLoading: boolean;
  categories: Category[];
  value: CashState;
  onChange: (next: CashState) => void;
}): React.JSX.Element {
  const t = useIntlayer('payableMarkPaid');
  const { value, onChange } = props;
  const noWallet = props.wallets.length === 0 && !props.walletsLoading;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {noWallet ? (
        <Alert severity="info">{t.noWallets.value.replace('{currency}', props.currency)}</Alert>
      ) : (
        <Box>
          <Typography component="label" htmlFor="mark-paid-wallet" variant="caption">
            {t.wallet.value}
          </Typography>
          <Select
            id="mark-paid-wallet"
            value={value.walletId ?? ''}
            onChange={event => onChange({ ...value, walletId: event.target.value })}
          >
            {props.wallets.map(wallet => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </Select>
        </Box>
      )}
      <Box>
        <Typography component="label" htmlFor="mark-paid-date" variant="caption">
          {t.paidOn.value}
        </Typography>
        <Input
          id="mark-paid-date"
          type="date"
          value={value.paidOn}
          max={today()}
          onChange={event => onChange({ ...value, paidOn: event.target.value })}
        />
      </Box>
      <Box>
        <Typography component="label" htmlFor="mark-paid-category" variant="caption">
          {t.category.value}
        </Typography>
        <Select
          id="mark-paid-category"
          value={value.categoryId}
          onChange={event => onChange({ ...value, categoryId: event.target.value })}
        >
          <option value="">{t.noCategory.value}</option>
          {props.categories.map(category => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
      </Box>
      <Alert severity="info">{t.cashHint.value}</Alert>
    </Box>
  );
}
