import type { ConfigContext, ExpoConfig } from 'expo/config';

// app.json holds the static config. This file only adds the Google Sign-In plugin,
// whose iOS URL scheme comes from your own OAuth client ID (see README → Sign-in).
export default ({ config }: ConfigContext): ExpoConfig => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  // "123-abc.apps.googleusercontent.com" → "com.googleusercontent.apps.123-abc"
  const iosUrlScheme = iosClientId ? iosClientId.split('.').reverse().join('.') : null;

  return {
    ...(config as ExpoConfig),
    plugins: [
      ...(config.plugins ?? []),
      'expo-localization',
      ...(iosUrlScheme ? [['@react-native-google-signin/google-signin', { iosUrlScheme }] as [string, object]] : []),
    ],
  };
};
