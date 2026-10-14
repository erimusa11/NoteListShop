import * as ScreenCapture from 'expo-screen-capture';
import { Platform } from 'react-native';

const KEY = 'appLock';

/**
 * Hides what is on the screen from screenshots and screen recordings, and from the list of recent apps (Android: a blank
 * preview; iOS: the app switcher shows it blurred). For while the app lock is on and an account is signed in.
 */
export async function protectScreen(): Promise<void> {
  try {
    await ScreenCapture.preventScreenCaptureAsync(KEY);
    if (Platform.OS === 'ios') await ScreenCapture.enableAppSwitcherProtectionAsync(1);
  } catch {
    // A device that cannot do it simply keeps the screen as it was; the lock itself does not depend on this.
  }
}

export async function unprotectScreen(): Promise<void> {
  try {
    await ScreenCapture.allowScreenCaptureAsync(KEY);
    if (Platform.OS === 'ios') await ScreenCapture.disableAppSwitcherProtectionAsync();
  } catch {
    // see protectScreen
  }
}
