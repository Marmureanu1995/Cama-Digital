import { Injectable, Inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';

@Injectable()
export class VideoProcessingService {

  constructor(
    @Inject(DOCUMENT) private document: Document,
  ) { }


  public generateThumbnail(videoFile: Blob): Promise<any> {
    const video: HTMLVideoElement = this.document.createElement('video');
    const canvas: HTMLCanvasElement = this.document.createElement('canvas');
    const context: CanvasRenderingContext2D = canvas.getContext('2d');
    return new Promise<any>((resolve, reject) => {
      canvas.addEventListener('error', reject);
      video.addEventListener('error', reject);
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = Math.round(video.duration / 2);
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      });
      video.addEventListener('canplay', event => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        var obj = {
          width: video.videoWidth,
          height: video.videoHeight,
          base64: canvas.toDataURL(),
          length: video.duration
        };
        resolve(obj);
      });
      if (videoFile.type) {
        video.setAttribute('type', videoFile.type);
      }
      video.preload = 'auto';
      video.src = window.URL.createObjectURL(videoFile);
      video.load();
    });
  }

}
