export class CompanyModel {
  id: string;
  name: string;
  username: string;
  email: string;
  playerLimit: number;
  pass: string;
  confirmPass: string;
  picURL: string;
  path: string;
  isActive: boolean;
  superAdmin: boolean;
  companyExpireDate?: string;
  partnerId?: string;
  appId?: string = "";
  appPassword?: string = "";
  storageAllowed?: number;
  usedStorageLimit?: number;
  constructor() {
    this.id = '';
    this.name = '';
    this.username = '';
    this.email = '';
    this.playerLimit = 1;
    this.pass = '';
    this.confirmPass = '';
    this.picURL = '';
    this.path = '';
    this.isActive = false;
    this.superAdmin = false;
    this.storageAllowed = 1;//in Megabytes
    this.usedStorageLimit = 0;
  }
}
