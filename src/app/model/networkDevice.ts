import { MediaModel } from "./media.model";

export class NetworkDeviceModel {
  id: string;
  playerName: string = "";
  hexCode: string;
  connectionInterval: number = 1;
  timeZone: string;
  channelID: string;
  videoCheck: boolean;
  audioCheck: boolean;
  activeCheck: boolean = false;
  companyID: string;
  location: { lat: number; lng: number, address: string } | null = null;
  description: string = "";
  playlistId: string = "";
  playerSetting?: {
    offset?: { x?: number, y?: number };
    resolution?: { width?: string, height?: string };
    fit?: string;
    transition?: string
  };
  screenInfo?: {
    manufacturer?: string;
    model?: string;
    size?: string;
    screenResolution?: string;
    contentResolution?: string;
  };
  assignedMedia?: MediaModel;

  constructor() {
    // this.id = '';
    this.playerName = "";
    this.connectionInterval = 1;
    this.hexCode = "";
    this.timeZone = "";
    this.channelID = "";
    this.companyID = "";
    this.audioCheck = false;
    this.activeCheck = false;
    this.videoCheck = false;
    this.playerSetting = {
      fit: "fill",
      resolution: {
        height: "",
        width: ""
      }
    };
    this.screenInfo = {
      manufacturer: "",
      model: "",
      size: "",
      screenResolution: "",
      contentResolution: ""
    };
  }
}
