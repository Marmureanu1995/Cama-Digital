import { Component, TemplateRef } from '@angular/core';
import { AngularFirestoreCollection, AngularFirestore } from '@angular/fire/firestore';
import { NetworkDeviceModel } from '../../model/networkDevice';
import { AngularFireAuth } from '@angular/fire/auth';
import { CompanyModel } from '../../model/companyModel';
import { map } from 'rxjs/operators';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { Subject } from 'rxjs';
import { ChannelModel } from '../../model/channel.model';
import { PlaylistModel } from '../../model/playlist.model';
import { MediaModel } from '../../model/media.model';
import { UserModel } from '../../model/user.model';
import { FirebaseService } from '../../services/firebase.service';
import { TranslateService } from '@ngx-translate/core';
import {
  AngularFireStorage
} from "@angular/fire/storage";


@Component({
  selector: 'ngx-network',
  templateUrl: './network.component.html',
  styleUrls: ['./network.component.scss'],
})


export class NetworkComponent {
  private Players: AngularFirestoreCollection<NetworkDeviceModel>;
  media: MediaModel[];
  private afsChannel: AngularFirestoreCollection<ChannelModel>;
  channelsID: any;
  PlayersList: any;
  Players_length: any;
  pl_length: number;
  restaurant = {} as CompanyModel;
  companyplayers: any;
  playerLimit: any;
  dialogRef: any;
  playerId: any;
  public eventPlayer: Subject<void> = new Subject<void>();
  selectedValue: string;
  showplayer: boolean = false;
  showchannelassociation: boolean = false;
  ChannelID: any;
  channels: any;
  items: any;
  playLists: Array<PlaylistModel> = [];
  emptyplaylistMedia: Array<PlaylistModel> = new Array<PlaylistModel>();
  FirstChannel = {} as ChannelModel;
  channelsList: Array<any> = [];
  event: any;
  user = {} as UserModel;
  isActive: any;
  destroy$: Subject<boolean> = new Subject<boolean>();
  public eventsSubject: Subject<void> = new Subject<void>();
  constructor(public translate: TranslateService, private firebaseservice: FirebaseService, private afs: AngularFirestore,
    private storage: AngularFireStorage,

    private afAuth: AngularFireAuth, private dialogService: NbDialogService, private toastrService: NbToastrService) {

    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('users').doc<UserModel>(res.uid).get().subscribe(userDoc => {
          this.user = userDoc.data() as UserModel;
          this.restaurant.id = this.user.companyID;
          this.afs.collection('restaurants').doc<CompanyModel>(this.restaurant.id).get().subscribe(companyDoc => {
            this.companyplayers = companyDoc.data() as CompanyModel;
            this.playerLimit = this.companyplayers.playerLimit;
            this.firebaseservice.PlayerLimit = this.playerLimit;
          });
          this.Players = this.afs.collection('restaurants').doc(this.restaurant.id).collection('networkDevices');
          this.PlayersList = this.Players.snapshotChanges().pipe(
            map(actions => actions.map(a => {
              const data = a.payload.doc.data() as NetworkDeviceModel;
              const id = a.payload.doc.id;

              return { id, ...data };
            })),
          );

          /// Get Length of Players

          this.Players_length = this.Players.snapshotChanges().pipe(
            map(actions => actions.map(a => {
              const data = a.payload.doc.data() as NetworkDeviceModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })),
          ).subscribe((querySnapshot) => {
            this.pl_length = querySnapshot.length
            this.firebaseservice.playerLength = this.pl_length;
          });

          /////////
          this.afsChannel = this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel');
          this.channels = this.afsChannel.snapshotChanges().pipe(
            map(actions => actions.map(a => {
              const data = a.payload.doc.data() as ChannelModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })),
          ).subscribe((querySnapshot) => {
            this.channelsList = querySnapshot;
          });;
          this.getMediaByOrder(this.restaurant.id, "creationDate")
            .takeUntil(this.destroy$)
            .subscribe((docs) => {
              this.media = docs;
            });
        });
      }
    });
  }

  ngOnInit(): void {


    if (document.documentElement.clientWidth > 280 && document.documentElement.clientWidth < 980) {
      document.getElementById('open_btn').style.display = 'block';
      document.getElementById('close_btn').style.display = 'none';
    } else {
      document.getElementById('open_btn').style.display = 'none';
      document.getElementById('close_btn').style.display = 'block';
    }
  }
  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  getMediaByOrder(companyId, orderby) {
    return this.afs
      .collection("restaurants")
      .doc(companyId)
      .collection("media", (ref) => ref.orderBy(orderby, "desc"))
      .snapshotChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as MediaModel;
            const id = a.payload.doc.id;
            localStorage.removeItem("media");
            localStorage.setItem("media", JSON.stringify(this.items));
            return { id, ...data };
          })
        )
      );
  }
  AddNewPlayer() {
    this.eventPlayer.next(undefined);
    if (this.playerLimit == this.pl_length) {
      this.toastrService.danger('The restaurant players has reached its max limit', 'Create Player');
    }
    else if (this.playerLimit > this.pl_length) {
      this.eventPlayer.next(undefined);
    }
    else {
      this.toastrService.danger('The restaurant players has reached its max limit', 'Create Player');
    }

  }

  deletePlayerpopup(DeleteChannelDialog: TemplateRef<any>, item: NetworkDeviceModel) {
    this.dialogRef = this.dialogService.open(
      DeleteChannelDialog,
      { context: item });
  }

  deletePlayer(player: NetworkDeviceModel) {
    this.afs.collection('restaurants').doc(this.restaurant.id).collection('networkDevices').doc(player.id).delete();
    this.afs.collection('networkDevices').doc(player.id).delete();
    this.AddNewPlayer();
    this.dialogRef.close();
    this.toastrService.success('Player deleted successfully', 'Delete Player');
  }
  openNav() {
    document.getElementById('check').style.cssText = 'max-width: calc(100% - 220px); min-width: calc(100% - 220px); margin-left: 220px !important;';
    document.getElementById('Navbar').style.width = '220px';
    document.getElementById('check').style.margin = '0px 0px 0px 220px';
    document.getElementById('check').style.width = '100%';
    document.getElementById('open_btn').style.display = 'none';
    document.getElementById('close_btn').style.display = 'block';

  }
  closeNav() {
    document.getElementById('Navbar').style.width = '0';
    document.getElementById('check').style.margin = '0px 0px 0px 0px';
    document.getElementById('check').style.width = '100%';
    document.getElementById('open_btn').style.display = 'block';
    document.getElementById('close_btn').style.display = 'none';
  }
  closeNav_Nh() {
    // console.error('workign');
    document.getElementById('Navbar').style.width = '0';
    document.getElementById('network').style.margin = '0px 0px 0px 0px';
    document.getElementById('network').style.width = '100%';
    document.getElementById('open_btn').style.display = 'none';
    document.getElementById('close_btn').style.display = 'none';
  }

  selectPlayer(player: NetworkDeviceModel) {
    if (document.documentElement.clientWidth > 280 && document.documentElement.clientWidth < 1024) {
      this.closeNav();
    }
    this.isActive = player.id;
    this.playerId = player.id;
    this.eventPlayer.next(this.playerId);
  }

  onSelection(event) {
    this.Players = this.afs.collection('restaurants').doc(this.restaurant.id).collection('networkDevices');

    if (this.selectedValue === '1') {
      this.PlayersList = this.afs.collection('restaurants').doc(this.restaurant.id).collection('networkDevices', ref =>
        ref
          .orderBy('playerName', 'asc'),
      ).snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as NetworkDeviceModel;
          const id = a.payload.doc.id;
          return { id, ...data };
        })),
      );
    }
    if (this.selectedValue === '2') {
      this.channels = this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel', ref =>
        ref
          .orderBy('name', 'asc'),
      ).snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as ChannelModel;
          const id = a.payload.doc.id;
          return { id, ...data };
        })),
      ).subscribe((querySnapshot) => {
        this.channelsList = querySnapshot;
        // console.error('Data',  this.playlistMedia);
        // this.emptyplaylistMedia[0] = this.playlistMedia[0];
      });;;
    }
    if (this.selectedValue === '3') {
      this.channels = this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel', ref =>
        ref
          .orderBy('creationDate', 'asc'),
      ).snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as ChannelModel;
          const id = a.payload.doc.id;
          return { id, ...data };
        })),
      ).subscribe((querySnapshot) => {
        this.channelsList = querySnapshot;
        // console.error('Data',  this.playlistMedia);
        // this.emptyplaylistMedia[0] = this.playlistMedia[0];
      });;;
    }
  }

  refreshTab() {
    this.isActive = '';
    this.AddNewPlayer();
  }

  refreshTabChannels() {
    if (this.channelsList[0] != null && this.channelsList[0] != undefined) {
      this.selectChannel(this.channelsList[0]);
    }
  }

  selectTab(event) {
    if (event != null && event != undefined) {
      if (event == "Players" || event.tabTitle == 'Players') {
        this.showplayer = true;
      }
      else {
        this.showplayer = false;
      }
      if (event.tabTitle == 'Channel Association') {
        this.showchannelassociation = true;
        if (this.channelsList[0] != null && this.channelsList[0] != undefined) {
          this.selectChannel(this.channelsList[0]);
        }
      }
      else {
        this.showchannelassociation = false;
      }
      // if(event.tabTitle != 'Channel Association' && event.tabTitle != 'Players')
      // {
      //   this.closeNav();
      // }
      // else{
      //   this.openNav();
      // }
    }
  }
  selectChannel(channel: ChannelModel) {
    if (document.documentElement.clientWidth > 280 && document.documentElement.clientWidth < 1024) {
      this.closeNav();
    }
    this.isActive = channel.id;
    this.ChannelID = channel.id;
    this.eventsSubject.next(this.ChannelID);
  }

  downloadApk() {
    this.storage.ref('LatestApk/app.apk').getDownloadURL().subscribe((link) => {
      const downloadLink = document.createElement('a');
      downloadLink.href = link;

      downloadLink.setAttribute('download', 'app.apk');

      downloadLink.click();

    })
  }


}
