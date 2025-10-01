import { Linking, Platform, Alert } from 'react-native';

export interface NavigationOption {
  name: string;
  url: string;
  available: boolean;
}

export function getNavigationOptions(lat: number, lng: number): NavigationOption[] {
  const options: NavigationOption[] = [];

  // Waze
  options.push({
    name: 'Waze',
    url: `waze://?ll=${lat},${lng}&navigate=yes`,
    available: true,
  });

  // Google Maps
  options.push({
    name: 'Google Maps',
    url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    available: true,
  });

  // Apple Maps (iOS only)
  if (Platform.OS === 'ios') {
    options.push({
      name: 'Apple Maps',
      url: `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d`,
      available: true,
    });
  }

  return options;
}

export async function openNavigation(lat: number, lng: number, preferredApp?: string) {
  const options = getNavigationOptions(lat, lng);
  
  if (preferredApp) {
    const option = options.find(opt => opt.name.toLowerCase() === preferredApp.toLowerCase());
    if (option) {
      return openNavigationUrl(option.url, option.name);
    }
  }

  // Show selection dialog if no preference or preferred app not found
  return showNavigationDialog(options);
}

async function openNavigationUrl(url: string, appName: string): Promise<boolean> {
  try {
    const canOpen = await Linking.canOpenURL(url);
    
    if (canOpen) {
      await Linking.openURL(url);
      return true;
    } else {
      // Fallback to Google Maps web if app not installed
      const fallbackUrl = url.startsWith('http') 
        ? url 
        : `https://www.google.com/maps/dir/?api=1&destination=${extractCoordinatesFromUrl(url)}`;
      
      await Linking.openURL(fallbackUrl);
      return true;
    }
  } catch (error) {
    Alert.alert(
      'Error',
      `No se pudo abrir ${appName}. Intenta instalarlo desde la tienda de aplicaciones.`
    );
    return false;
  }
}

function extractCoordinatesFromUrl(url: string): string {
  const wazeMatch = url.match(/ll=([^&]+)/);
  if (wazeMatch) return wazeMatch[1];
  
  const appleMatch = url.match(/daddr=([^&]+)/);
  if (appleMatch) return appleMatch[1];
  
  return '';
}

function showNavigationDialog(options: NavigationOption[]) {
  const buttons = options.map(option => ({
    text: option.name,
    onPress: () => openNavigationUrl(option.url, option.name),
  }));

  buttons.push({
    text: 'Cancelar',
    onPress: () => {},
  });

  Alert.alert(
    'Abrir navegación',
    'Elige tu app de navegación preferida:',
    buttons,
    { cancelable: true }
  );
}