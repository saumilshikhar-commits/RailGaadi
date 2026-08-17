import { ElevationSummary, GeoJSONLineString } from '../../types';

export interface TerrainProvider {
  readonly name: string;
  getElevationProfile(route: GeoJSONLineString, sampleCount?: number): Promise<ElevationSummary>;
}
