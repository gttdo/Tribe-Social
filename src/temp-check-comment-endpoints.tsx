// I need to find the comment endpoints to check if they use 'body' field correctly
import { createClient } from '@supabase/supabase-js';

// Example of correct comment insertion pattern
const correctCommentInsert = async (postId: string, userId: string, commentText: string) => {
  const supabase = createClient('', '');
  
  // ✅ CORRECT: Use 'body' field for comment text
  await supabase.from('post_comments').insert({
    post_id: postId,
    user_id: userId,
    body: commentText.trim()
  });

  // ✅ CORRECT: Select 'body' field when fetching comments
  const { data } = await supabase
    .from('post_comments')
    .select('id, user_id, post_id, body, created_at')
    .eq('post_id', postId);

  return data;
};

// ❌ INCORRECT: Using 'content' field instead of 'body'
const incorrectCommentInsert = async (postId: string, userId: string, commentText: string) => {
  const supabase = createClient('', '');
  
  // ❌ WRONG: Don't use 'content' field
  await supabase.from('post_comments').insert({
    post_id: postId,
    user_id: userId,
    content: commentText.trim() // ❌ Should be 'body'
  });
};

export {};