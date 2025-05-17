import { Component, OnInit } from '@angular/core';
import { Router } from "@angular/router";
import { CommonserviceService } from "../../../commonservice/commonservice.service";
import { FirebaseService } from '../../../services/firebase.service';
import { take, takeUntil } from 'rxjs/operators';
@Component({
  selector: 'ngx-topBar',
  styleUrls: ['./topBar.component.scss'],
  templateUrl: './topBar.component.html',
})
export class TopBarComponent implements OnInit {
  alternateLogin: boolean = false;
  msg: string;
  appLatestVersion: number;
  showBanner: boolean;
  notLastestApps: any = [];
  constructor(private router: Router, private _CommonserviceService: CommonserviceService, private _afs: FirebaseService) {
  }

  ngOnInit() {
    this.alternateLogin = false;
    this.alternateLogin = JSON.parse(window.localStorage.getItem('alternateLogin'));
    this.msg = window.localStorage.getItem('loginMsg');
    this.getAppCompareVersion();
    this.getAuth();
  }

  getAuth() {
    this._afs.getUserUID().pipe(take(1)).subscribe(res => {
      console.log(res)
      this.getUserProfile(res.uid);
    });
  }

  getUserProfile(uid) {
    this._afs.getUserProfile(uid).subscribe(userData => {
      this.getCompanyDevices(userData.companyID);
    });
  }


  getAppCompareVersion() {
    this._afs.getAppVersion().subscribe((data: any) => {
      if (data)
        this.appLatestVersion = parseFloat(data.latestVersion.replaceAll('.', ''));
    });
  }

  getCompanyDevices(companyID) {
    var devicesData = [];
    this._afs.getCompanyDevices(companyID).subscribe((data) => {
      if (!data)
        return false;
      this.notLastestApps = [];
      devicesData = data;
      data.forEach((devices: any, i) => {
        if(devices ==undefined){
          return;
        }
        this._afs.getCompanyDeviceStatistics(devices.id).subscribe((player: any) => {
          if (!player) {
            delete devicesData[i];
            return false;
          }
          if (parseFloat(player.playerVersion.replaceAll('.', '')) < this.appLatestVersion) {
            devicesData[i]['playerVersion'] = player.playerVersion;
            this.showBanner = true;
            this.notLastestApps.push(devicesData[i]);
          } else {
            delete devicesData[i];
          }
        });
      });
    });
  }


  exitAccess() {
    let user = JSON.parse(window.localStorage.getItem('superAdmin'));
    window.localStorage.clear();
    window.localStorage.setItem('alternateLogin', JSON.stringify(false));
    window.localStorage.setItem('alternateLogin1', JSON.stringify(true));
    console.log("Sending",user.id)
    this.router.navigate(['']);
    setTimeout(() => {
      this._CommonserviceService.SendCompany(user.id);
    }, 100);
  }
}
