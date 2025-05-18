import { Component, Input } from '@angular/core';
import { Observable } from "rxjs";
import { AngularFirestore } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { NbToastrService } from "@nebular/theme";
import { NetworkDeviceModel } from "../../../model/networkDevice";
import { UserModel } from "../../../model/user.model";
import { map } from "rxjs/operators";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'ngx-networkhealth',
  templateUrl: './networkhealth.component.html',
  styleUrls: ['./networkhealth.component.scss'],
})
export class NetworkhealthComponent {

  user = {} as UserModel;
  playerId: any;
  private eventsubscription: any;
  @Input() events: Observable<void>;
  nh: any;

  constructor(public translate: TranslateService, private afs: AngularFirestore, private afAuth: AngularFireAuth, private toastrService: NbToastrService) {
    this.nh = '';
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        // this.afs.collection('restaurants').doc<CompanyModel>(res.uid).get().subscribe(companyDoc => {
        //   this.restaurant = companyDoc.data() as CompanyModel;
        //   console.error(this.restaurant);
        this.afs.collection('users').doc<UserModel>(res.uid).get().subscribe(userDoc => {
          this.user = userDoc.data() as UserModel;


        });
      }
    });

  }



  ngOnInit(): void {

    this.eventsubscription = this.events.subscribe(playerId => {
      if (playerId != undefined && playerId != null) {
        this.playerId = playerId;

        this.afs.collection('networkDevices').doc(this.playerId).collection('userstatistics').doc(this.playerId).get().subscribe(doc => {
          if (doc.exists) {
            this.nh = doc.data();
            this.nh.lastContacted = this.nh.lastContacted.replace('GMT+05:00', '');
          } else {
            this.nh = '';
          }

        });
      }
      else {
        //this.clearplayermodel();
      }

    });
  }
}
