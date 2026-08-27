export const formatLocation = (locStr: string | undefined): string => {
  if (!locStr) return '';
  try {
    const parsed = JSON.parse(locStr);
    if (parsed.address) {
       // if we have city or state, we can add it, but address already has Calle San Martin, Loma de Chivo, Santo Domingo Oeste, Santo Domingo, 03008, Dominican Republic
       // so returning just address is perfect.
       return parsed.address;
    }
  } catch (e) {
    return locStr;
  }
  return locStr;
};

export const formatLocationRegion = (locStr: string | undefined): string => {
  if (!locStr) return '';
  try {
    const parsed = JSON.parse(locStr);
    const parts = [];
    if (parsed.state) parts.push(parsed.state);
    if (parsed.country) parts.push(parsed.country);
    
    if (parts.length > 0) return parts.join(', ');
    
    // Fallback logic if parsing JSON didn't yield state/country (e.g. older format)
    // We can try to split by commas and take the last two items.
    const addressParts = parsed.address ? parsed.address.split(',').map((s: string) => s.trim()) : locStr.split(',').map(s => s.trim());
    if (addressParts.length >= 2) {
      return addressParts.slice(-2).join(', ');
    }
    return locStr; // Fallback
  } catch (e) {
    // If it's just a raw string, try to get the last comma separated parts
    const parts = locStr.split(',').map(s => s.trim());
    if (parts.length >= 2) {
      return parts.slice(-2).join(', ');
    }
    return locStr;
  }
};

export const formatWorkingHours = (hoursStr: string | undefined): string[] => {
  if (!hoursStr) return [];
  return hoursStr.split(' | ').filter(Boolean);
};

export const toTitleCase = (str: string | undefined): string => {
  if (!str) return '';
  return str.split(' ').map(word => {
    if (word.length === 0) return '';
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  }).join(' ');
};
