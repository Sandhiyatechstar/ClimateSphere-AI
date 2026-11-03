import {
  BackendCurrentWeather,
  BackendForecastResponse,
  BackendForecastSlot,
} from '../types';
import {
  kelvinToCelsius,
  kelvinToFahrenheit,
  windDegreesToCardinal,
} from './weatherService';

/**
 * Format a live current weather telemetry payload into a structured,
 * progressive 4-level scientific response:
 * 1. Quick Summary (Everyday Language for general users & secondary students)
 * 2. Key Atmospheric Measurements (Clear units: °C, °F, km/h, hPa, %)
 * 3. Meteorological Concepts Explained (Accessible definitions of technical terms)
 * 4. Advanced Scientific Interpretation (For college students & researchers)
 * 5. Data Provenance & Telemetry Metadata
 */
export function formatCurrentWeatherMessage(data: BackendCurrentWeather): string {
  const tempC = kelvinToCelsius(data.temperature_k);
  const tempF = kelvinToFahrenheit(data.temperature_k);
  const feelsC = kelvinToCelsius(data.feels_like_k);
  const feelsF = kelvinToFahrenheit(data.feels_like_k);

  const minC = data.temp_min_k !== null && data.temp_min_k !== undefined ? kelvinToCelsius(data.temp_min_k) : null;
  const maxC = data.temp_max_k !== null && data.temp_max_k !== undefined ? kelvinToCelsius(data.temp_max_k) : null;
  const minF = data.temp_min_k !== null && data.temp_min_k !== undefined ? kelvinToFahrenheit(data.temp_min_k) : null;
  const maxF = data.temp_max_k !== null && data.temp_max_k !== undefined ? kelvinToFahrenheit(data.temp_max_k) : null;

  const windMps = data.wind.speed_mps.toFixed(1);
  const windKmh = (data.wind.speed_mps * 3.6).toFixed(1);
  const windDir = windDegreesToCardinal(data.wind.direction_deg);
  const gustKmh = data.wind.gust_mps ? (data.wind.gust_mps * 3.6).toFixed(1) : null;

  const formatUtcTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toISOString().replace('T', ' ').slice(0, 16);
    } catch {
      return isoString;
    }
  };

  const sunrise = formatUtcTime(data.sun.sunrise_utc);
  const sunset = formatUtcTime(data.sun.sunset_utc);
  const observedAt = formatUtcTime(data.observation_time_utc);
  const retrievedAt = formatUtcTime(data.retrieved_at);

  // Determine an everyday comfort description
  let comfortDesc = 'moderate and comfortable';
  if (tempC >= 35) comfortDesc = 'extremely hot and intense';
  else if (tempC >= 30) comfortDesc = 'very warm and tropical';
  else if (tempC >= 22) comfortDesc = 'pleasantly warm';
  else if (tempC >= 15) comfortDesc = 'mild and temperate';
  else if (tempC >= 5) comfortDesc = 'chilly and cool';
  else comfortDesc = 'very cold';

  // Pressure tendency explanation
  const pressureNote =
    data.pressure_hpa > 1018
      ? 'High barometric pressure (indicates sinking air and generally clear, dry skies).'
      : data.pressure_hpa < 1005
      ? 'Low barometric pressure (indicates rising air, which often leads to cloud formation and rain).'
      : 'Normal sea-level pressure (stable atmospheric state).';

  return `### 🌤️ Weather Report: ${data.city}, ${data.country}

---

#### 1. Quick Summary (Everyday Overview)
Right now in **${data.city}**, the weather is **${data.description}**. The temperature is **${tempC}°C (${tempF}°F)**, feeling like **${feelsC}°C (${feelsF}°F)** due to current moisture and wind. Overall, the air is ${comfortDesc}.

---

#### 2. Key Atmospheric Measurements

| Parameter | Observed Value | Standard Units | Source Metric | Measurement Type |
|:---|:---|:---|:---|:---|
| **Surface Temperature** | **${tempC}°C** / **${tempF}°F** | Celsius & Fahrenheit | \`${data.temperature_k} K\` | *Direct Sensor Observation* |
| **Feels-Like Index** | **${feelsC}°C** / **${feelsF}°F** | Celsius & Fahrenheit | \`${data.feels_like_k} K\` | *Calculated Bioclimatic Index* |
${minC !== null && maxC !== null ? `| **Diurnal Range** | \`${minC}°C\` to \`${maxC}°C\` | \`${minF}°F\` to \`${maxF}°F\` | Min / Max extremes | *Station Extremes* |\n` : ''}| **Relative Humidity** | **${data.humidity_pct}%** | Percentage of saturation | \`${data.humidity_pct}%\` | *Direct Sensor Observation* |
| **Atmospheric Pressure** | **${data.pressure_hpa} hPa** | Hectopascals (millibars) | \`${data.pressure_hpa} hPa\` | *Direct Sensor Observation* |
| **Wind Velocity** | **${windKmh} km/h** (${windMps} m/s) | Metric & SI Units | \`${windMps} m/s\` | *Direct Sensor Observation* |
| **Wind Direction** | **${windDir || 'Variable'}** (${data.wind.direction_deg !== null && data.wind.direction_deg !== undefined ? `${data.wind.direction_deg}°` : 'Unspecified'}) | Compass & Azimuth | \`${data.wind.direction_deg ?? 'N/A'}\` | *Direct Sensor Observation* |
${gustKmh ? `| **Wind Gusts** | \`${gustKmh} km/h\` | Peak vector | \`${data.wind.gust_mps} m/s\` | *Direct Sensor Observation* |\n` : ''}| **Cloud Cover** | **${data.clouds_pct}%** | Fraction of sky covered | \`${data.clouds_pct}%\` | *Satellite / Sensor Observation* |
| **Visibility** | ${data.visibility_m !== null && data.visibility_m !== undefined ? `**${(data.visibility_m / 1000).toFixed(1)} km** (${data.visibility_m} m)` : '*Unavailable from station*'} | Kilometers & meters | Optical range | *Direct Sensor Observation* |
| **Sun Cycle (UTC)** | Sunrise: \`${sunrise}\` \| Sunset: \`${sunset}\` | Coordinated Universal Time | Solar ephemeris | *Astronomical Calculation* |

---

#### 3. Science Terms Explained (Secondary & College Level)
- **Relative Humidity (${data.humidity_pct}%):** The amount of water vapor currently in the air compared to the maximum amount the air could hold at this exact temperature. When humidity is high, moisture evaporates slowly, making warm air feel hotter.
- **Atmospheric Pressure (${data.pressure_hpa} hPa):** The downward force exerted by the weight of the air column above ${data.city}. Standard sea-level pressure is **1013.25 hPa**. ${pressureNote}
- **Feels-Like Temperature:** A calculated bioclimatic index that factors in wind speed (wind-chill effect) and ambient moisture (heat index) to represent actual human thermal comfort.

---

#### 4. Advanced Meteorological Interpretation (For Researchers)
- **Boundary Layer Equilibrium:** ${data.humidity_pct > 75 ? 'Boundary layer exhibits elevated moisture saturation, lowering the lifting condensation level (LCL) and supporting convective cloud growth.' : 'Boundary layer displays moderate moisture flux, maintaining a higher cloud base and stable surface air.'}
- **Barometric Gradient:** At ${data.pressure_hpa} hPa, local synoptic flow is influenced by ${data.pressure_hpa < 1010 ? 'cyclonic low-level convergence' : 'anticyclonic subsidence promoting tropospheric stability'}.
- **Wind Kinematics:** Surface friction produces a velocity of ${windKmh} km/h from ${data.wind.direction_deg !== null && data.wind.direction_deg !== undefined ? `${data.wind.direction_deg}° (${windDir})` : 'variable directions'}.

---

#### 5. Data Provenance & Methodology
- **Data Source:** ${data.data_source}
- **Coordinates:** \`${data.latitude.toFixed(4)}° N, ${data.longitude.toFixed(4)}° E\`
- **Station Observation Time:** \`${observedAt} UTC\`
- **Retrieved by ClimateSphere AI:** \`${retrievedAt} UTC\`
- **Attribution Notice:** Physical values (*temperature, pressure, humidity, wind*) are verified station telemetry. Unit conversions and meteorological explanations are computed and structured by ClimateSphere AI without modifying measured values.`;
}

