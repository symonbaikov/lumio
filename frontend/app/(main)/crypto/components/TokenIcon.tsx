import Box from '@mui/material/Box';
import type React from 'react';

/**
 * Brand colour of each asset the backend can price (see COINGECKO_IDS). A monogram
 * on that colour stands in for the logo: the logos themselves are trademarks and
 * would have to be shipped as assets for every ticker.
 */
const TOKEN_COLORS: Record<string, string> = {
  ETH: '#627eea',
  WETH: '#627eea',
  USDT: '#26a17b',
  USDC: '#2775ca',
  DAI: '#f5ac37',
  WBTC: '#f09242',
  LINK: '#2a5ada',
  UNI: '#ff007a',
  AAVE: '#b6509e',
  MATIC: '#8247e5',
  OP: '#ff0420',
  TRX: '#eb0029',
  POL: '#8247e5',
  ARB: '#28a0f0',
  BTC: '#f7931a',
  SOL: '#9945ff',
};

export function TokenIcon({
  asset,
  size = 24,
}: {
  asset: string;
  size?: number;
}): React.JSX.Element {
  return (
    <Box
      aria-hidden
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: TOKEN_COLORS[asset.toUpperCase()] ?? 'text.disabled',
        color: '#fff',
        fontSize: size * 0.42,
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {asset.charAt(0).toUpperCase()}
    </Box>
  );
}
