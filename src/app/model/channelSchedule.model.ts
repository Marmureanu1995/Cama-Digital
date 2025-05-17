export class ChannelScheduleModel {
  id: string;
  index: string;
  playlistID: string;
  dateCheck: boolean;
  dateFrom: string;
  dateTo: string;
  allDay: boolean;
  timeCheck: boolean;
  timeFrom: Date;
  timeTo: Date;
  days: string [];
  repeatEveryYear : boolean 
  removeMediaAfterExpiry : boolean;

  constructor() {
    this.id = '';
    this.index = '';
    this.repeatEveryYear = false ;
    this.removeMediaAfterExpiry = false;
    this.playlistID = '';
    this.dateCheck = false;
    this.dateFrom = new Date().toISOString().substring(0, 10);;
    this.dateTo = new Date().toISOString().substring(0, 10);
    this.allDay = true;
    this.timeCheck = false;
     this.timeFrom = new Date;
     this.timeTo = new Date;
    this.days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  }

}