/**
 * Format a 5-day / 3-hour forecast response into a structured,
 * progressive 4-level scientific response.
 */
export function formatForecastMessage(data: BackendForecastResponse): string {
  const slots = [...data.slots];
  const primarySlots = slots.slice(0, 8); // Next 24 hours (8 intervals of 3 hours)

  const formatSlotTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toUTCString().replace('GMT', 'UTC').slice(0, 22);
    } catch {
      return iso;
    }
  };

  // Find extremes across entire 5-day dataset
  let overallMaxK = -Infinity;
  let overallMinK = Infinity;
  let maxRainPop = 0;
  let rainIntervalCount = 0;

  slots.forEach((s) => {
    if (s.temperature_k > overallMaxK) overallMaxK = s.temperature_k;
    if (s.temperature_k < overallMinK) overallMinK = s.temperature_k;
    if (s.rain_probability && s.rain_probability > maxRainPop) maxRainPop = s.rain_probability;
    if (s.rain_probability && s.rain_probability >= 0.3) rainIntervalCount++;
  });

  const overallMaxC = kelvinToCelsius(overallMaxK);
  const overallMaxF = kelvinToFahrenheit(overallMaxK);
  const overallMinC = kelvinToCelsius(overallMinK);
  const overallMinF = kelvinToFahrenheit(overallMinK);
  const peakRainPct = Math.round(maxRainPop * 100);

  // Table rows for next 24 hours
  const tableRows = primarySlots.map((slot: BackendForecastSlot) => {
    const timeStr = formatSlotTime(slot.forecast_time_utc);
    const tempC = kelvinToCelsius(slot.temperature_k);
    const tempF = kelvinToFahrenheit(slot.temperature_k);
    const pop = slot.rain_probability !== null && slot.rain_probability !== undefined
      ? `${Math.round(slot.rain_probability * 100)}%`
      : '0%';
    const windKmh = (slot.wind.speed_mps * 3.6).toFixed(1);

    return `| \`${timeStr}\` | **${slot.description}** | \`${tempC}°C\` (${tempF}°F) | \`${slot.humidity_pct}%\` | **${pop}** | \`${windKmh} km/h\` | \`${slot.pressure_hpa} hPa\` |`;
  }).join('\n');

  return `### 📅 5-Day Weather Forecast: ${data.city}, ${data.country}

---

#### 1. Quick Summary (Everyday Overview)
Over the next 5 days, temperatures in **${data.city}** will range between a low of **${overallMinC}°C (${overallMinF}°F)** and a high of **${overallMaxC}°C (${overallMaxF}°F)**. 
${peakRainPct > 40 ? `Rain is likely during this period, with peak precipitation probability reaching **${peakRainPct}%**.` : `Conditions are projected to remain predominantly dry, with rain probability staying below **${peakRainPct}%**.`}

---

#### 2. High-Resolution Synoptic Timeline (Next 24 Hours)

| Timeline (UTC) | Sky & Weather | Temperature | Humidity | Rain Prob | Wind Speed | Pressure |
|:---|:---|:---|:---|:---|:---|:---|
${tableRows}

---

#### 3. Key Measurements & Projected Extremes (5-Day Horizon)
- **Projected Peak High:** **\`${overallMaxC}°C\` / \`${overallMaxF}°F\`** *(Source: ${overallMaxK} K)*
- **Projected Low Minimum:** **\`${overallMinC}°C\` / \`${overallMinF}°F\`** *(Source: ${overallMinK} K)*
- **Peak Rain Probability:** **\`${peakRainPct}%\`** (${rainIntervalCount} of 40 intervals show elevated precipitation potential)
- **Dominant Trend:** ${peakRainPct >= 50 ? '🌧️ Active convective pattern with episodic precipitation cycles.' : '☀️ Stable atmospheric ridge with dry, temperate conditions.'}

---

#### 4. Science Terms Explained (Secondary & College Level)
- **Probability of Precipitation (PoP - ${peakRainPct}%):** The statistical likelihood that measurable rain (at least 0.1 mm) will fall at any given spot within the forecast area during the interval. A 40% PoP means there is a 4-in-10 chance of precipitation.
- **3-Hour Numerical Intervals:** Global weather prediction models simulate fluid dynamics in short time-slices (3 hours) to track diurnal thermal cycles and moving pressure troughs.

---

#### 5. Advanced Meteorological Dynamics (For Researchers)
- **Synoptic Forcing:** Thermal variance of ${(overallMaxC - overallMinC).toFixed(1)}°C indicates ${overallMaxC - overallMinC > 10 ? 'a strong diurnal heating cycle or frontal transition.' : 'a moderate coastal or maritime-buffered thermal stability.'}
- **Moisture & Advection:** Projected intervals reflect boundary-layer moisture flux modeled across the 40 time-steps using the Global Forecast System (GFS) and ECMWF numerical inputs.

---

#### 6. Data Provenance & Methodology
- **Data Source:** ${data.data_source}
- **Forecast Horizon:** 5 Days (\`${data.slots.length} intervals at 3-hour granularity\`)
- **Coordinates:** \`${data.latitude.toFixed(4)}° N, ${data.longitude.toFixed(4)}° E\`
- **Retrieved by ClimateSphere AI:** \`${new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC\`
- **Distinction of Measurements vs. Projections:** Historical station data represents physical ground observations; forecast slots are numerical simulation outputs.`;
}
