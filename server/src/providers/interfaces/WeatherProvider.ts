import { WeatherSnapshot, TrainWeather } from '../../types';

export interface WeatherProvider {
  readonly name: string;
  getCurrent(lat: number, lon: number): Promise<WeatherSnapshot>;
  getForecast(lat: number, lon: number): Promise<WeatherSnapshot[]>;
  getTrainWeather(trainId: string, stations: {
    current?: { lat: number; lon: number };
    next?: { lat: number; lon: number };
    destination?: { lat: number; lon: number };
  }): Promise<TrainWeather>;
}
