import { Platform } from 'react-native';

// iOS Live Activities types
interface LiveActivityData {
  nearbyCount: string;
  distance: string;
  lastUpdate: string;
}

interface LiveActivityModule {
  startActivity: (data: LiveActivityData) => Promise<string>;
  updateActivity: (activityId: string, data: LiveActivityData) => Promise<void>;
  endActivity: (activityId: string) => Promise<void>;
  areActivitiesEnabled: () => Promise<boolean>;
}

// TODO: Replace with real native module - Mock implementation for development
// In production, this would be replaced with actual native module
const mockLiveActivityModule: LiveActivityModule = {
  async startActivity(data: LiveActivityData): Promise<string> {
    console.log('Mock: Starting Live Activity with data:', data);
    return 'mock-activity-id';
  },
  
  async updateActivity(activityId: string, data: LiveActivityData): Promise<void> {
    console.log('Mock: Updating Live Activity', activityId, 'with data:', data);
  },
  
  async endActivity(activityId: string): Promise<void> {
    console.log('Mock: Ending Live Activity', activityId);
  },
  
  async areActivitiesEnabled(): Promise<boolean> {
    return Platform.OS === 'ios';
  },
};

// In a real implementation, you would import the native module:
// import { NativeModules } from 'react-native';
// const { VapiLiveActivity } = NativeModules;

export class LiveActivityService {
  private currentActivityId: string | null = null;
  private liveActivityModule: LiveActivityModule;

  constructor() {
    // TODO: Replace with real native module - Use mock module for now
    this.liveActivityModule = mockLiveActivityModule;
    
    // In production, use the actual native module:
    // this.liveActivityModule = VapiLiveActivity;
  }

  async isSupported(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      return false;
    }
    
    try {
      return await this.liveActivityModule.areActivitiesEnabled();
    } catch (error) {
      console.error('Error checking Live Activity support:', error);
      return false;
    }
  }

  async startActivity(nearbyCount: string, distance: string): Promise<boolean> {
    try {
      if (!(await this.isSupported())) {
        return false;
      }

      const data: LiveActivityData = {
        nearbyCount,
        distance,
        lastUpdate: new Date().toLocaleTimeString(),
      };

      this.currentActivityId = await this.liveActivityModule.startActivity(data);
      return true;
    } catch (error) {
      console.error('Error starting Live Activity:', error);
      return false;
    }
  }

  async updateActivity(nearbyCount: string, distance: string): Promise<boolean> {
    try {
      if (!this.currentActivityId || !(await this.isSupported())) {
        return false;
      }

      const data: LiveActivityData = {
        nearbyCount,
        distance,
        lastUpdate: new Date().toLocaleTimeString(),
      };

      await this.liveActivityModule.updateActivity(this.currentActivityId, data);
      return true;
    } catch (error) {
      console.error('Error updating Live Activity:', error);
      return false;
    }
  }

  async endActivity(): Promise<boolean> {
    try {
      if (!this.currentActivityId || !(await this.isSupported())) {
        return false;
      }

      await this.liveActivityModule.endActivity(this.currentActivityId);
      this.currentActivityId = null;
      return true;
    } catch (error) {
      console.error('Error ending Live Activity:', error);
      return false;
    }
  }

  get hasActiveActivity(): boolean {
    return this.currentActivityId !== null;
  }
}

export const liveActivityService = new LiveActivityService();