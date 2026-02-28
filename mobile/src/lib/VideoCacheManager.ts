import { documentDirectory, getInfoAsync, makeDirectoryAsync, createDownloadResumable, deleteAsync } from 'expo-file-system/legacy';

// We store videos in the app's document directory which is securely isolated
// from the user's camera roll/gallery on both iOS and Android.
const CACHE_DIR = (documentDirectory || '') + 'workout_videos/';

export const VideoCacheManager = {
    // Ensure the hidden cache directory exists
    async initCacheDir() {
        const dirInfo = await getInfoAsync(CACHE_DIR);
        if (!dirInfo.exists) {
            await makeDirectoryAsync(CACHE_DIR, { intermediates: true });
        }
    },

    // Generates a local file path based on the exercise ID
    getLocalPath(exerciseId: string): string {
        return `${CACHE_DIR}${exerciseId}.mp4`;
    },

    // Check if a video is already downloaded
    async isVideoCached(exerciseId: string): Promise<boolean> {
        const path = this.getLocalPath(exerciseId);
        const info = await getInfoAsync(path);
        return info.exists;
    },

    // Download a video for offline use
    async downloadVideo(exerciseId: string, remoteUrl: string, onProgress?: (progress: number) => void): Promise<string> {
        await this.initCacheDir();
        const localPath = this.getLocalPath(exerciseId);

        const downloadResumable = createDownloadResumable(
            remoteUrl,
            localPath,
            {},
            (downloadProgress) => {
                const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
                if (onProgress) onProgress(progress);
            }
        );

        try {
            const result = await downloadResumable.downloadAsync();
            if (!result) throw new Error("Download failed");
            return result.uri;
        } catch (e) {
            console.error('Video download error:', e);
            throw e;
        }
    },

    // Delete a cached video to free up space
    async removeCachedVideo(exerciseId: string): Promise<void> {
        const localPath = this.getLocalPath(exerciseId);
        try {
            const info = await getInfoAsync(localPath);
            if (info.exists) {
                await deleteAsync(localPath);
            }
        } catch (e) {
            console.error('Failed to remove cached video:', e);
        }
    },

    // Get the playback URI (returns local if downloaded, otherwise returns remote)
    async getPlaybackUri(exerciseId: string, remoteUrl: string): Promise<string> {
        const isCached = await this.isVideoCached(exerciseId);
        if (isCached) {
            return this.getLocalPath(exerciseId);
        }
        return remoteUrl;
    }
};
