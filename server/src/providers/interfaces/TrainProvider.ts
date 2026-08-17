import { Train, Journey, LiveStatus } from '../../types';

/**
 * Provider interface for train data.
 * All provider implementations must satisfy this contract.
 * The frontend never depends on provider response shapes directly.
 */
export interface TrainProvider {
  readonly name: string;

  /**
   * Search for trains by number or name.
   */
  searchTrains(query: string): Promise<Train[]>;

  /**
   * Retrieve a complete journey: route geometry, stations, metadata.
   */
  getJourney(trainId: string): Promise<Journey>;

  /**
   * Get the latest live running status.
   */
  getLiveStatus(trainId: string): Promise<LiveStatus>;
}
