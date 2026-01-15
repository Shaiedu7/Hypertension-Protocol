import 'dotenv/config';

// Turn live-activity plugin OFF by default so Expo Go works.
// Opt-in with USE_LIVE_ACTIVITY=true when building a dev/preview client.
const useLiveActivity = process.env.USE_LIVE_ACTIVITY === 'true';

export default {
  expo: {
    name: "RWJ HP",
    slug: "app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.rwjbarnabas.hypertension-protocol",
      infoPlist: {
        NSSupportsLiveActivities: true,
        NSSupportsLiveActivitiesFrequentUpdates: false,
        ITSAppUsesNonExemptEncryption: false
      },
      entitlements: {}
    },
    plugins: useLiveActivity
      ? [
          [
            "expo-live-activity",
            {
              frequentUpdates: true
            }
          ]
        ]
      : [],
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.rwjbarnabas.hypertensionprotocol"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "02cffa13-e2bd-48aa-a43b-277477f9df31"
      }
    },
    owner: "shumude"
  }
};
