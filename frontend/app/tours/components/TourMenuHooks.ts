/**
 * Custom hooks for TourMenu component
 */

import { useEffect, useState } from 'react';
import { getTourManager } from '../TourManager';
import { createAdminTour } from '../admin-tour';
import { createCategoriesTour } from '../categories-tour';
import { createCustomTablesTour } from '../custom-tables-tour';
import { createGoogleSheetsImportTour } from '../google-sheets-import-tour';
import { createGoogleSheetsIntegrationTour } from '../google-sheets-integration-tour';
import { createIntegrationsTour } from '../integrations-tour';
import { createReportsTour } from '../reports-tour';
import { createSettingsTour } from '../settings-tour';
import { createStatementsTour } from '../statements-tour';
import type { TourConfig } from '../types';
import { getTourContentSteps, getTypedTourInput } from './TourMenuHelpers';
import type { TourTextContent } from './TourMenuHelpers';

type CreateCustomTablesTourInput = Parameters<typeof createCustomTablesTour>[0];
type CreateReportsTourInput = Parameters<typeof createReportsTour>[0];
type CreateCategoriesTourInput = Parameters<typeof createCategoriesTour>[0];
type CreateIntegrationsTourInput = Parameters<typeof createIntegrationsTour>[0];
type CreateGoogleSheetsImportTourInput = Parameters<typeof createGoogleSheetsImportTour>[0];
type CreateGoogleSheetsIntegrationTourInput = Parameters<
  typeof createGoogleSheetsIntegrationTour
>[0];
type CreateSettingsTourInput = Parameters<typeof createSettingsTour>[0];
type CreateAdminTourInput = Parameters<typeof createAdminTour>[0];

export interface TourTextsMap {
  customTables: TourTextContent;
  reports: TourTextContent;
  categories: TourTextContent;
  integrations: TourTextContent;
  settings: TourTextContent;
  admin: TourTextContent;
  googleSheetsImport: TourTextContent;
  googleSheetsIntegration: TourTextContent;
}

export function buildAllTours(texts: TourTextsMap, statementsTexts: unknown): TourConfig[] {
  return [
    createStatementsTour(statementsTexts as Parameters<typeof createStatementsTour>[0]),
    createCustomTablesTour(getTypedTourInput<CreateCustomTablesTourInput>(texts.customTables)),
    createReportsTour(getTypedTourInput<CreateReportsTourInput>(texts.reports)),
    createCategoriesTour(getTypedTourInput<CreateCategoriesTourInput>(texts.categories)),
    createIntegrationsTour(getTypedTourInput<CreateIntegrationsTourInput>(texts.integrations)),
    getTourContentSteps(texts.googleSheetsImport)
      ? createGoogleSheetsImportTour(
          getTypedTourInput<CreateGoogleSheetsImportTourInput>(texts.googleSheetsImport),
        )
      : null,
    getTourContentSteps(texts.googleSheetsIntegration)
      ? createGoogleSheetsIntegrationTour(
          getTypedTourInput<CreateGoogleSheetsIntegrationTourInput>(texts.googleSheetsIntegration),
        )
      : null,
    createSettingsTour(getTypedTourInput<CreateSettingsTourInput>(texts.settings)),
    createAdminTour(getTypedTourInput<CreateAdminTourInput>(texts.admin)),
  ].filter(Boolean) as TourConfig[];
}

export interface TourRegistrationOptions {
  statementsTexts: unknown;
  tourTexts: TourTextsMap;
}

export function useTourRegistration(options: TourRegistrationOptions): void {
  const { statementsTexts, tourTexts } = options;
  useEffect(() => {
    const tourManager = getTourManager();
    const allTours = buildAllTours(tourTexts, statementsTexts);
    allTours.forEach(tour => tourManager.registerTour(tour));
  }, [statementsTexts, tourTexts]);
}

export interface TourCompletedState {
  tours: TourConfig[];
  completedTours: Set<string>;
}

export function useTourCompletedState(open: boolean): TourCompletedState {
  const [tours, setTours] = useState<TourConfig[]>([]);
  const [completedTours, setCompletedTours] = useState<Set<string>>(new Set());

  useEffect(() => {
    const tourManager = getTourManager();
    const registeredTours = tourManager.getAllTours();
    setTours(registeredTours);

    const updateCompleted = (): void => {
      const completed = new Set<string>();
      registeredTours.forEach(tour => {
        if (tourManager.isTourCompleted(tour.id)) {
          completed.add(tour.id);
        }
      });
      setCompletedTours(completed);
    };

    updateCompleted();

    const handleStorageChange = (e: StorageEvent): void => {
      if (e.key === 'lumio_tour_state') {
        updateCompleted();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = open ? setInterval(updateCompleted, 500) : null;

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [open]);

  return { tours, completedTours };
}
