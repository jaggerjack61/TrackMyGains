export const GITHUB_OWNER = "jaggerjack61";
export const GITHUB_REPO = "TrackMyGains";
export const GITHUB_BRANCH = "main";
export const CONTENTS_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents?ref=${GITHUB_BRANCH}`;
export const APK_FILENAME_REGEX = /^TrackMyGains-preview-(\d{8})\.apk$/;

export interface ApkInfo {
  name: string;
  download_url: string;
  version_date?: string;
}

export interface GithubContentsItem {
  name: string;
  download_url: string | null;
  type: string;
}

export const parseApkDate = (filename: string): string | null => {
  const match = APK_FILENAME_REGEX.exec(filename);
  return match?.[1] ?? null;
};

const isVersionDate = (value: string | null): value is string =>
  typeof value === "string" && /^\d{8}$/.test(value);

export const isRemoteApkNewer = (
  remoteDate: string | null,
  localDate: string | null,
) => {
  if (!isVersionDate(remoteDate)) return false;
  if (!isVersionDate(localDate)) return true;
  return remoteDate > localDate;
};

export const getLatestApk = (items: ApkInfo[]): ApkInfo | null => {
  const apks = items.filter((item) => parseApkDate(item.name) !== null);
  if (apks.length === 0) return null;

  const result = apks.reduce((latest, current) => {
    const latestDate = parseApkDate(latest.name)!;
    const currentDate = parseApkDate(current.name)!;
    return currentDate > latestDate ? current : latest;
  });

  const versionDate = parseApkDate(result.name);
  return { ...result, version_date: versionDate ?? undefined };
};

export const parseGithubResponse = (
  items: GithubContentsItem[],
): ApkInfo[] => {
  return items
    .filter((item) => item.type === "file" && item.download_url)
    .map((item) => ({
      name: item.name,
      download_url: item.download_url!,
      version_date: parseApkDate(item.name) ?? undefined,
    }));
};
