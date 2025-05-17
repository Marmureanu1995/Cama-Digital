import * as moment  from 'moment';

export class ScheduleModel {
  id: string;
  mediaID: string;
  dateCheck: boolean;
  dateFrom: string;
  dateTo: string;
  allDay: boolean;
  timeCheck: boolean;
  timeFrom: Date;
  timeTo: Date;
  days: string[];
  removeMediaAfterExpiry : boolean;
  repeatEveryYear: boolean;

  constructor() {
    this.id = "";
    this.mediaID = "";
    this.dateCheck = false;
    this.allDay = true;
    this.timeCheck = false;
    this.removeMediaAfterExpiry =  false;
    this.repeatEveryYear = false;
    this.timeFrom = moment().toDate();
    this.timeTo =  moment().toDate();
    this.dateFrom = new Date().toISOString().substring(0, 10);
    this.dateTo = new Date().toISOString().substring(0, 10);
    this.days = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
  }
}
