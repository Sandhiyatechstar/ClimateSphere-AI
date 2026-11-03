import React, { createContext, useContext, useState, ReactNode } from 'react';
import { TemperatureUnit, WeatherStation, UnitPreferences } from '../types';
import { DEFAULT_STATIONS } from '../utils/constants';

interface WeatherContextType {
  selectedStation: WeatherStation;
  setSelectedStation: (station: WeatherStation) => void;
  units: UnitPreferences;
  setTemperatureUnit: (unit: TemperatureUnit) => void;
  isTelemetryLive: boolean;
  setIsTelemetryLive: (live: boolean) => void;
  stations: WeatherStation[];
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export const WeatherProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [selectedStation, setSelectedStation] = useState<WeatherStation>(DEFAULT_STATIONS[0]);
  const [units, setUnits] = useState<UnitPreferences>({
    temperature: 'celsius',
    windSpeed: 'kmh',
    pressure: 'hpa',
  });
  // Telemetry is false/placeholder by default per requirements
  const [isTelemetryLive, setIsTelemetryLive] = useState<boolean>(false);

  const setTemperatureUnit = (unit: TemperatureUnit) => {
    setUnits((prev) => ({ ...prev, temperature: unit }));
  };

  return (
    <WeatherContext.Provider
      value={{
        selectedStation,
        setSelectedStation,
        units,
        setTemperatureUnit,
        isTelemetryLive,
        setIsTelemetryLive,
        stations: DEFAULT_STATIONS,
      }}
    >
      {children}
    </WeatherContext.Provider>
  );
};

export function useWeatherContext(): WeatherContextType {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeatherContext must be used within a WeatherProvider');
  }
  return context;
}
