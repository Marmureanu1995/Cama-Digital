import { Component, OnInit, TemplateRef } from "@angular/core";
import { NetworkDeviceModel } from "../../model/networkDevice";
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { UserModel } from "../../model/user.model";
import { CompanyModel } from "../../model/companyModel";
import { map } from "rxjs/operators";
import { UserStatistics } from "../../model/userstatistics.model";
import { PlaylistModel } from "../../model/playlist.model";
import { NbDialogService, NbToastrService } from "@nebular/theme";
@Component({
  selector: "dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardPage implements OnInit {
  private Players: AngularFirestoreCollection<NetworkDeviceModel>;
  networkDevList: any = [];
  user = {} as UserModel;
  company = {} as CompanyModel;
  recentCompany: CompanyModel[] = [];
  allDev: NetworkDeviceModel[] = [];
  deviceQuantity: { all: number; online: number; offline: number } = {
    all: 0,
    online: 0,
    offline: 0,
  };
  allPlaylist: PlaylistModel[] = [];
  allChannels: PlaylistModel[] = [];
  zoom: number = 4;
  lat: number = 40.70300201463088;
  lng: number = -73.9999999999999;
  changedDevices: NetworkDeviceModel[] = [];
  selectedPlayers: string[] = [];
  clusterIcons: string = "/assets/cluster-images/";
  selectedPlaylist: string = "";
  changed: boolean = false;
  dialogRef: any;
  onlineDeviceIds: string[] = [];

  public options: any;

  constructor(private afs: AngularFirestore, private afAuth: AngularFireAuth,
    private dialogService: NbDialogService,
    private toastrService: NbToastrService,
  ) {
    this.afAuth.authState.subscribe((res) => {
      if (res && res.uid) {
        this.afs
          .collection("users")
          .doc<UserModel>(res.uid)
          .get()
          .subscribe((userDoc) => {
            this.user = userDoc.data() as UserModel;
            this.company.id = this.user.companyID;
            let allCompanies = this.afs.collection("restaurants");

            allCompanies.doc(this.user.companyID).get().toPromise().then((doc) => {
              this.company = doc.data() as CompanyModel;
            })



            this.Players = allCompanies
              .doc(this.company.id)
              .collection("networkDevices");

            this.afs.collection("restaurants").doc(this.company.id).collection("playlist").snapshotChanges().pipe(
              map((actions) =>
                actions.map((a) => {
                  const data = a.payload.doc.data() as PlaylistModel;
                  const id = a.payload.doc.id;
                  return { id, ...data };
                })
              )
            ).subscribe((querySnapshot) => {
              this.allPlaylist = querySnapshot;
              console.log(this.allPlaylist);
            });

            this.afs.collection("restaurants").doc(this.company.id).collection("channel").snapshotChanges().pipe(
              map((actions) =>
                actions.map((a) => {
                  const data = a.payload.doc.data() as PlaylistModel;
                  const id = a.payload.doc.id;
                  return { id, ...data };
                })
              )
            ).subscribe((querySnapshot) => {
              this.allChannels = querySnapshot;

              console.log(this.allChannels);
            })

            this.Players.snapshotChanges()
              .pipe(
                map((actions) =>
                  actions.map((a) => {
                    const data = a.payload.doc.data() as NetworkDeviceModel;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                  })
                )
              )
              .subscribe((querySnapshot) => {
                console.log(querySnapshot);
                this.networkDevList = querySnapshot;
                this.onlineDeviceIds = [];
                querySnapshot.forEach(async (doc) => {
                  await this.isOnline(doc.id);
                });
              });
          });
      }
    });
  }

  ngOnInit() { }

  /**
   * checks if the device is online
   * @param id
   * @returns boolean
   *
   */
  async isOnline(id: string) {
    const doc = await this.afs
      .collection("networkDevices")
      .doc(id)
      .collection("userstatistics")
      .doc(id).snapshotChanges().pipe(
        map((actions) => {
          const data = actions.payload.data() as UserStatistics;
          const id = actions.payload.id;
          return { id, ...data };
        })
      ).subscribe((querySnapshot) => {
        if (querySnapshot.isOnline) {
          this.onlineDeviceIds.push(id);
        } else {
          this.onlineDeviceIds = this.onlineDeviceIds.filter(item => item !== id);
        }
      })

  }

  /**
   * redirects to the players page
   * @returns void
   */
  connectNewDevice() {
    window.location.href = "/#/pages/players";
  }

  /**
   * truncates the text
   * @param text
   * @param length
   */
  truncateText(text: string, length: number): string {
    return text.length > length ? text.substring(0, length) + "..." : text;
  }

  /**
   * gets the recent devices
   * @returns NetworkDeviceModel[]
   */
  getRecentDevices() {
    if (this.networkDevList.length < 1) return [];
    if (this.networkDevList.length < 4) return this.networkDevList;
    if (Array.isArray(this.networkDevList)) {
      return this.networkDevList.slice(0, 4);
    }

    return [];
  }

  /**
   * 
   */

  getChannelName(item) {
    if (this.allChannels) {
      return this.allChannels.find(channel => channel.id === item.playlistId).name;
    }
  }

  /**
   * 
   */

  selectPlayers(id, isAll = false) {
    if (isAll) {
      if (this.selectedPlayers.length === this.networkDevList.length) {
        this.selectedPlayers = [];
      } else {
        this.selectedPlayers = this.networkDevList.map(item => item.id);
      }
    } else {
      if (this.selectedPlayers.includes(id)) {
        this.selectedPlayers = this.selectedPlayers.filter(item => item !== id);
      } else {
        this.selectedPlayers.push(id);
      }
    }
  }

  /**
   * 
   */
  changePlaylist(item: NetworkDeviceModel, $event) {
    this.changed = true;
    const index = this.changedDevices.findIndex(device => device.id === item.id);
    if (index === -1) {
      this.changedDevices.push({
        ...item
        , playlistId: $event.target.value
      });
    } else {
      this.changedDevices[index].playlistId = $event.target.value;
    }
    console.log(this.changedDevices);
  }

  /*
    * 
    */

  openBulkChangeModal(bulkEditChanne: TemplateRef<any>) {
    console.log(bulkEditChanne)
    this.dialogRef = this.dialogService.open(bulkEditChanne, { context: '' });
  }

  /**
   * 
   */

  saveBulkChanges() {
    if (this.selectedPlayers.length < 1) {
      this.toastrService.danger("Please select a player", "Error");
      return;
    };
    if (this.selectedPlaylist === "") {
      this.toastrService.danger("Please select a channel", "Error");
      return;
    };
    this.selectedPlayers.forEach(id => {
      this.afs.collection("restaurants").doc(this.company.id).collection("networkDevices").doc(id).update({
        playlistId: this.selectedPlaylist
      });
      this.afs.collection("networkDevices").doc(id).update({
        playlistId: this.selectedPlaylist
      });
    })

    this.dialogRef.close();
    this.toastrService.success("Changes saved successfully", "Success");
    this.selectedPlayers = [];
  }

  /**
   * 
   */

  publishChanges() {
    if (this.changedDevices.length < 1) {
      this.toastrService.danger("Please select a player", "Error");
      return;
    };
    this.changedDevices.forEach(device => {
      this.afs.collection("restaurants").doc(this.company.id).collection("networkDevices").doc(device.id).update({
        playlistId: device.playlistId,
        activeCheck: device.activeCheck
      });
      this.afs.collection("networkDevices").doc(device.id).update({
        playlistId: device.playlistId,
        activeCheck: device.activeCheck
      });
    })
    this.toastrService.success("Changes saved successfully", "Success");
    this.changedDevices = [];
    this.changed = false;

  }
  getStatus(item) {
    const satus = this.onlineDeviceIds.includes(item.id);
    if (satus) {
      return true
    }
    return false
  }

  getTotalTime(item: NetworkDeviceModel): string {
    const channel = this.allChannels.find(channel => channel.id === item.playlistId);
    if (!channel) {
      return '0:00:00'; // Return a default value if the channel is not found
    }

    const timeInSec = parseInt(channel.previewTime, 10);
    const hours = Math.floor(timeInSec / 3600);
    const minutes = Math.floor((timeInSec % 3600) / 60);
    const seconds = timeInSec % 60;

    // Format the time as HH:MM:SS
    const formattedTime = `${this.padZero(hours)}:${this.padZero(minutes)}:${this.padZero(seconds)}`;
    return formattedTime;
  }

  private padZero(num: number): string {
    return num < 10 ? `0${num}` : `${num}`;
  }

  changeActiveStatus(item: NetworkDeviceModel, $event: Event) {
    this.changed = true;
    const target = $event.target as HTMLInputElement;
    const index = this.changedDevices.findIndex(device => device.id === item.id);

    if (index === -1) {
      this.changedDevices.push({
        ...item,
        activeCheck: target.checked
      });
    } else {
      this.changedDevices[index].activeCheck = target.checked;
    }
  }
}

interface marker {
  lat: number;
  lng: number;
}
