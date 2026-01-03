import { supabase } from './supabase';

/**
 * Upload an audio blob to Supabase Storage.
 * @param audioBlob - The audio blob to upload
 * @param userId - The user's ID (used for file path organization)
 * @returns Object with success status and audio URL or error message
 */
export async function uploadAudio(
  audioBlob: Blob,
  userId: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const extension = audioBlob.type.includes('webm') ? 'webm' : 'm4a';
    const fileName = `${userId}/${timestamp}_audio.${extension}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('contributions')
      .upload(fileName, audioBlob, {
        contentType: audioBlob.type,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Audio upload error:', error);
      return { success: false, error: error.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('contributions')
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      return { success: false, error: 'Failed to get public URL' };
    }

    return { success: true, url: urlData.publicUrl };
  } catch (err) {
    console.error('Audio upload exception:', err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error occurred' 
    };
  }
}
