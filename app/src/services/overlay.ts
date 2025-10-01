import { Platform, PermissionsAndroid, Alert } from 'react-native';

// Android overlay types
interface OverlayData {
  nearbyCount: string;
  distance: string;
}

interface OverlayModule {
  requestOverlayPermission: () => Promise<boolean>;
  hasOverlayPermission: () => Promise<boolean>;
  showOverlay: (data: OverlayData) => Promise<void>;
  updateOverlay: (data: OverlayData) => Promise<void>;
  hideOverlay: () => Promise<void>;
  isOverlayShowing: () => Promise<boolean>;
}

// TODO: Replace with real native module - Mock implementation for development
const mockOverlayModule: OverlayModule = {
  async requestOverlayPermission(): Promise<boolean> {
    console.log('Mock: Requesting overlay permission');
    return Platform.OS === 'android';
  },
  
  async hasOverlayPermission(): Promise<boolean> {
    console.log('Mock: Checking overlay permission');
    return Platform.OS === 'android';
  },
  
  async showOverlay(data: OverlayData): Promise<void> {
    console.log('Mock: Showing overlay with data:', data);
  },
  
  async updateOverlay(data: OverlayData): Promise<void> {
    console.log('Mock: Updating overlay with data:', data);
  },
  
  async hideOverlay(): Promise<void> {
    console.log('Mock: Hiding overlay');
  },
  
  async isOverlayShowing(): Promise<boolean> {
    return false;
  },
};

export class OverlayService {
  private overlayModule: OverlayModule;
  private isShowing: boolean = false;

  constructor() {
    // TODO: Replace with real native module - Use mock module for now
    this.overlayModule = mockOverlayModule;
    
    // In production, use the actual native module:
    // import { NativeModules } from 'react-native';
    // const { VapiOverlay } = NativeModules;
    // this.overlayModule = VapiOverlay;
  }

  async isSupported(): Promise<boolean> {
    return Platform.OS === 'android' && Platform.Version >= 23;
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (!(await this.isSupported())) {
        return false;
      }

      // First check if we already have permission
      const hasPermission = await this.overlayModule.hasOverlayPermission();
      if (hasPermission) {
        return true;
      }

      // Show explanation dialog
      return new Promise((resolve) => {
        Alert.alert(
          'Permiso de overlay',
          'Vapi necesita permiso para mostrar información sobre espacios de estacionamiento mientras usas otras apps. Esto te permitirá ver actualizaciones sin abrir la app.',
          [
            {
              text: 'Cancelar',
              onPress: () => resolve(false),
              style: 'cancel',
            },
            {
              text: 'Permitir',
              onPress: async () => {
                try {
                  const granted = await this.overlayModule.requestOverlayPermission();
                  resolve(granted);
                } catch (error) {
                  console.error('Error requesting overlay permission:', error);
                  resolve(false);
                }
              },
            },
          ]
        );
      });
    } catch (error) {
      console.error('Error in requestPermission:', error);
      return false;
    }
  }

  async showOverlay(nearbyCount: string, distance: string): Promise<boolean> {
    try {
      if (!(await this.isSupported())) {
        return false;
      }

      const hasPermission = await this.overlayModule.hasOverlayPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          return false;
        }
      }

      const data: OverlayData = {
        nearbyCount,
        distance,
      };

      await this.overlayModule.showOverlay(data);
      this.isShowing = true;
      return true;
    } catch (error) {
      console.error('Error showing overlay:', error);
      return false;
    }
  }

  async updateOverlay(nearbyCount: string, distance: string): Promise<boolean> {
    try {
      if (!this.isShowing || !(await this.isSupported())) {
        return false;
      }

      const data: OverlayData = {
        nearbyCount,
        distance,
      };

      await this.overlayModule.updateOverlay(data);
      return true;
    } catch (error) {
      console.error('Error updating overlay:', error);
      return false;
    }
  }

  async hideOverlay(): Promise<boolean> {
    try {
      if (!(await this.isSupported())) {
        return false;
      }

      await this.overlayModule.hideOverlay();
      this.isShowing = false;
      return true;
    } catch (error) {
      console.error('Error hiding overlay:', error);
      return false;
    }
  }

  get isOverlayShowing(): boolean {
    return this.isShowing;
  }
}

export const overlayService = new OverlayService();