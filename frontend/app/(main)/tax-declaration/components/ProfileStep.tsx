'use client';

import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import { useIntlayer } from '@/app/i18n';
import type { IncomeTaxProfile, TaxpayerType } from '../tax-declaration.types';
import { FilingInfoCard } from './FilingInfoCard';

const ES_ACTIVITY_KEYS = [
  'A01',
  'A02',
  'A03',
  'A04',
  'A05',
  'B01',
  'B02',
  'B03',
  'B04',
  'B05',
  'B06',
];

interface ProfileStepProps {
  profile: IncomeTaxProfile;
  saving: boolean;
  onSave: (taxpayerType: TaxpayerType, details: Record<string, unknown>) => void;
  onNext: () => void;
}

/** Polish contributions go either to costs or to a deduction from income — never both. */
function TreatmentField({
  label,
  deductLabel,
  costLabel,
  value,
  onChange,
}: {
  label: React.ReactNode;
  deductLabel: React.ReactNode;
  costLabel: React.ReactNode;
  value: unknown;
  onChange: (value: 'deduct' | 'cost') => void;
}): React.ReactElement {
  return (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <RadioGroup
        row
        value={value === 'cost' ? 'cost' : 'deduct'}
        onChange={event => onChange(event.target.value as 'deduct' | 'cost')}
      >
        <FormControlLabel value="deduct" control={<Radio />} label={deductLabel} />
        <FormControlLabel value="cost" control={<Radio />} label={costLabel} />
      </RadioGroup>
    </FormControl>
  );
}

function numberOrUndefined(value: string): number | undefined {
  return value === '' ? undefined : Number(value);
}

export function ProfileStep({
  profile,
  saving,
  onSave,
  onNext,
}: ProfileStepProps): React.ReactElement {
  const t = useIntlayer('taxDeclarationPage');
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>(profile.taxpayerType);
  const [details, setDetails] = useState<Record<string, unknown>>(profile.details);

  const setDetail = (key: string, value: unknown): void =>
    setDetails(previous => ({ ...previous, [key]: value }));

  const dirty =
    taxpayerType !== profile.taxpayerType ||
    JSON.stringify(details) !== JSON.stringify(profile.details);

  if (!profile.country) {
    return (
      <Alert
        severity="info"
        action={
          <Button component={Link} href="/workspaces" size="small">
            {t.openWorkspaceSettings}
          </Button>
        }
      >
        {t.noCountry}
      </Alert>
    );
  }

  const pack = profile.pack;
  const formKey = pack?.formKey;
  const showEdition =
    pack?.formEditionYear !== null &&
    pack?.formEditionYear !== undefined &&
    pack.formEditionYear < profile.taxYear;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Box>
        <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t.countryLabel}</Typography>
        <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
          {profile.country.name} ({profile.country.code}) · {profile.currency}
        </Typography>
      </Box>

      <FormControl>
        <FormLabel>{t.taxpayerTypeLabel}</FormLabel>
        <RadioGroup
          value={taxpayerType}
          onChange={event => setTaxpayerType(event.target.value as TaxpayerType)}
        >
          <FormControlLabel value="self_employed" control={<Radio />} label={t.typeSelfEmployed} />
          <FormControlLabel value="employee" control={<Radio />} label={t.typeEmployee} />
          <FormControlLabel value="company" control={<Radio />} label={t.typeCompany} />
        </RadioGroup>
      </FormControl>

      {pack ? (
        <Stack spacing={1}>
          <Box>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>{t.formLabel}</Typography>
            <Typography sx={{ fontSize: 16, fontWeight: 600 }}>{pack.name}</Typography>
          </Box>
          {pack.isGeneric ? <Alert severity="info">{t.genericNotice}</Alert> : null}
          {showEdition ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              {t.editionNotice} {pack.formEditionYear}
            </Typography>
          ) : null}
          {pack.filingChannel ? (
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              {t.filingChannelLabel}: {pack.filingChannel}
            </Typography>
          ) : null}
        </Stack>
      ) : null}

      {formKey === 'de-euer' ? (
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Checkbox
                checked={details.smallBusiness === true}
                onChange={event => setDetail('smallBusiness', event.target.checked)}
              />
            }
            label={t.deSmallBusiness}
          />
          <TextField
            type="number"
            label={t.deHomeOfficeDays.value}
            value={details.homeOfficeDays ?? ''}
            onChange={event => setDetail('homeOfficeDays', numberOrUndefined(event.target.value))}
            inputProps={{ min: 0, max: 366 }}
          />
          <TextField
            type="number"
            label={t.deHomeStudyMonths.value}
            value={details.homeStudyMonths ?? ''}
            onChange={event => setDetail('homeStudyMonths', numberOrUndefined(event.target.value))}
            inputProps={{ min: 0, max: 12 }}
          />
        </Stack>
      ) : null}

      {formKey === 'es-modelo100-eds' ? (
        <Stack spacing={2}>
          <TextField
            select
            label={t.esActivityKey.value}
            value={typeof details.activityKey === 'string' ? details.activityKey : ''}
            onChange={event => setDetail('activityKey', event.target.value)}
          >
            {ES_ACTIVITY_KEYS.map(key => (
              <MenuItem key={key} value={key}>
                {key}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="number"
            label={t.esPreviousTurnover.value}
            value={details.previousYearTurnover ?? ''}
            onChange={event =>
              setDetail('previousYearTurnover', numberOrUndefined(event.target.value))
            }
            inputProps={{ min: 0 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={details.singleClientReduction === true}
                onChange={event => setDetail('singleClientReduction', event.target.checked)}
              />
            }
            label={t.esSingleClient}
          />
        </Stack>
      ) : null}

      {profile.country.code === 'PL' && taxpayerType === 'self_employed' ? (
        <Stack spacing={2}>
          <TextField
            select
            label={t.plRegimeLabel.value}
            value={typeof details.regime === 'string' ? details.regime : ''}
            onChange={event => setDetail('regime', event.target.value)}
          >
            <MenuItem value="liniowy">{t.plRegimeLiniowy}</MenuItem>
            <MenuItem value="ryczalt">{t.plRegimeRyczalt}</MenuItem>
            <MenuItem value="skala">{t.plRegimeSkala}</MenuItem>
          </TextField>
          {details.regime === 'liniowy' ? (
            <>
              <TreatmentField
                label={t.plZusTreatment}
                deductLabel={t.plTreatmentDeduct}
                costLabel={t.plTreatmentCost}
                value={details.zusTreatment}
                onChange={value => setDetail('zusTreatment', value)}
              />
              <TreatmentField
                label={t.plHealthTreatment}
                deductLabel={t.plTreatmentDeduct}
                costLabel={t.plTreatmentCost}
                value={details.healthTreatment}
                onChange={value => setDetail('healthTreatment', value)}
              />
            </>
          ) : null}
          {details.regime === 'ryczalt' ? (
            <TextField
              type="number"
              label={t.plPreviousRevenue.value}
              value={details.previousYearRevenue ?? ''}
              onChange={event =>
                setDetail('previousYearRevenue', numberOrUndefined(event.target.value))
              }
              inputProps={{ min: 0 }}
            />
          ) : null}
        </Stack>
      ) : null}

      {profile.filingInfo ? <FilingInfoCard info={profile.filingInfo} /> : null}

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          disabled={!dirty || saving}
          onClick={() => onSave(taxpayerType, details)}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t.save}
        </Button>
        <Button
          variant="outlined"
          disabled={dirty}
          onClick={onNext}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          {t.next}
        </Button>
      </Stack>
    </Stack>
  );
}
