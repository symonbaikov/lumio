/**
 * Tour menu component
 */

'use client';

import { Button, Divider, ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import { CheckCircle, Circle, Disc, HelpCircle } from 'lucide-react';
import { useIntlayer } from 'next-intlayer';
import { useRouter } from 'next/navigation';
import { cloneElement, isValidElement, useEffect, useState } from 'react';
import { getTourManager } from '../TourManager';
import { createAdminTour } from '../admin-tour';
import { createCategoriesTour } from '../categories-tour';
import { createCustomTablesTour } from '../custom-tables-tour';
import { createDataEntryTour } from '../data-entry-tour';
import { createGoogleSheetsImportTour } from '../google-sheets-import-tour';
import { createGoogleSheetsIntegrationTour } from '../google-sheets-integration-tour';
import { createIntegrationsTour } from '../integrations-tour';
import { createReportsTour } from '../reports-tour';
import { createSettingsTour } from '../settings-tour';
import { createStatementsTour } from '../statements-tour';
import { createStorageTour } from '../storage-tour';
import type { TourConfig } from '../types';
import { createUploadTour } from '../upload-tour';

function getPreferredLang(): string {
  if (typeof document !== 'undefined') {
    const lang = document.documentElement?.lang;
    if (lang) return lang;
  }
  return 'ru';
}

function unwrapIntlayerNode(node: any): any {
  if (!node || typeof node !== 'object') return node;

  // Intlayer (react-intlayer) wraps primitives into a Proxy of a ReactElement.
  // The Proxy exposes `.value` via a getter trap, so `'value' in node` is false.
  const maybeValue = (node as any).value;
  if (typeof maybeValue !== 'undefined') return maybeValue;

  // Dictionary JSON shape: { nodeType: 'translation', translation: { ru: ..., en: ... } }
  if ((node as any).nodeType === 'translation' && (node as any).translation) {
    const lang = getPreferredLang();
    return (
      (node as any).translation?.[lang] ??
      (node as any).translation?.ru ??
      Object.values((node as any).translation)[0]
    );
  }

  return node;
}

function extractText(node: any): string {
  const unwrapped = unwrapIntlayerNode(node);
  if (typeof unwrapped === 'string') return unwrapped;
  return String(unwrapped ?? '');
}

// Helper function for converting IntlayerNode to strings
function extractStepsValues(steps: any) {
  const result: any = {};
  const resolvedSteps = unwrapIntlayerNode(steps);
  if (!resolvedSteps || typeof resolvedSteps !== 'object') return result;

  for (const [key, value] of Object.entries(resolvedSteps)) {
    const resolvedStep = unwrapIntlayerNode(value);
    result[key] = {
      title: extractText((resolvedStep as any)?.title),
      description: extractText((resolvedStep as any)?.description),
    };
  }
  return result;
}

interface TourMenuProps {
  trigger?: React.ReactNode;
  className?: string;
}

export function TourMenu({ trigger, className = '' }: TourMenuProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tours, setTours] = useState<TourConfig[]>([]);
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());
  const open = Boolean(anchorEl);
  const router = useRouter();

  // Get translations for all tours
  const navigationTexts = useIntlayer('navigation') as any;
  const statementsTexts = useIntlayer('statements-tour');
  const uploadTexts = useIntlayer('upload-tour');
  const storageTexts = useIntlayer('storage-tour-content');
  const customTablesTexts = useIntlayer('custom-tables-tour-content');
  const reportsTexts = useIntlayer('reports-tour-content');
  const categoriesTexts = useIntlayer('categories-tour-content');
  const dataEntryTexts = useIntlayer('data-entry-tour-content');
  const integrationsTexts = useIntlayer('integrations-tour-content');
  const settingsTexts = useIntlayer('settings-tour-content');
  const adminTexts = useIntlayer('admin-tour-content');
  const googleSheetsImportTexts = useIntlayer('google-sheets-import-tour-content' as any) as any;
  const googleSheetsIntegrationTexts = useIntlayer(
    'google-sheets-integration-tour-content' as any,
  ) as any;

  const getTourMeta = (texts: any) => {
    const resolved = texts?.content ? texts.content : texts;
    const nameNode = resolved?.name;
    const descriptionNode = resolved?.description;
    return {
      name: typeof nameNode === 'string' ? nameNode : nameNode?.value,
      description: typeof descriptionNode === 'string' ? descriptionNode : descriptionNode?.value,
    };
  };

  // Register tours on mount
  useEffect(() => {
    const tourManager = getTourManager();

    // Create and register all tours
    const allTours = [
      createStatementsTour(statementsTexts),
      createUploadTour(uploadTexts),
      createStorageTour({
        ...getTourMeta(storageTexts),
        steps: extractStepsValues(storageTexts?.steps ?? (storageTexts as any)?.content?.steps),
      }),
      createCustomTablesTour({
        ...getTourMeta(customTablesTexts),
        steps: extractStepsValues(
          customTablesTexts?.steps ?? (customTablesTexts as any)?.content?.steps,
        ),
      }),
      createReportsTour({
        ...getTourMeta(reportsTexts),
        steps: extractStepsValues(reportsTexts?.steps ?? (reportsTexts as any)?.content?.steps),
      }),
      createCategoriesTour({
        ...getTourMeta(categoriesTexts),
        steps: extractStepsValues(
          categoriesTexts?.steps ?? (categoriesTexts as any)?.content?.steps,
        ),
      }),
      createDataEntryTour({
        ...getTourMeta(dataEntryTexts),
        steps: extractStepsValues(dataEntryTexts?.steps ?? (dataEntryTexts as any)?.content?.steps),
      }),
      createIntegrationsTour({
        ...getTourMeta(integrationsTexts),
        steps: extractStepsValues(
          integrationsTexts?.steps ?? (integrationsTexts as any)?.content?.steps,
        ),
      }),
      googleSheetsImportTexts?.steps
        ? createGoogleSheetsImportTour({
            ...getTourMeta(googleSheetsImportTexts),
            steps: extractStepsValues(
              googleSheetsImportTexts?.steps ?? (googleSheetsImportTexts as any)?.content?.steps,
            ),
          })
        : null,
      googleSheetsIntegrationTexts?.steps
        ? createGoogleSheetsIntegrationTour({
            ...getTourMeta(googleSheetsIntegrationTexts),
            steps: extractStepsValues(
              googleSheetsIntegrationTexts?.steps ??
                (googleSheetsIntegrationTexts as any)?.content?.steps,
            ),
          })
        : null,
      createSettingsTour({
        ...getTourMeta(settingsTexts),
        steps: extractStepsValues(settingsTexts?.steps ?? (settingsTexts as any)?.content?.steps),
      }),
      createAdminTour({
        ...getTourMeta(adminTexts),
        steps: extractStepsValues(adminTexts?.steps ?? (adminTexts as any)?.content?.steps),
      }),
    ].filter(Boolean) as TourConfig[];

    allTours.forEach(tour => tourManager.registerTour(tour));
  }, [
    statementsTexts,
    uploadTexts,
    storageTexts,
    customTablesTexts,
    reportsTexts,
    categoriesTexts,
    dataEntryTexts,
    integrationsTexts,
    settingsTexts,
    adminTexts,
  ]);

  useEffect(() => {
    const tourManager = getTourManager();
    const registeredTours = tourManager.getAllTours();
    setTours(registeredTours);

    // Function for updating list of completed tours
    const updateCompletedTours = () => {
      const completed = new Set<string>();
      registeredTours.forEach(tour => {
        if (tourManager.isTourCompleted(tour.id)) {
          completed.add(tour.id);
        }
      });
      setCompletedTours(completed);
    };

    updateCompletedTours();

    // Update list on localStorage change (when tour is completed)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'finflow_tour_state') {
        updateCompletedTours();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also check every 500ms if menu is open (for update in same tab)
    let interval: NodeJS.Timeout | null = null;
    if (open) {
      interval = setInterval(updateCompletedTours, 500);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (interval) clearInterval(interval);
    };
  }, [open]); // Update on menu open

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTourSelect = async (tourId: string) => {
    const tourManager = getTourManager();
    const tour = tours.find(t => t.id === tourId);

    handleClose();

    // If tour is already completed, reset it so it can be taken again
    if (tourManager.isTourCompleted(tourId)) {
      tourManager.resetTour(tourId);
    }

    // If tour has a page and we are not on it - navigate there
    if (tour?.page && !window.location.pathname.startsWith(tour.page)) {
      router.push(tour.page);
      // Wait for page load before starting tour
      await new Promise(resolve => setTimeout(resolve, 800));
    }

    tourManager.startTour(tourId, 0, {
      nextBtnText: navigationTexts.tour.buttons.next.value,
      prevBtnText: navigationTexts.tour.buttons.prev.value,
      doneBtnText: navigationTexts.tour.buttons.done.value,
      progressText: navigationTexts.tour.progressText?.value ?? '{{current}} / {{total}}',
    });
  };

  const defaultTrigger = (
    <button
      type="button"
      onClick={handleClick}
      aria-label={navigationTexts.tour.menuLabel?.value ?? 'Tours'}
      className={`h-9 w-9 rounded-full flex items-center justify-center shadow-sm ${className} bg-primary text-white`}
    >
      <HelpCircle size={16} />
    </button>
  );

  return (
    <>
      {trigger ? (
        isValidElement(trigger) ? (
          cloneElement(trigger as any, {
            onClick: (event: any) => {
              (trigger as any).props?.onClick?.(event);
              handleClick(event);
            },
          })
        ) : (
          <button type="button" onClick={handleClick}>
            {trigger}
          </button>
        )
      ) : (
        defaultTrigger
      )}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: {
            minWidth: 250,
            mt: 1,
          },
        }}
      >
        {tours.length === 0 && (
          <MenuItem disabled>
            <ListItemText primary="Tours not found" />
          </MenuItem>
        )}
        {tours.map((tour, index) => {
          const isCompleted = completedTours.has(tour.id);
          return (
            <div key={tour.id}>
              {index > 0 && index % 3 === 0 && <Divider />}
              <MenuItem onClick={() => handleTourSelect(tour.id)}>
                <ListItemIcon>
                  {isCompleted ? (
                    <Disc size={20} style={{ color: '#3b82f6' }} />
                  ) : (
                    <Circle size={20} style={{ color: '#9ca3af' }} />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={tour.name}
                  secondary={tour.description}
                  primaryTypographyProps={{
                    fontSize: 14,
                    fontWeight: 500,
                  }}
                  secondaryTypographyProps={{
                    fontSize: 12,
                    noWrap: true,
                  }}
                />
              </MenuItem>
            </div>
          );
        })}
      </Menu>
    </>
  );
}
