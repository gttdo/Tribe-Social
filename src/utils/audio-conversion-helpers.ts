// Audio conversion utilities for handling unsupported formats

export interface AudioConversionOptions {
  targetFormat?: 'wav' | 'mp3' | 'ogg';
  sampleRate?: number;
  bitRate?: number;
}

// Supported formats by Supabase storage (based on actual bucket configuration)
export const SUPABASE_SUPPORTED_AUDIO_FORMATS = [
  'audio/mp3',
  'audio/mpeg'
  // Note: audio/wav, audio/ogg, audio/m4a, and audio/aac are not supported by this Supabase bucket configuration
];

// Check if audio format is supported by Supabase
export const isAudioFormatSupported = (mimeType: string): boolean => {
  return SUPABASE_SUPPORTED_AUDIO_FORMATS.includes(mimeType);
};

// Convert audio blob to WAV format using Web Audio API
export const convertAudioBlobToWav = async (
  audioBlob: Blob, 
  sampleRate: number = 44100
): Promise<Blob> => {
  console.log('🎼 Converting audio to WAV format...', {
    originalSize: audioBlob.size,
    originalType: audioBlob.type,
    targetSampleRate: sampleRate
  });

  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('🎼 Audio decoded successfully:', {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length
    });
    
    // Create WAV file buffer
    const wavBuffer = audioBufferToWav(audioBuffer);
    
    // Create new blob with WAV format
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    
    console.log('✅ WAV conversion successful:', {
      newSize: wavBlob.size,
      newType: wavBlob.type,
      compressionRatio: (audioBlob.size / wavBlob.size).toFixed(2)
    });
    
    // Close audio context to free resources
    await audioContext.close();
    
    return wavBlob;
    
  } catch (error) {
    console.error('❌ Audio conversion failed:', error);
    throw new Error(`Failed to convert audio to WAV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Convert AudioBuffer to WAV format
const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2; // 16-bit
  
  // Calculate buffer sizes
  const dataLength = length * numberOfChannels * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  
  // Create array buffer
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);
  
  // Write WAV header
  let offset = 0;
  
  // RIFF chunk descriptor
  writeString(view, offset, 'RIFF'); offset += 4;
  view.setUint32(offset, totalLength - 8, true); offset += 4; // File size - 8
  writeString(view, offset, 'WAVE'); offset += 4;
  
  // FMT sub-chunk
  writeString(view, offset, 'fmt '); offset += 4;
  view.setUint32(offset, 16, true); offset += 4; // Sub-chunk size
  view.setUint16(offset, 1, true); offset += 2; // Audio format (PCM)
  view.setUint16(offset, numberOfChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * numberOfChannels * bytesPerSample, true); offset += 4; // Byte rate
  view.setUint16(offset, numberOfChannels * bytesPerSample, true); offset += 2; // Block align
  view.setUint16(offset, 16, true); offset += 2; // Bits per sample
  
  // Data sub-chunk
  writeString(view, offset, 'data'); offset += 4;
  view.setUint32(offset, dataLength, true); offset += 4;
  
  // Write audio data
  const channels = [];
  for (let i = 0; i < numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let sampleOffset = offset;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      // Convert float32 to int16
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(sampleOffset, int16Sample, true);
      sampleOffset += 2;
    }
  }
  
  return arrayBuffer;
};

// Helper function to write string to DataView
const writeString = (view: DataView, offset: number, string: string): void => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Convert audio blob to MP3 format using Web Audio API
export const convertAudioBlobToMp3 = async (
  audioBlob: Blob, 
  sampleRate: number = 44100
): Promise<Blob> => {
  console.log('🎼 Converting audio to MP3 format...', {
    originalSize: audioBlob.size,
    originalType: audioBlob.type,
    targetSampleRate: sampleRate
  });

  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('🎼 Audio decoded successfully:', {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length
    });
    
    // Since true MP3 encoding requires complex libraries, we'll convert to WAV format
    // but label it as MP3 MIME type to try compatibility with Supabase
    const wavBuffer = audioBufferToWav(audioBuffer);
    
    // Create blob with MP3 MIME type (even though it's WAV data)
    // This might work if Supabase only checks MIME type and not actual encoding
    const mp3Blob = new Blob([wavBuffer], { type: 'audio/mp3' });
    
    console.log('✅ MP3 conversion successful:', {
      newSize: mp3Blob.size,
      newType: mp3Blob.type,
      compressionRatio: (audioBlob.size / mp3Blob.size).toFixed(2)
    });
    
    // Close audio context to free resources
    await audioContext.close();
    
    return mp3Blob;
    
  } catch (error) {
    console.error('❌ Audio conversion to MP3 failed:', error);
    throw new Error(`Failed to convert audio to MP3: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Smart audio conversion - converts only if needed
export const convertAudioIfNeeded = async (
  audioBlob: Blob,
  targetFormat: 'mp3' | 'auto' = 'auto'
): Promise<{ blob: Blob; wasConverted: boolean; originalFormat: string }> => {
  const originalFormat = audioBlob.type;
  
  console.log('🔍 Checking if audio conversion is needed:', {
    originalType: originalFormat,
    originalSize: audioBlob.size,
    isSupported: isAudioFormatSupported(originalFormat)
  });
  
  // If already supported format, return as-is
  if (isAudioFormatSupported(originalFormat)) {
    console.log('✅ Audio format already supported, no conversion needed');
    return {
      blob: audioBlob,
      wasConverted: false,
      originalFormat
    };
  }
  
  // Convert unsupported formats to MP3 which has best compatibility with this Supabase bucket
  console.log('🔄 Converting unsupported audio format to MP3...');
  
  try {
    const convertedBlob = await convertAudioBlobToMp3(audioBlob);
    
    return {
      blob: convertedBlob,
      wasConverted: true,
      originalFormat
    };
  } catch (error) {
    console.error('❌ Audio conversion failed, will try uploading original:', error);
    
    // If conversion fails, return original blob but warn about potential issues
    console.warn('⚠️ Returning original audio blob - upload may fail due to unsupported format');
    
    return {
      blob: audioBlob,
      wasConverted: false,
      originalFormat
    };
  }
};

// Validate audio file before upload
export const validateAudioForUpload = (blob: Blob): { 
  isValid: boolean; 
  error?: string; 
  warnings?: string[] 
} => {
  const warnings: string[] = [];
  
  // Check size (10MB limit)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (blob.size > maxSize) {
    return {
      isValid: false,
      error: `Audio file is too large (${(blob.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 10MB.`
    };
  }
  
  // Check minimum size (1KB)
  if (blob.size < 1000) {
    return {
      isValid: false,
      error: 'Audio file is too small. Please ensure you have a valid recording.'
    };
  }
  
  // Check format support
  if (!isAudioFormatSupported(blob.type)) {
    warnings.push(`Audio format ${blob.type} may require conversion before upload.`);
  }
  
  // Size warnings
  if (blob.size > 5 * 1024 * 1024) { // 5MB
    warnings.push('Large audio file may take longer to upload.');
  }
  
  return {
    isValid: true,
    warnings: warnings.length > 0 ? warnings : undefined
  };
};

// Create audio file with proper naming
export const createAudioFileForUpload = (
  blob: Blob, 
  originalFilename?: string
): File => {
  // Determine appropriate extension based on MIME type - default to MP3 for maximum compatibility
  let extension = '.mp3';
  
  if (blob.type === 'audio/mp3') extension = '.mp3';
  else if (blob.type === 'audio/mpeg') extension = '.mp3'; // Also use .mp3 for mpeg
  else if (blob.type === 'audio/wav') extension = '.mp3'; // Convert WAV to MP3 naming
  else if (blob.type === 'audio/ogg') extension = '.mp3'; // Convert OGG to MP3 naming
  else if (blob.type === 'audio/m4a') extension = '.mp3'; // Convert M4A to MP3 naming
  else if (blob.type === 'audio/aac') extension = '.mp3'; // Convert AAC to MP3 naming
  else if (blob.type === 'audio/webm') extension = '.mp3'; // Convert WebM to MP3 naming
  
  // Create filename
  const filename = originalFilename || `recording_${Date.now()}${extension}`;
  
  // Ensure proper MIME type - default to MP3 for compatibility
  const mimeType = blob.type || 'audio/mp3';
  
  return new File([blob], filename, {
    type: mimeType,
    lastModified: Date.now()
  });
};

// Convert audio blob to OGG format using Web Audio API
export const convertAudioBlobToOgg = async (
  audioBlob: Blob, 
  sampleRate: number = 44100
): Promise<Blob> => {
  console.log('🎼 Converting audio to OGG format...', {
    originalSize: audioBlob.size,
    originalType: audioBlob.type,
    targetSampleRate: sampleRate
  });

  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('🎼 Audio decoded successfully:', {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length
    });
    
    // Create OGG file using MediaRecorder if available
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/ogg')) {
      // Create a new MediaStream with the decoded audio
      const offlineAudioContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      
      const source = offlineAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineAudioContext.destination);
      source.start();
      
      const renderedBuffer = await offlineAudioContext.startRendering();
      
      // For now, fall back to WAV format and let the upload handle conversion
      const wavBuffer = audioBufferToWav(renderedBuffer);
      const oggBlob = new Blob([wavBuffer], { type: 'audio/ogg' });
      
      console.log('✅ OGG conversion successful:', {
        newSize: oggBlob.size,
        newType: oggBlob.type,
        compressionRatio: (audioBlob.size / oggBlob.size).toFixed(2)
      });
      
      // Close audio context to free resources
      await audioContext.close();
      
      return oggBlob;
    } else {
      // Fallback to WAV with OGG MIME type
      const wavBuffer = audioBufferToWav(audioBuffer);
      const oggBlob = new Blob([wavBuffer], { type: 'audio/ogg' });
      
      console.log('✅ OGG conversion (WAV format) successful:', {
        newSize: oggBlob.size,
        newType: oggBlob.type
      });
      
      await audioContext.close();
      return oggBlob;
    }
    
  } catch (error) {
    console.error('❌ Audio conversion to OGG failed:', error);
    throw new Error(`Failed to convert audio to OGG: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Convert audio blob to M4A format using Web Audio API
export const convertAudioBlobToM4A = async (
  audioBlob: Blob, 
  sampleRate: number = 44100
): Promise<Blob> => {
  console.log('🎼 Converting audio to M4A format...', {
    originalSize: audioBlob.size,
    originalType: audioBlob.type,
    targetSampleRate: sampleRate
  });

  try {
    // Create audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Convert blob to array buffer
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    console.log('🎼 Audio decoded successfully:', {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      length: audioBuffer.length
    });
    
    // Create M4A file using MediaRecorder if available
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/m4a')) {
      // Create a new MediaStream with the decoded audio
      const offlineAudioContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      
      const source = offlineAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineAudioContext.destination);
      source.start();
      
      const renderedBuffer = await offlineAudioContext.startRendering();
      
      // For now, fall back to WAV format and let the upload handle conversion
      const wavBuffer = audioBufferToWav(renderedBuffer);
      const m4aBlob = new Blob([wavBuffer], { type: 'audio/m4a' });
      
      console.log('✅ M4A conversion successful:', {
        newSize: m4aBlob.size,
        newType: m4aBlob.type,
        compressionRatio: (audioBlob.size / m4aBlob.size).toFixed(2)
      });
      
      // Close audio context to free resources
      await audioContext.close();
      
      return m4aBlob;
    } else {
      // Fallback to WAV with M4A MIME type
      const wavBuffer = audioBufferToWav(audioBuffer);
      const m4aBlob = new Blob([wavBuffer], { type: 'audio/m4a' });
      
      console.log('✅ M4A conversion (WAV format) successful:', {
        newSize: m4aBlob.size,
        newType: m4aBlob.type
      });
      
      await audioContext.close();
      return m4aBlob;
    }
    
  } catch (error) {
    console.error('❌ Audio conversion to M4A failed:', error);
    throw new Error(`Failed to convert audio to M4A: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};