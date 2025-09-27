// Sound utility functions for timer notifications

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.isEnabled = true;
    this.volume = 0.5;
    this.initAudioContext();
  }

  initAudioContext() {
    try {
      // Create AudioContext on user interaction to avoid browser restrictions
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  async ensureAudioContext() {
    if (!this.audioContext) {
      this.initAudioContext();
    }
    
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (error) {
        console.warn('Failed to resume audio context:', error);
      }
    }
  }

  // Attempt to unlock audio on a user gesture
  async warmUp() {
    try {
      await this.ensureAudioContext();
      if (!this.audioContext) return;

      // Create a very short, near-silent buffer to satisfy autoplay policies
      const duration = 0.02;
      const sampleRate = this.audioContext.sampleRate || 44100;
      const frameCount = Math.max(1, Math.floor(sampleRate * duration));
      const buffer = this.audioContext.createBuffer(1, frameCount, sampleRate);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < frameCount; i++) channelData[i] = 0.00001; // near silent
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      const gain = this.audioContext.createGain();
      gain.gain.value = 0.00001;
      source.connect(gain).connect(this.audioContext.destination);
      source.start();
    } catch (e) {
      // No-op: warmup failures are fine
    }
  }

  // Generate a pleasant completion sound using Web Audio API
  async playCompletionSound() {
    if (!this.isEnabled || !this.audioContext) {
      return;
    }

    try {
      await this.ensureAudioContext();
      
      // Create a pleasant multi-tone notification sound
      const now = this.audioContext.currentTime;
      
      // First tone (higher pitch)
      this.playTone(800, now, 0.3, 'sine');
      
      // Second tone (lower pitch) - slightly delayed
      this.playTone(600, now + 0.15, 0.3, 'sine');
      
      // Third tone (middle pitch) - final note
      this.playTone(700, now + 0.3, 0.4, 'sine');
      
    } catch (error) {
      console.warn('Failed to play completion sound:', error);
    }
  }

  playTone(frequency, startTime, duration, waveType = 'sine') {
    if (!this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.type = waveType;
    
    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  // Play notification using system notification sound (fallback)
  async playSystemNotification() {
    if (!this.isEnabled) return;

    try {
      // Try to play a system notification sound
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURE');
      audio.volume = this.volume;
      await audio.play();
    } catch (error) {
      // Fallback to Web Audio API sound
      await this.playCompletionSound();
    }
  }

  // Main method to play timer completion notification
  async playTimerComplete() {
    if (!this.isEnabled) return;

    try {
      // Warm up right before attempting to play (covers long idle timers)
      await this.warmUp();
      // Try multiple notification methods
      await this.playCompletionSound();
      // Also try HTMLAudio/system sound as a fallback path
      await this.playSystemNotification();
      
      // Also try browser notification if permission granted
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Pomodoro Complete!', {
          body: 'Time to take a break!',
          icon: '/vite.svg',
          silent: false // This will use system notification sound
        });
      }
    } catch (error) {
      console.warn('Failed to play timer completion sound:', error);
    }
  }

  // Settings methods
  setEnabled(enabled) {
    this.isEnabled = enabled;
    localStorage.setItem('timerSoundEnabled', enabled.toString());
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('timerSoundVolume', this.volume.toString());
  }

  getEnabled() {
    const stored = localStorage.getItem('timerSoundEnabled');
    return stored !== null ? stored === 'true' : true;
  }

  getVolume() {
    const stored = localStorage.getItem('timerSoundVolume');
    return stored !== null ? parseFloat(stored) : 0.5;
  }

  // Initialize settings from localStorage
  loadSettings() {
    this.isEnabled = this.getEnabled();
    this.volume = this.getVolume();
  }

  // Request notification permission
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.warn('Failed to request notification permission:', error);
        return false;
      }
    }
    return Notification.permission === 'granted';
  }
}

// Create and export a singleton instance
const soundManager = new SoundManager();
soundManager.loadSettings();

export default soundManager;
