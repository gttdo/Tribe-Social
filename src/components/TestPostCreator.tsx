import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner@2.0.3';
import { FeedPost } from '../utils/social-feed-types';

interface TestPostCreatorProps {
  onPostCreated: (post: FeedPost) => void;
}

export function TestPostCreator({ onPostCreated }: TestPostCreatorProps) {
  const [postType, setPostType] = useState<'thought' | 'image' | 'video' | 'audio'>('thought');
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  const sampleMediaUrls = {
    image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop&auto=format.jpg',
    video: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    audio: 'https://www2.cs.uic.edu/~i101/SoundFiles/Tada.wav'
  };

  const createTestPost = () => {
    if (!caption.trim()) {
      toast.error('Please add a caption');
      return;
    }

    const testPost: FeedPost = {
      id: `test-${Date.now()}`,
      username: 'testuser',
      nickname: 'Test User',
      coreRealm: 'mirrorcore',
      timestamp: new Date().toISOString(),
      caption: caption.trim(),
      content: postType === 'thought' ? caption.trim() : undefined,
      imageUrl: postType !== 'thought' ? (mediaUrl || sampleMediaUrls[postType]) : null,
      mediaThumbnailUrl: postType === 'video' ? (mediaUrl || sampleMediaUrls[postType]) : null,
      liked: false,
      bookmarked: false,
      likes: 0,
      comments: [],
      xpEarned: 10,
      type: postType,
      visibility: 'public'
    };

    onPostCreated(testPost);
    setCaption('');
    setMediaUrl('');
    toast.success('Test post created!');
  };

  const useSampleUrl = () => {
    if (postType !== 'thought') {
      setMediaUrl(sampleMediaUrls[postType]);
    }
  };

  return (
    <Card className="bg-midnight-black/50 border-electric-blue/30">
      <CardHeader>
        <CardTitle className="text-pearl-white text-sm">
          🧪 Test Post Creator (Development Mode)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-xs text-muted-lavender mb-2 block">Post Type</label>
          <Select value={postType} onValueChange={(value: any) => setPostType(value)}>
            <SelectTrigger className="bg-midnight-black/30 border-muted-lavender/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-midnight-black border-muted-lavender/30">
              <SelectItem value="thought">💭 Thought</SelectItem>
              <SelectItem value="image">🖼️ Image</SelectItem>
              <SelectItem value="video">🎥 Video</SelectItem>
              <SelectItem value="audio">🎵 Audio</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-xs text-muted-lavender mb-2 block">Caption</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="What's on your mind?"
            className="bg-midnight-black/30 border-muted-lavender/30 text-pearl-white resize-none"
            rows={3}
          />
        </div>

        {postType !== 'thought' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-muted-lavender">Media URL</label>
              <Button
                size="sm"
                variant="ghost"
                onClick={useSampleUrl}
                className="text-xs text-electric-blue hover:text-electric-blue/80"
              >
                Use Sample URL
              </Button>
            </div>
            <Input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={`Enter ${postType} URL or use sample`}
              className="bg-midnight-black/30 border-muted-lavender/30 text-pearl-white"
            />
          </div>
        )}

        <Button
          onClick={createTestPost}
          className="w-full bg-neon-lilac hover:bg-neon-lilac/90 text-midnight-black"
        >
          Create Test Post
        </Button>

        <div className="text-center space-y-1">
          <p className="text-xs text-muted-lavender/60">
            Creates a test post to preview video and audio players
          </p>
          <p className="text-xs text-electric-blue/60">
            💡 Use this to test media functionality while edge functions are being deployed
          </p>
        </div>
      </CardContent>
    </Card>
  );
}