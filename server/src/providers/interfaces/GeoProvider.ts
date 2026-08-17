import { GeoFeature, GeoFeatureCategory, GeoJSONLineString } from '../../types';

export interface GeoProvider {
  readonly name: string;
  getNearbyFeatures(
    route: GeoJSONLineString,
    categories: GeoFeatureCategory[],
    bufferKm?: number,
  ): Promise<GeoFeature[]>;
}
