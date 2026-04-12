import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader } from './ui/card';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Textarea } from './ui/textarea';
import { 
  ArrowLeft, 
  Check, 
  Heart, 
  MessageCircle, 
  Share, 
  Bookmark,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Edit3
} from 'lucide-react';
import { PostPreviewData } from '../utils/post-creation-types';
import { REALM_COLORS } from '../utils/post-creation-constants';

interface PostPreviewProps {
  postData: PostPreviewData;
  onBack: () => void;
  onPublish: (finalData: PostPreviewData) => void;
  onEdit: () => void;
}

export function PostPreview({ postData, onBack, onPublish, onEdit }: PostPreviewProps) {
  const [caption, setCaption] = useState(postData.caption || '');
  const [isPlaying, setIsPlaying] = useState(false);
  const [showCaptionEditor, setShowCaptionEditor] = useState(false);

  const maxCaptionLength = 250;
  const realmColors = REALM_COLORS[postData.selectedRealm as keyof typeof REALM_COLORS] || REALM_COLORS.mirrorcore;

  const handlePublish = () => {
    onPublish({
      ...postData,
      caption: caption.trim()
    });
  };

  const mockTimestamp = "now";
  const mockLikes = Math.floor(Math.random() * 20) + 1;

  return (
    <div className="min-h-screen bg-midnight-black flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-midnight-black/90 border-b border-muted-lavender/20 pt-safe">
        <div className="flex items-center justify-between px-4 py-3">
          <Button
            onClick={onBack}
            variant="ghost" 
            size="sm"
            className="text-muted-lavender hover:text-pearl-white"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back
          </Button>
          
          <h1 className="font-headline text-pearl-white">Preview Post</h1>
          
          <Button
            onClick={handlePublish}
            size="sm"
            className="bg-gradient-to-r from-neon-lilac to-electric-blue hover:from-neon-lilac/90 hover:to-electric-blue/90 text-white"
          >
            <Check className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-6">
        {/* Preview Info */}
        <Card className="bg-gradient-to-r from-neon-lilac/10 to-electric-blue/10 border-neon-lilac/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-neon-lilac" />
              <div>
                <p className="text-pearl-white font-body font-medium">
                  This is how your post will appear in the feed
                </p>
                <p className="text-muted-lavender font-body text-sm">
                  You can still edit the caption before sharing
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Post Preview */}
        <Card className="bg-transparent border-0">
          <CardHeader className="pb-3">
            {/* Post Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="w-10 h-10">
                  {postData.userAvatar ? (
                    <img src={postData.userAvatar} alt="User avatar" className="w-full h-full object-cover" />
                  ) : (
                    <AvatarFallback className={`bg-gradient-to-r from-${realmColors.primary} to-${realmColors.secondary} text-white font-headline`}>
                      {postData.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <p className="font-body font-medium text-pearl-white">@{postData.username}</p>
                  <div className="flex items-center space-x-2 text-xs text-muted-lavender font-body">
                    <span>{mockTimestamp}</span>
                    <span>•</span>
                    <span className="capitalize">{postData.selectedRealm}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 pt-0">
            {/* Media Content */}
            {postData.type === 'image' && postData.processedImage && (
              <div className="w-full rounded-2xl mb-4 overflow-hidden">
                <img 
                  src={postData.processedImage.url}
                  alt="Post content"
                  className="w-full h-auto object-cover"
                  style={{ aspectRatio: postData.processedImage.aspectRatio.replace(':', '/') }}
                />
              </div>
            )}

            {/* Audio Content */}
            {postData.type === 'audio' && postData.audioBlob && (
              <div className="w-full rounded-2xl mb-4 p-6 bg-gradient-to-br from-neon-lilac/10 to-electric-blue/10 border border-neon-lilac/30">
                <div className="flex items-center space-x-4">
                  <Button
                    onClick={() => setIsPlaying(!isPlaying)}
                    size="lg"
                    className="rounded-full bg-neon-lilac hover:bg-neon-lilac/90 text-white"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                  </Button>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Volume2 className="w-4 h-4 text-neon-lilac" />
                      <span className="text-pearl-white font-body text-sm">Voice Note</span>
                    </div>
                    <div className="w-full h-2 bg-muted-lavender/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-neon-lilac to-electric-blue rounded-full transition-all duration-300"
                        style={{ width: isPlaying ? '60%' : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Thought Content */}
            {postData.type === 'thought' && postData.content && (
              <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-muted-lavender/5 to-electric-blue/5 border border-muted-lavender/20">
                <p className="text-pearl-white font-body leading-relaxed">
                  {postData.content}
                </p>
              </div>
            )}

            {/* Engagement Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender">
                  <Heart className="w-6 h-6" />
                </div>
                <div className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender">
                  <Share className="w-6 h-6" />
                </div>
              </div>
              <div className="p-2 bg-transparent border-0 rounded-lg text-muted-lavender">
                <Bookmark className="w-6 h-6" />
              </div>
            </div>

            {/* Likes Count */}
            <p className="font-body font-medium text-pearl-white mb-2">
              {mockLikes} {mockLikes === 1 ? 'like' : 'likes'}
            </p>

            {/* Caption */}
            {caption && (
              <div className="mb-3">
                <p className="text-pearl-white font-body leading-relaxed">
                  {caption}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Caption Editor */}
        <Card className="bg-midnight-black/60 border-muted-lavender/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-pearl-white">Add a caption</h3>
              <Button
                onClick={() => setShowCaptionEditor(!showCaptionEditor)}
                variant="ghost"
                size="sm"
                className="text-muted-lavender hover:text-pearl-white"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              <Textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value.slice(0, maxCaptionLength))}
                placeholder="Write a caption for your post..."
                className="min-h-[100px] bg-midnight-black/50 border-muted-lavender/30 text-pearl-white placeholder:text-muted-lavender/60 font-body resize-none"
                maxLength={maxCaptionLength}
              />
              
              <div className="flex items-center justify-between text-sm">
                <div className="text-muted-lavender/60 font-body">
                  Optional but recommended for engagement
                </div>
                <div className={`font-body ${
                  caption.length > maxCaptionLength * 0.9 
                    ? caption.length >= maxCaptionLength 
                      ? 'text-glitch-red' 
                      : 'text-electric-blue'
                    : 'text-muted-lavender/60'
                }`}>
                  {caption.length}/{maxCaptionLength}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Options */}
        <div className="space-y-3">
          <h3 className="font-headline text-pearl-white text-sm">Want to make changes?</h3>
          
          <div className="grid grid-cols-1 gap-3">
            <Button
              onClick={onEdit}
              variant="outline"
              className="justify-start bg-transparent border-muted-lavender/30 text-muted-lavender hover:text-pearl-white hover:border-muted-lavender/50"
            >
              <Edit3 className="w-4 h-4 mr-3" />
              Edit content or image
            </Button>
          </div>
        </div>

        {/* XP Preview */}
        <Card className={`bg-gradient-to-r ${realmColors.gradient} border-${realmColors.primary}/30`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-center space-x-2">
              <Sparkles className={`w-5 h-5 text-${realmColors.primary}`} />
              <span className={`font-headline text-${realmColors.primary}`}>
                +{postData.type === 'thought' ? '10' : postData.type === 'audio' ? '20' : '25'} XP
              </span>
              <span className="text-muted-lavender font-body text-sm">when you share this</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}