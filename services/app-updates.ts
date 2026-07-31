import { Alert, Platform } from "react-native";

import Constants, { ExecutionEnvironment } from "expo-constants";
import { getDownloadedApkMetadata, setApkVersionDate } from "@/services/database";
import {
  ApkInfo,
  CONTENTS_API_URL,
  getLatestApk,
  GithubContentsItem,
  isRemoteApkNewer,
  parseGithubResponse,
} from "@/services/app-update-metadata";

export type { ApkInfo, GithubContentsItem };

export interface UpdateResult {
  updateAvailable: boolean;
  versionDate?: string;
  downloadUrl?: string;
  downloadedPath?: string;
  error?: string;
}

interface UpdateCheckOptions {
  reportUnsupportedRuntime?: boolean;
}

interface ConfirmationOptions {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
}

const APK_MIME_TYPE = "application/vnd.android.package-archive";
const INSTALL_APK_ACTION = "android.intent.action.VIEW";
const UNKNOWN_APP_SOURCES_ACTION = "android.settings.MANAGE_UNKNOWN_APP_SOURCES";
const GRANT_READ_URI_PERMISSION_FLAG = 1;
const UPDATE_NOTIFICATION_DURATION_MS = 2500;
const UNSUPPORTED_NATIVE_RUNTIME_MESSAGE =
  "App updates require a preview or development build because Expo Go cannot load the native downloader.";

let isDownloadInProgress = false;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

const isExpoGoRuntime = () =>
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const isNativeApkUpdaterSupported = () =>
  Platform.OS === "android" && !isExpoGoRuntime();

const showConfirmationAlert = ({
  title,
  message,
  confirmText,
  cancelText,
}: ConfirmationOptions) =>
  new Promise<boolean>((resolve) => {
    let hasResolved = false;
    const finish = (value: boolean) => {
      if (hasResolved) return;
      hasResolved = true;
      resolve(value);
    };

    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => finish(false) },
        { text: confirmText, onPress: () => finish(true) },
      ],
      { cancelable: true, onDismiss: () => finish(false) },
    );
  });

const promptForUpdateDownload = (versionDate: string) =>
  showConfirmationAlert({
    title: "Update Available",
    message: `TrackMyGains update ${versionDate} is available. Download it now?`,
    confirmText: "Download Update",
    cancelText: "Not Now",
  });

const promptForUpdateInstall = (versionDate: string) =>
  showConfirmationAlert({
    title: "Update Downloaded",
    message: `TrackMyGains update ${versionDate} finished downloading. Install it now?`,
    confirmText: "Install Update",
    cancelText: "Later",
  });

const fetchLatestRemoteApk = async () => {
  const response = await fetch(CONTENTS_API_URL, {
    headers: { Accept: "application/vnd.github.v3+json" },
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data: GithubContentsItem[] = await response.json();
  return getLatestApk(parseGithubResponse(data));
};

const toUpdateResult = (
  latest: ApkInfo,
  downloadedPath?: string,
): UpdateResult => ({
  updateAvailable: true,
  versionDate: latest.version_date,
  downloadUrl: latest.download_url,
  downloadedPath,
});

const getInstalledApkVersionDate = () => {
  const configuredDate = Constants.expoConfig?.extra?.apkVersionDate;
  return typeof configuredDate === "string" && /^\d{8}$/.test(configuredDate)
    ? configuredDate
    : null;
};

const getPendingDownloadPath = async (versionDate: string) => {
  const metadata = await getDownloadedApkMetadata();
  if (metadata?.version_date !== versionDate || !metadata.file_path) return undefined;
  const FileSystem = await import("expo-file-system/legacy");
  const fileUri = metadata.file_path.startsWith("file://")
    ? metadata.file_path
    : `file://${metadata.file_path}`;
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  return fileInfo.exists ? metadata.file_path : undefined;
};

const showUpdateFoundNotification = async () => {
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const currentPermissions = await Notifications.getPermissionsAsync();
  const permissions = currentPermissions.granted
    ? currentPermissions
    : await Notifications.requestPermissionsAsync();
  if (!permissions.granted) return;

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "New update found",
      body: "Downloading in the background.",
    },
    trigger: null,
  });

  setTimeout(() => {
    void Notifications.dismissNotificationAsync(identifier);
  }, UPDATE_NOTIFICATION_DURATION_MS);
};

