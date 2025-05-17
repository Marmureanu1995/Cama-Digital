import { MediaModel } from './media.model';

export class PlaylistModel {
  id: string;
  name: string;
  creationDate: any;
  previewTime: string;
  media: MediaModel[];
  path: string;
  url: string;
  thumbnailPath: string;
  thumbnailURL: string;
  scheduleID: string;
  isScheduled: boolean = false;
  ExpiryDate: Date;
  forecastdays?: number;
  state: boolean = false;
}
