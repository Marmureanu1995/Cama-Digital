import { Injectable } from '@angular/core';

var channel;
var playList;

@Injectable({
  providedIn: 'root'
})
export class ChannelPendingChangeService {

  constructor() { }
  get getPerviousChannel() {
    return channel;
  }

  get getPerviousPlayList() {
    return playList;
  }

  set selectedChannel(PervoiusChannel: any) {
    channel = PervoiusChannel;
  }

  set selectedPlayList(PervoiusPlayList: any) {
    playList = PervoiusPlayList;
  }
}