const downloadApkWithDownloadManager = async (
  downloadUrl: string,
  fileName: string,
) => {
  const { default: ReactNativeBlobUtil } = await import("react-native-blob-util");
  const filePath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;

  const response = await ReactNativeBlobUtil.config({
    addAndroidDownloads: {
      useDownloadManager: true,
      notification: true,
      title: fileName,
      description: "TrackMyGains update",
      mime: APK_MIME_TYPE,
      mediaScannable: true,
      path: filePath,
    },
  }).fetch("GET", downloadUrl);

  return response.path() || filePath;
};

const openUnknownAppSettings = async (
  intentLauncher: typeof import("expo-intent-launcher"),
) => {
  await intentLauncher.startActivityAsync(UNKNOWN_APP_SOURCES_ACTION, {
    data: "package:com.jaggerjack61.TrackMyGains",
  });
};

const promptInstallApk = async (downloadedPath: string) => {
  const intentLauncher = await import("expo-intent-launcher");
  const FileSystem = await import("expo-file-system/legacy");
  const fileUri = downloadedPath.startsWith("file://")
    ? downloadedPath
    : `file://${downloadedPath}`;
  const contentUri = await FileSystem.getContentUriAsync(fileUri);

  try {
    await intentLauncher.startActivityAsync(INSTALL_APK_ACTION, {
      data: contentUri,
      type: APK_MIME_TYPE,
      flags: GRANT_READ_URI_PERMISSION_FLAG,
    });
  } catch {
    await openUnknownAppSettings(intentLauncher);
  }
};

export const checkForUpdates = async (
  options: UpdateCheckOptions = {},
): Promise<UpdateResult> => {
  if (Platform.OS !== "android") {
    return { updateAvailable: false };
  }

  if (isExpoGoRuntime()) {
    return {
      updateAvailable: false,
      error: options.reportUnsupportedRuntime
        ? UNSUPPORTED_NATIVE_RUNTIME_MESSAGE
        : undefined,
    };
  }

  try {
    const latest = await fetchLatestRemoteApk();

    if (!latest || !latest.version_date) {
      return { updateAvailable: false };
    }

    const installedDate = getInstalledApkVersionDate();
    if (!isRemoteApkNewer(latest.version_date, installedDate)) {
      return { updateAvailable: false };
    }

    const downloadedPath = await getPendingDownloadPath(latest.version_date);
    return toUpdateResult(latest, downloadedPath);
  } catch (error: unknown) {
    console.error("[App Updates] Check failed:", error);
    return { updateAvailable: false, error: errorMessage(error, "Unknown error") };
  }
};

export const downloadAndInstallApk = async (
  downloadUrl: string,
  versionDate: string,
): Promise<string | null> => {
  if (!isNativeApkUpdaterSupported()) return UNSUPPORTED_NATIVE_RUNTIME_MESSAGE;
  if (isDownloadInProgress) return "Download already in progress";

  isDownloadInProgress = true;
  try {
    const fileName = `TrackMyGains-preview-${versionDate}.apk`;
    await showUpdateFoundNotification();
    const downloadedPath = await downloadApkWithDownloadManager(downloadUrl, fileName);
    await setApkVersionDate(versionDate, fileName, downloadedPath);
    const shouldInstall = await promptForUpdateInstall(versionDate);
    if (!shouldInstall) return null;
    try {
      await promptInstallApk(downloadedPath);
    } catch (error: unknown) {
      return errorMessage(
        error,
        "Could not open installer. Enable 'Install unknown apps' in settings.",
      );
    }
    return null;
  } catch (error: unknown) {
    console.error("[App Updates] Download/install failed:", error);
    return errorMessage(error, "Download failed");
  } finally {
    isDownloadInProgress = false;
  }
};

export const promptForUpdateIfAvailable = async (
  options: UpdateCheckOptions = {},
): Promise<UpdateResult> => {
  const result = await checkForUpdates(options);
  if (result.error || !result.updateAvailable || !result.downloadUrl || !result.versionDate) {
    return result;
  }

  if (result.downloadedPath) {
    const shouldInstall = await promptForUpdateInstall(result.versionDate);
    if (!shouldInstall) return result;
    try {
      await promptInstallApk(result.downloadedPath);
      return result;
    } catch (error: unknown) {
      return {
        ...result,
        error: errorMessage(
          error,
          "Could not open installer. Enable 'Install unknown apps' in settings.",
        ),
      };
    }
  }

  const shouldDownload = await promptForUpdateDownload(result.versionDate);
  if (!shouldDownload) return result;

  const error = await downloadAndInstallApk(result.downloadUrl, result.versionDate);
  return error ? { ...result, updateAvailable: false, error } : result;
};

export const manualCheckForUpdates = async (): Promise<UpdateResult> => {
  return promptForUpdateIfAvailable({ reportUnsupportedRuntime: true });
};
