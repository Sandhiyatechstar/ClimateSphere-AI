import { ApiResponse, fetchWithFallback } from './apiClient';
import { ClimateResearchHighlight } from '../types';

/**
 * Climate Research Service
 * Provides research highlights, anomaly indicators, and dataset catalogs.
 * Labelled as placeholders until external research data stores are integrated.
 */

export interface ClimateTelemetryOverview {
  globalMeanTempAnomaly: string;
  co2AtmosphericPpm: string;
  oceanHeatContentZJ: string;
  arcticSeaIceAnomaly: string;
  integrationStatus: string;
}

export const climateService = {
  /**
   * Fetches key planetary climate indicators.
   */
  async getPlanetaryIndicators(): Promise<ApiResponse<ClimateTelemetryOverview>> {
    const placeholderIndicators: ClimateTelemetryOverview = {
      globalMeanTempAnomaly: '+-- °C [Awaiting Copernicus ERA5]',
      co2AtmosphericPpm: '--- ppm [Awaiting NOAA ESRL feed]',
      oceanHeatContentZJ: '--- ZJ [Awaiting Argo float data]',
      arcticSeaIceAnomaly: '-.- M km² [Awaiting NSIDC feed]',
      integrationStatus: 'Data source endpoints configured for Phase 2 integration',
    };

    return fetchWithFallback('/climate/indicators', placeholderIndicators);
  },

  /**
   * Fetches latest climate research publications & atmospheric bulletins.
   */
  async getResearchHighlights(): Promise<ApiResponse<ClimateResearchHighlight[]>> {
    const placeholderHighlights: ClimateResearchHighlight[] = [
      {
        id: 'CR-2026-001',
        title: 'Polar Vortex Disruption & Tropospheric Coupling Model',
        category: 'Atmospheric Physics',
        date: 'Integration Ready',
        summary: 'Placeholder research item: Model correlation between stratospheric warming events and mid-latitude freeze waves.',
        source: 'Atmospheric Sciences Repository (Placeholder)',
      },
      {
        id: 'CR-2026-002',
        title: 'Atlantic Meridional Overturning Circulation (AMOC) Stability Analysis',
        category: 'Oceanic Circulation',
        date: 'Integration Ready',
        summary: 'Placeholder research item: High-resolution salinity proxies and subpolar gyre heat transport analysis.',
        source: 'Global Ocean Observation Network (Placeholder)',
      },
    ];

    return fetchWithFallback('/climate/research/highlights', placeholderHighlights);
  },
};
