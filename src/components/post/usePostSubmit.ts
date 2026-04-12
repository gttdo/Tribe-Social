import { useState } from 'react';
import { supabase } from '../../utils/supabase/client';
import { STORAGE_BUCKET, inferPostType, type Visibility } from './post-constants';

interface SubmitParams {
  text: string;
  media: File | null;
  audioBlob: Blob | null;
  visibility: Visibility;
  tribeId?: string | null;
}

export function usePostSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadMedia = async (file: File | Blob, userId: string, fileName: string): Promise<string> => {
    const path = `posts/${userId}/${Date.now()}_${fileName}`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, file, { contentType: file instanceof File ? file.type : 'audio/webm', upsert: false });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return urlData.publicUrl;
  };

  const submit = async (params: SubmitParams): Promise<{ success: boolean; postId?: string }> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) throw new Error('You must be signed in to post.');

      const userId = session.user.id;
      const mediaFile = params.audioBlob || params.media;
      let mediaUrl: string | null = null;
      let postType = inferPostType(params.media);

      if (params.audioBlob) {
        postType = 'audio';
        const fileName = `recording_${Date.now()}.webm`;
        mediaUrl = await uploadMedia(params.audioBlob, userId, fileName);
      } else if (params.media) {
        mediaUrl = await uploadMedia(params.media, userId, params.media.name);
      }

      const payload: Record<string, any> = {
        post_type: postType,
        visibility: params.visibility || 'public',
      };

      if (postType === 'thought') {
        payload.text_body = params.text.trim();
      } else {
        payload.media_url = mediaUrl;
        if (params.text.trim()) payload.caption = params.text.trim();
      }

      if (params.tribeId) payload.tribe_id = params.tribeId;

      const { makeAuthenticatedRequest } = await import('../../utils/supabase/client');
      const result = await makeAuthenticatedRequest('/make-server-70df0d6e/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (result.error) throw new Error(result.error);

      return { success: true, postId: result.post?.id };
    } catch (err: any) {
      const msg = err?.message || 'Something went wrong. Please try again.';
      setError(msg);
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error, clearError: () => setError(null) };
}
