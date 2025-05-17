import { FirebaseService } from './../../../services/firebase.service';
import { Component, TemplateRef, Input, OnInit, OnDestroy } from '@angular/core';
import { NbDialogService, NbToastRef } from '@nebular/theme';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import 'rxjs-compat/add/operator/map';
import { DragulaService } from 'ng2-dragula';
import { Subscription, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { AngularFireAuth } from '@angular/fire/auth';
import { ChannelModel } from '../../../model/channel.model';
import { PlaylistModel } from '../../../model/playlist.model';
import { CompanyModel } from '../../../model/companyModel';
import { NetworkDeviceModel } from '../../../model/networkDevice';
import { MediaModel } from '../../../model/media.model';
import { NbToastrService } from '@nebular/theme';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { UserModel } from '../../../model/user.model';
import { TranslateService } from '@ngx-translate/core';
declare var $: any;
// import * as $ from 'jquery';

@Component({
  selector: 'ngx-channelassociation',
  templateUrl: './channelassociation.component.html',
  styleUrls: ['./channelassociation.component.scss'],
})
export class ChannelassociationComponent implements OnInit, OnDestroy {
  subs = new Subscription();
  defaultChannel = {} as ChannelModel;
  private Players: AngularFirestoreCollection<NetworkDeviceModel>;
  channelsID: any;
  PlayersList: Array<NetworkDeviceModel> = new Array<NetworkDeviceModel>();
  PlayersListDragula: any;
  AllPlayersListDragula: Array<any> = [];
  channelsList: Array<any> = [];
  restaurant = {} as CompanyModel;
  ChannelID: any;
  private media: AngularFirestoreCollection<MediaModel>;
  private afsChannel: AngularFirestoreCollection<ChannelModel>;
  channels: any;
  items: any;
  emptyplaylistMedia: Array<PlaylistModel> = new Array<PlaylistModel>();
  @Input() events: Observable<void>;
  private eventsSubscription: any;
  pla = {} as NetworkDeviceModel;
  copiedplayerId: string = "";
  copiedplayerName: string = "";
  dialogRef: any;
  toastRef: NbToastRef;
  ConfirmationDialog: TemplateRef<any>;
  confirmmodal: boolean = false;
  OtherChannel: string;
  OtherChannelPlayer: string;
  DraggedFirstTime: boolean = false;
  user = {} as UserModel;

  constructor(public translate: TranslateService, private dialogService: NbDialogService, private afs: AngularFirestore,
    private dragulaService: DragulaService,
    private httpclient: HttpClient, private afAuth: AngularFireAuth, private toastrService: NbToastrService, private NgbModal: NgbModal) {
    this.dragulaService.createGroup('channel_association', {
      copy: (el, source) => {
        this.DraggedFirstTime = true;
        let copiedplayername = el.textContent;
        this.copiedplayerName = copiedplayername;
        if (this.toastRef != null && this.toastRef != undefined) {
          this.toastRef.close();
        }
        return source.id === 'bottom';
      },
      copyItem: (player: NetworkDeviceModel) => {
        let playerreturn = Object.assign({}, player);
        return playerreturn;
      },
      accepts: (el, target, source, sibling) => {
        let copiedplayername = el.textContent;
        this.copiedplayerName = copiedplayername;
        let anotherChannelPlayer: boolean = false;
        let existingPlayer: boolean = false;
        if (this.PlayersList != undefined && this.PlayersList.length > 0) {
          this.PlayersList.forEach(element => {
            let temp1 = this.AllPlayersListDragula.find(t => t.id == element.id);
            if (temp1 != null && temp1 != undefined && temp1.playerName == copiedplayername) {
              existingPlayer = true;
            }
          });
        }
        if (!existingPlayer) {
          if (this.channelsList != undefined && this.channelsList.length > 0) {
            let channelsList: Array<any> = this.channelsList.filter(c => c.id != this.ChannelID);
            if (channelsList != undefined && channelsList.length > 0) {
              channelsList.forEach(ele => {
                if (ele.playersList != undefined && ele.playersList.length > 0) {
                  ele.playersList.forEach(element => {
                    let temp = this.AllPlayersListDragula.find(t => t.id == element);
                    if (temp != null && temp != undefined && temp.playerName == copiedplayername) {
                      anotherChannelPlayer = true;
                      this.OtherChannel = ele.id;
                      this.OtherChannelPlayer = temp.id;
                    }
                  });
                }
              });
            }
          }
        }
        if (anotherChannelPlayer) {
          document.getElementById("myButton").click();

          return false;
        }
        else if (existingPlayer) {
          if (this.DraggedFirstTime) {

            this.toastrService.danger('Already exist in this channel', `Channel Association`);
            this.DraggedFirstTime = false;
          }
          this.confirmmodal = true;
          return false;
        }
        else {
          return target.id !== 'bottom';
        }
      },
    });

  }

  ngOnInit(): void {
    if (this.eventsSubscription != null && this.eventsSubscription != undefined) {
      this.eventsSubscription.unsubscribe();
    }
    this.eventsSubscription = this.events.subscribe((channelid) => {
      if (channelid != null && channelid != undefined) {
        this.ChannelID = channelid;
        this.GetChannelandPlayersByID();
      }
    });
  }

  GetChannelandPlayersByID() {
    this.PlayersList = [];
    this.AllPlayersListDragula = [];
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('users').doc<UserModel>(res.uid).get().subscribe(userDoc => {
          this.user = userDoc.data() as UserModel;
          this.restaurant.id = this.user.companyID;
          this.Players = this.afs.collection('restaurants').doc(this.restaurant.id).collection('networkDevices');
          this.PlayersListDragula = this.Players.snapshotChanges().pipe(
            map(actions => actions.map(a => {
              const data = a.payload.doc.data() as NetworkDeviceModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })),
          ).subscribe((querySnapshot) => {
            this.AllPlayersListDragula = querySnapshot;
            this.getAllChannel();
          });;
        });
      }
    });
    this.subs.add(
      this.dragulaService.dropModel('channel_association').subscribe(args => {
        let anotherChannelPlayer: boolean = false;
        let existingPlayer: boolean = false;
        if (this.PlayersList != undefined && this.PlayersList.length > 0) {
          this.PlayersList.forEach(element => {
            let temp1 = this.AllPlayersListDragula.find(t => t.id == element.id);
            if (temp1 != null && temp1 != undefined && temp1.playerName == this.copiedplayerName) {
              existingPlayer = true;
            }
          });
        }
        if (!existingPlayer) {
          if (this.channelsList != undefined && this.channelsList.length > 0) {
            let channelsList: Array<any> = this.channelsList.filter(c => c.id != this.ChannelID);
            if (channelsList != undefined && channelsList.length > 0) {
              channelsList.forEach(ele => {
                if (ele.playersList != undefined && ele.playersList.length > 0) {
                  ele.playersList.forEach(element => {
                    let temp = this.AllPlayersListDragula.find(t => t.id == element);
                    if (temp != null && temp != undefined && temp.playerName == this.copiedplayerName) {
                      anotherChannelPlayer = true;
                    }
                  });
                }
              });
            }
          }
        }
        if (anotherChannelPlayer) {
        }
        else if (existingPlayer) {
        }
        else {
          this.PlayersList = [];
          for (let i = 0; i < args.targetModel.length; i++) {
            this.PlayersList[i] = args.targetModel[i];
          }
          this.defaultChannel.playersList = [];
          if (this.PlayersList != undefined && this.PlayersList.length > 0) {
            this.PlayersList.forEach(t => {
              this.defaultChannel.playersList.push(t.id);
            });
          }
          this.afs.firestore.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(this.defaultChannel.id).update(this.defaultChannel);
          this.toastrService.success('Player added to channel', `Channel Association`);
          this.subs.unsubscribe();
        }
      }),
    );
  }


  getAllChannel() {
    this.afs.collection('restaurants').doc<CompanyModel>(this.restaurant.id).get().subscribe(companyDoc => {
      this.restaurant = companyDoc.data() as CompanyModel;
      this.restaurant.id = this.user.companyID;


      this.media = this.afs.collection('restaurants').doc(this.restaurant.id).collection('media');

      this.afsChannel = this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel');

      this.channels = this.afsChannel.snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as ChannelModel;
          const id = a.payload.doc.id;
          return { id, ...data };
        })),
      ).subscribe((querySnapshot) => {
        this.channelsList = querySnapshot;
        this.defaultChannel = this.channelsList.find(t => t.id == this.ChannelID);
        this.PlayersList = [];
        if (this.defaultChannel != null && this.defaultChannel != undefined && this.defaultChannel.playersList != undefined && this.defaultChannel.playersList.length > 0) {
          for (let element of this.defaultChannel.playersList) {
            let temp = this.AllPlayersListDragula.find(t => t.id == element);
            if (temp != null && temp != undefined) { this.PlayersList.push(temp); }
          }
        }
      });
    });
  }

  ngOnDestroy() {
    this.eventsSubscription.unsubscribe();
    this.subs.unsubscribe();
    this.dragulaService.destroy('channel_association');
  }

  ConfirmationModal(CopyPlayerConfirmationDialog: TemplateRef<any>) {
    let OtherChannel: any = this.OtherChannel;
    let playerId: any = this.OtherChannelPlayer;
    if (this.dialogRef != null && this.dialogRef != undefined) {
      this.dialogRef.close();
    }
    this.dialogRef = this.dialogService.open(
      CopyPlayerConfirmationDialog,
      { context: { playerId, OtherChannel } });
  }

  savePlayertoDB() {
    let OtherChannel: any = this.OtherChannel;
    let playerId: any = this.OtherChannelPlayer;
    let channelUpdate: ChannelModel = this.channelsList.find(t => t.id == OtherChannel);
    channelUpdate.playersList = channelUpdate.playersList.filter(t => t != playerId);
    let channelToUpdate = Object.assign({}, channelUpdate);
    this.afs.firestore.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(channelToUpdate.id).update(channelToUpdate);

    let player: NetworkDeviceModel = Object.assign({}, this.AllPlayersListDragula.find(t => t.id == playerId));

    this.defaultChannel.playersList.push(player.id);
    this.afs.firestore.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(this.defaultChannel.id).update(this.defaultChannel);
    if (this.dialogRef != null && this.dialogRef != undefined) {
      this.dialogRef.close();
    }
  }

}
