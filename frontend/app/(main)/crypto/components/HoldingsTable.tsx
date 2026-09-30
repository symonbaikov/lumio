import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import type React from 'react';
import type { CryptoHolding } from '../hooks/useCrypto';
import { TokenIcon } from './TokenIcon';

type HoldingsTableLabels = {
  title: string;
  asset: string;
  balance: string;
  price: string;
  worth: string;
};

type HoldingsTableProps = {
  holdings: CryptoHolding[];
  labels: HoldingsTableLabels;
  locale: string;
  money: (value: number) => string;
};

const numberCell = { fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' } as const;

export function HoldingsTable({
  holdings,
  labels,
  locale,
  money,
}: HoldingsTableProps): React.JSX.Element {
  // On-chain amounts carry up to 18 decimals; six is enough to read a balance.
  const amountFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });

  return (
    <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
      <Typography variant="subtitle1" fontWeight={600} sx={{ px: 2, pt: 2, pb: 1 }}>
        {labels.title}
      </Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{labels.asset}</TableCell>
              <TableCell align="right">{labels.balance}</TableCell>
              <TableCell align="right">{labels.price}</TableCell>
              <TableCell align="right">{labels.worth}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {holdings.map(holding => (
              <TableRow key={holding.asset} sx={{ '&:last-child td': { borderBottom: 0 } }}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                    <TokenIcon asset={holding.asset} />
                    <Typography variant="body2" fontWeight={600}>
                      {holding.asset}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell align="right" sx={numberCell}>
                  {amountFormat.format(Number(holding.amount))}
                </TableCell>
                <TableCell align="right" sx={{ ...numberCell, color: 'text.secondary' }}>
                  {money(holding.price)}
                </TableCell>
                <TableCell align="right" sx={{ ...numberCell, fontWeight: 600 }}>
                  {money(holding.value)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}
