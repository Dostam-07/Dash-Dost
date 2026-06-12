export const normalizeGeoData = (data: any[], key: string) => {
  // Simple mapping for common ISO codes to names, or vice-versa
  const isoMap: Record<string, string> = {
    'US': 'United States',
    'GB': 'United Kingdom',
    'FR': 'France',
    'DE': 'Germany',
    'JP': 'Japan',
    'CA': 'Canada',
    'AU': 'Australia',
    // Add more as needed
  };

  return data.map(row => {
    const val = row[key];
    if (typeof val === 'string' && isoMap[val.toUpperCase()]) {
      return { ...row, [key]: isoMap[val.toUpperCase()] };
    }
    return row;
  });
};
