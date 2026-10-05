/**
 * Sisaket RoadGuard Web Audio API Sound Synthesizer
 * สร้างเสียงสังเคราะห์คุณภาพสูง ไม่มี Latency 0ms และไม่ต้องโหลดไฟล์เสียงภายนอก
 */

class AudioNotificationService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sisaket_admin_muted');
      if (saved !== null) {
        this.isMuted = saved === 'true';
      }
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (typeof window !== 'undefined') {
      localStorage.setItem('sisaket_admin_muted', String(muted));
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  /**
   * เสียงแจ้งเตือนสดเมื่อมีคำขอ/รีเควสใหม่ส่งเข้ามา (Incoming Request Chime)
   * โทน D5 (587Hz) -> A5 (880Hz) -> D6 (1174Hz) แบบระฆังทองคำใส ไพเราะ ไม่รบกวน
   */
  public playNewRequestChime() {
    if (this.isMuted) return;

    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 587.33, start: now, duration: 0.14, gain: 0.22 },
        { freq: 880.00, start: now + 0.11, duration: 0.16, gain: 0.26 },
        { freq: 1174.66, start: now + 0.24, duration: 0.45, gain: 0.32 },
      ];

      notes.forEach(({ freq, start, duration, gain: peakGain }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration);
      });
    } catch (e) {
      console.warn('Audio chime playback error:', e);
    }
  }

  /**
   * เล่นเสียงตอนซ่อมเสร็จหรือทำรายการสำเร็จ
   */
  public playSuccessChime() {
    if (this.isMuted) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);

        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.35);
      });
    } catch {
      // Ignore
    }
  }
}

export const audioNotification = new AudioNotificationService();

// Backward compatibility export
export function playAlertChime(type: 'success' | 'new_report' | 'warning' = 'new_report') {
  if (type === 'new_report') {
    audioNotification.playNewRequestChime();
  } else if (type === 'success') {
    audioNotification.playSuccessChime();
  }
}
