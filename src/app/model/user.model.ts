export class UserModel {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phone: string;
  pass: string;
  confirmPass: string;
  picURL: string;
  path: string;
  active: boolean;
  reEncode: boolean;
  role: string;
  access_media: string;
  playlist: boolean;
  channel: boolean;
  media: boolean;
  reports: boolean;
  designer: boolean;
  downloadTab: boolean;
  companyID: string;
  lastLogin: Date;
  assignedplaylist :string[];
  partnerName?: string;
  partnerExpireDate?:string;

  constructor() {
    this.id = '';
    this.firstName = '';
    this.lastName = '';
    this.username = '';
    this.email = '';
    this.phone = '';
    this.pass = '';
    this.confirmPass = '';
    this.picURL = '';
    this.path = '';
    this.active = true;
    this.reEncode = true;
    this.role = '';
    this.playlist = false;
    this.channel = false;
    this.media = false;
    this.reports = false;
    this.designer = false;
    this.downloadTab = false;
    this.assignedplaylist = [];
  }
}
