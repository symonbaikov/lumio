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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import Link from 'next/link';
import type React from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { useIntlayer } from '@/app/i18n';
import type { IncomeTaxProfile, TaxpayerType } from '../tax-declaration.types';
import { FilingInfoCard } from './FilingInfoCard';

/** Label above a plain-value input, instead of MUI's floating notch label. */
function LabeledField({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <Box>
      <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
      {children}
    </Box>
  );
}

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

  const isDe = formKey === 'de-euer';
  const isEs = formKey === 'es-modelo100-eds';
  const isPlSelfEmployed = profile.country.code === 'PL' && taxpayerType === 'self_employed';
  const hasAllowances = isDe || isEs || isPlSelfEmployed;

  return (
    <Stack spacing={3} sx={{ maxWidth: 720 }}>
      <Card>
        <CardHeader style={{ padding: 16, paddingBottom: 8 }}>
          <CardTitle>{t.filingProfileCardTitle}</CardTitle>
        </CardHeader>
        <CardContent style={{ paddingTop: 8 }}>
          <Stack spacing={3}>
            <Box>
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                {t.countryLabel}
              </Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 600 }}>
                {profile.country.name} ({profile.country.code}) · {profile.currency}
              </Typography>
            </Box>

            <FormControl>
              <FormLabel sx={{ mb: 1 }}>{t.taxpayerTypeLabel}</FormLabel>
              <ToggleButtonGroup
                value={taxpayerType}
                exclusive
                onChange={(_event, value: TaxpayerType | null) => value && setTaxpayerType(value)}
                aria-label={t.taxpayerTypeLabel.value}
                sx={{
                  alignSelf: 'flex-start',
                  bgcolor: 'action.hover',
                  borderRadius: 999,
                  p: 0.5,
                  gap: 0.5,
                  '& .MuiToggleButtonGroup-grouped': {
                    border: 0,
                    borderRadius: 999,
                  },
                }}
              >
                <ToggleButton
                  value="self_employed"
                  sx={{ textTransform: 'none', px: 2, borderRadius: '999px !important' }}
                >
                  {t.typeSelfEmployed}
                </ToggleButton>
                <ToggleButton
                  value="employee"
                  sx={{ textTransform: 'none', px: 2, borderRadius: '999px !important' }}
                >
                  {t.typeEmployee}
                </ToggleButton>
                <ToggleButton
                  value="company"
                  sx={{ textTransform: 'none', px: 2, borderRadius: '999px !important' }}
                >
                  {t.typeCompany}
                </ToggleButton>
              </ToggleButtonGroup>
            </FormControl>

            {pack ? (
              <Stack spacing={1}>
                <Box>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    {t.formLabel}
                  </Typography>
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

            {isDe ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={details.smallBusiness === true}
                    onChange={event => setDetail('smallBusiness', event.target.checked)}
                  />
                }
                label={t.deSmallBusiness}
              />
            ) : null}
          </Stack>
        </CardContent>
      </Card>

      {hasAllowances ? (
        <Card>
          <CardHeader style={{ padding: 16, paddingBottom: 8 }}>
            <CardTitle>{t.allowancesCardTitle}</CardTitle>
          </CardHeader>
          <CardContent style={{ paddingTop: 8 }}>
            <Stack spacing={2.5}>
              {isDe ? (
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                    gap: 2,
                  }}
                >
                  <LabeledField label={t.deHomeOfficeDays}>
                    <TextField
                      type="number"
                      placeholder="0"
                      value={details.homeOfficeDays ?? ''}
                      onChange={event =>
                        setDetail('homeOfficeDays', numberOrUndefined(event.target.value))
                      }
                      inputProps={{ min: 0, max: 366 }}
                      fullWidth
                    />
                  </LabeledField>
                  <LabeledField label={t.deHomeStudyMonths}>
                    <TextField
                      type="number"
                      placeholder="0"
                      value={details.homeStudyMonths ?? ''}
                      onChange={event =>
                        setDetail('homeStudyMonths', numberOrUndefined(event.target.value))
                      }
                      inputProps={{ min: 0, max: 12 }}
                      fullWidth
                    />
                  </LabeledField>
                </Box>
              ) : null}

              {isEs ? (
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

              {isPlSelfEmployed ? (
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
                  {details.regime === 'liniowy' || details.regime === 'skala' ? (
                    <TreatmentField
                      label={t.plZusTreatment}
                      deductLabel={t.plTreatmentDeduct}
                      costLabel={t.plTreatmentCost}
                      value={details.zusTreatment}
                      onChange={value => setDetail('zusTreatment', value)}
                    />
                  ) : null}
                  {details.regime === 'liniowy' ? (
                    <TreatmentField
                      label={t.plHealthTreatment}
                      deductLabel={t.plTreatmentDeduct}
                      costLabel={t.plTreatmentCost}
                      value={details.healthTreatment}
                      onChange={value => setDetail('healthTreatment', value)}
                    />
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
            </Stack>
          </CardContent>
        </Card>
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
