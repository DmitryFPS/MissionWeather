import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'local.missionweather.app',
  appName: 'MissionWeather',
  webDir: '../web/out',
  server: {
    androidScheme: 'https',
  },
};

export default config;
