

export class ChannelModel {
  id: string;
  name: string;
  creationDate: Date;
  previewTime: string;
  playlist: ChannelPlaylistModel[];
  playersList: any[];
  path: string;
  url: string;
  thumbnailPath: string;
  thumbnailURL: string;
  lastUpdated : Date
}

export class ChannelPlaylistModel {
  id: string;
  index: string;
  playlist_id: string;
  schedule_id: string;
  isShuffle: boolean;
  MaxMedia: string;
  Previewlength:string;
  previewTime: string;
  state: boolean;
}
