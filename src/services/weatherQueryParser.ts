/**
 * ClimateSphere AI - Weather Query & Intent Parser
 * 
 * Recognizes basic weather, temperature, rain, and forecast queries.
 * Extracts the target city name and maps intent to 'current' or 'forecast'.
 */

export interface WeatherQueryParseResult {
  isWeatherQuery: boolean;
  intent: 'current' | 'forecast';
  city: string;
}

export function parseWeatherQuery(rawPrompt: string): WeatherQueryParseResult | null {
  const trimmed = rawPrompt.trim();
  if (!trimmed) return null;

  // 1. Detect if forecast is explicitly requested
  const hasForecastTerm = /\b(forecast|upcoming|next few days|5-day|5 day|extended outlook|week ahead|tomorrow)\b/i.test(trimmed);
  const hasCurrentTerm = /\b(today|now|right now|currently|current)\b/i.test(trimmed);

  let intent: 'current' | 'forecast' = 'current';
  if (hasForecastTerm) {
    if (hasCurrentTerm && /\bweather\b/i.test(trimmed) && !/\b(5-day|5 day|week)\b/i.test(trimmed)) {
      intent = 'current';
    } else {
      intent = 'forecast';
    }
  }

  // 2. Weather keyword check
  const hasWeatherKeyword = /\b(weather|temperature|temp|forecast|rain|raining|precipitation|humidity|wind|pressure|conditions|climate|barometric|sunny|cloudy|hot|cold)\b/i.test(trimmed);

  if (!hasWeatherKeyword) {
    return null;
  }

  // Helper to clean city string
  const cleanCity = (rawCity: string): string => {
    let c = rawCity.trim();
    // remove leading/trailing punctuation
    c = c.replace(/^[^\w]+|[^\w]+$/g, '');
    // remove leading articles or words
    c = c.replace(/^(the|city of|in|for|of|at)\s+/i, '');
    // remove trailing noise words
    c = c.replace(/\s+(today|now|right now|currently|tomorrow|tonight|please|this week|for me|next few days|next week)$/i, '');
    c = c.replace(/^[^\w]+|[^\w]+$/g, '');
    return c.trim();
  };

  const isInvalidCity = (c: string) => {
    if (!c || c.length < 2) return true;
    return /^(the|today|tomorrow|now|yesterday|world|globe|earth|space|this|that|here|there|me|us|what|how|why|when|which)$/i.test(c);
  };

  // Pattern A: "Weather Forecast – What's the weather in Chennai today?" (Suggestion cards / complex prompts)
  const suggestionMatch = trimmed.match(/(?:weather|forecast|temperature|rain|temp).*?(?:in|for|of|at)\s+([a-zA-Z\s\.\-']+?)(?:\?|\.|\!|\btoday\b|\bnow\b|$)/i);
  if (suggestionMatch && suggestionMatch[1]) {
    const candidate = cleanCity(suggestionMatch[1]);
    if (!isInvalidCity(candidate)) {
      return { isWeatherQuery: true, intent, city: candidate };
    }
  }

  // Pattern B: Questions with prepositions:
  // "weather in Chennai", "temperature for London", "is it raining in Tokyo?", "temp of Mumbai"
  const prepPatterns = [
    /(?:is it raining|will it rain|is it hot|is it cold)\s+(?:in|at)\s+([a-zA-Z\s\.\-']+?)(?:\?|\.|\!|$)/i,
    /(?:weather|forecast|temperature|temp|rain|raining|humidity|wind|pressure|conditions)\s+(?:in|for|of|at)\s+([a-zA-Z\s\.\-']+?)(?:\?|\.|\!|$|\b(?:today|tomorrow|now|currently)\b)/i,
    /(?:in|for|at)\s+([a-zA-Z\s\.\-']+?)(?:\s+(?:today|tomorrow|now|currently|weather|forecast))?\s*[\?\.\!]?$/i,
    /(?:what(?:'s| is) the (?:weather|temperature|temp|forecast))\s+(?:like\s+)?(?:in|for|at)\s+([a-zA-Z\s\.\-']+?)(?:\?|\.|\!|$|\b(?:today|tomorrow|now)\b)/i,
    /(?:how is the weather)\s+(?:in|for|at)\s+([a-zA-Z\s\.\-']+?)(?:\?|\.|\!|$|\b(?:today|tomorrow|now)\b)/i,
  ];

  for (const pattern of prepPatterns) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      const candidate = cleanCity(match[1]);
      if (!isInvalidCity(candidate)) {
        return { isWeatherQuery: true, intent, city: candidate };
      }
    }
  }

  // Pattern C: City before keyword:
  // "Chennai weather", "Mumbai temperature", "London forecast", "Tokyo rain"
  const precedingMatch = trimmed.match(/^([a-zA-Z\s\.\-']+?)\s+(?:weather|forecast|temperature|temp|rain|raining|humidity|wind)\b/i);
  if (precedingMatch && precedingMatch[1]) {
    const candidate = cleanCity(precedingMatch[1]);
    if (!isInvalidCity(candidate) && !/^(the|current|global|local|daily|weekly|hourly)$/i.test(candidate)) {
      return { isWeatherQuery: true, intent, city: candidate };
    }
  }

  // Pattern D: Keyword directly before city:
  // "weather Chennai", "forecast London", "temperature Mumbai"
  const postMatch = trimmed.match(/^(?:weather|forecast|temperature|temp)\s+([a-zA-Z\s\.\-']+?)(?:\?|\.|\!|$)/i);
  if (postMatch && postMatch[1]) {
    const candidate = cleanCity(postMatch[1]);
    if (!isInvalidCity(candidate) && !/^(the|report|data|telemetry|radar|map|today|tomorrow|now)$/i.test(candidate)) {
      return { isWeatherQuery: true, intent, city: candidate };
    }
  }

  return null;
}
