import { Component, OnDestroy, OnInit, TemplateRef, Input } from '@angular/core';
import { NbDialogService } from '@nebular/theme';
import { ResizeEvent } from 'angular-resizable-element';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { PlaylistModel } from '../../model/playlist.model';
import { MediaModel } from '../../model/media.model';
import { map } from 'rxjs/operators';
import 'rxjs-compat/add/operator/map';
import { DragulaService } from 'ng2-dragula';
import { Subscription, Observable } from 'rxjs';
import { ChannelScheduleModel } from '../../model/channelSchedule.model';
import { HttpClient } from '@angular/common/http';
import { ChannelModel, ChannelPlaylistModel } from '../../model/channel.model';
import 'rxjs-compat/add/operator/map';
import { CompanyModel } from '../../model/companyModel';
import { AngularFireAuth } from '@angular/fire/auth';
import { NbToastrService } from '@nebular/theme';
import { CommonserviceService } from '../../commonservice/commonservice.service';
import { UserModel } from '../../model/user.model';
import { uniq } from 'lodash'
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'ngx-companychannels',
  templateUrl: './companychannels.component.html',
  styleUrls: ['./companychannels.component.scss'],
})
export class CompanychannelsComponent implements OnInit, OnDestroy {
  public style: object = {};
  private afsChannel: AngularFirestoreCollection<ChannelModel>;
  private afsChannelForSchdule: AngularFirestoreCollection<ChannelModel>;
  channels: any;
  defaultChannel = {} as ChannelModel;
  tempChannel = {} as ChannelModel;
  /* tslint:disable:no-unused-variable */
  private media: AngularFirestoreCollection<MediaModel>;
  index: any;
  indexes: any;
  items: any;
  selectedValue: string;
  channel = {} as ChannelModel;
  dialogRef: any;
  ConfirmchanneldialogRef: any;
  playLists: Array<ChannelPlaylistModel> = [];
  tempplayLists: Array<ChannelPlaylistModel> = [];
  emptyplaylistMedia: Array<ChannelPlaylistModel> = new Array<ChannelPlaylistModel>();
  subs = new Subscription();
  sch = {} as ChannelScheduleModel;
  channelPlaylists: Array<PlaylistModel> = new Array<PlaylistModel>();
  tempchannelPlaylists: Array<PlaylistModel> = new Array<PlaylistModel>();
  previewPlaylist = {} as PlaylistModel;
  previewMedia = {} as MediaModel;
  previewAllPlaylist = {} as PlaylistModel;
  i: any;
  time: any;
  previewLength: any;
  vidCheck: boolean;
  change: boolean = false;
  restaurant = {} as CompanyModel;
  user = {} as UserModel;
  ChannelName: string = '';
  timer: any;
  channelLoading: boolean = false;
  TotalHrs: number = 0;
  TotalMin: number = 0;
  TotalSec: number = 0;
  TotalMilSec: number = 0;
  TotalTimeString: string = '00:00:00';
  searchValue: string = '';
  defaultPlaylistChannel = {} as ChannelPlaylistModel;
  tempsearchlist: any;
  channelforSch: ChannelModel;
  changemenusubscription: Subscription;
  ClickedOtherMenuItem: boolean;
  Changechannellist: boolean = false;
  channelsList: Array<any> = [];
  CurrentCompany = {} as CompanyModel;
  private eventsubscription: any;
  @Input() events: Observable<any>;
  companyidfromcompanySub: Subscription;
  PlaylistsListtoCopy: Array<any> = [];
  private afsPlaylist: AngularFirestoreCollection<PlaylistModel>;
  playlists: any;
  playlistsList: Array<any> = [];
  isActive: any
  alternateHtml: any = '/assets/images/html_image.jpg';
  constructor(private dialogService: NbDialogService, private afs: AngularFirestore,
    private dragulaService: DragulaService,
    private httpclient: HttpClient, private afAuth: AngularFireAuth, private toastrService: NbToastrService,
    private _CommonserviceService: CommonserviceService, public translate: TranslateService) {


    this.defaultChannel = new ChannelModel();
    this.defaultPlaylistChannel = new ChannelPlaylistModel();
    this.sch = new ChannelScheduleModel();
    this.i = 0;
    this.vidCheck = true;
  }

  ngOnInit() {
    this.companyidfromcompanySub = this._CommonserviceService.getCompany().subscribe(clicked => {
      this.CurrentCompany.id = clicked;
      this.getCompany();
    });

    this.dragulaService.createGroup('vampire_channel', {
      copy: (el, source) => {
        return source.id === 'bottom';
      },
      copyItem: (media: PlaylistModel) => {
        if (media != null && media !== undefined) {
          this.AddSecondsToTime(media.previewTime);
        }
        return media;

      },
      accepts: (el, target, source, sibling) => {
        // To avoid dragging from right to left container
        if (this.defaultChannel.id != null && this.defaultChannel.id !== undefined) {
          return target.id !== 'bottom';
        } else {
          return false;
        }
      },
    });

    this.subs.add(
      this.dragulaService.dropModel('vampire_channel').subscribe(args => {
        this.PlaylistsListtoCopy = [];
        this.change = true;
        for (let i = 0; i < args.targetModel.length; i++) {
          this.defaultChannel.playlist[i] = {} as ChannelPlaylistModel;
          this.defaultChannel.playlist[i].playlist_id = args.targetModel[i].id;
          this.PlaylistsListtoCopy.push(args.targetModel[i]);
          this.afAuth.authState.subscribe(res => {
            if (res && res.uid) {
              this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(this.defaultChannel.id).get().subscribe(channel => {
                const temp = channel.data() as ChannelModel;
                this.defaultChannel.playlist[i] = temp.playlist.find(a => a.playlist_id === args.targetModel[i].id);
                if (this.defaultChannel.playlist[i] == null) {
                  this.defaultChannel.playlist[i] = {} as ChannelPlaylistModel;
                  this.defaultChannel.playlist[i].playlist_id = args.targetModel[i].id;


                }
                for (let j = 0; j < this.defaultChannel.playlist.length; j++) {
                  this.defaultChannel.playlist[j].index = j.toString();
                }
              });

              // this.afs.firestore.collection('restaurants').doc(this.restaurant.id)
              // .collection('playlist').doc(args.targetModel[i].id).set(Object.assign({}, args.targetModel[i]));
            }
          });
        }
      }),
    );
  }

  getCompany() {
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('users').doc<UserModel>(res.uid).get().subscribe(userDoc => {
          this.user = userDoc.data() as UserModel;
          this.restaurant = this.CurrentCompany;
          // this.restaurant.id = this.user.companyID;


          this.media = this.afs.collection('restaurants').doc(this.restaurant.id).collection('media');


          // Fetch Channels
          this.afsChannel = this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel');
          this.channels = this.afsChannel.snapshotChanges().pipe(
            map(actions => actions.map(a => {
              const data = a.payload.doc.data() as ChannelModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })),
          ).subscribe((querySnapshot) => {
            this.channelsList = querySnapshot;
            if (this.channelsList[0] != null && this.channelsList[0] !== undefined) {
              this.defaultChannel = this.channelsList[0];
              this.isActive = this.defaultChannel.id;
              this.getAllPlaylists(this.defaultChannel.id);
            }
          });
          // Get first item from playlist to display by default
          // this.channels.map(x => x[0])
          //   .subscribe((channel: ChannelModel) => {
          //     if(channel != null && channel != undefined){
          //       this.defaultChannel = channel;
          //     this.getAllPlaylists(channel.id);
          //     }
          //   });


          // Fetch Playlists
          this.items = this.afs.collection('restaurants').doc(this.user.id).collection('playlist').snapshotChanges().pipe(
            map(actions => actions.map(a => {
              const data = a.payload.doc.data() as ChannelPlaylistModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })),
          ).subscribe((querySnapshot) => {
            this.playLists = querySnapshot;
            this.tempplayLists = querySnapshot;
            this.emptyplaylistMedia[0] = this.playLists[0];
          });

        });
      }
    });

  }

  GetChannelPlaylistByID(PlaylistID: string): ChannelPlaylistModel {
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(this.defaultChannel.id).get().subscribe(channel => {
          const temp = channel.data() as ChannelModel;
          return temp.playlist.find(a => a.playlist_id === PlaylistID);
        });

      }
    });

    return null;
  }

  onSelection(event) {
    this.afsChannel = this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel');

    if (this.selectedValue === '1') {
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
      });
    }
    if (this.selectedValue === '2') {
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
      });
    }
  }

  onSelectTimeCheck(event) {
    this.sch.allDay = !this.sch.allDay;
  }

  onSelectDaysCheck(event) {
    this.sch.timeCheck = !this.sch.timeCheck;
    if (this.sch.allDay) {
      this.sch.timeFrom = null;
      this.sch.timeTo = null;
    }
  }

  ngOnDestroy() {
    if (this.change) {
      document.getElementById('showsavechannelconfirm').click();
    } else {
      this.subs.unsubscribe();
      this.dragulaService.destroy('vampire_channel');
      // this.changemenusubscription.unsubscribe();
      if (this.ConfirmchanneldialogRef !== null && this.ConfirmchanneldialogRef !== undefined) {
        this.ConfirmchanneldialogRef.close();
      }
    }
  }


  addPlaylist(AddPlaylistDialog: TemplateRef<any>) {
    this.ChannelName = '';
    this.dialogRef = this.dialogService.open(
      AddPlaylistDialog,
      { context: 'New Channel is added.' });
  }

  setting(SettingDialog: TemplateRef<any>, item: any, i: any) {
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('restaurants').doc<CompanyModel>(res.uid).get().subscribe(companyDoc => {
          this.restaurant = companyDoc.data() as CompanyModel;
          this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(this.defaultChannel.id).get().subscribe(channel => {
            this.channelforSch = channel.data() as ChannelModel;
            const temp = this.channelforSch.playlist[i];
            if (temp !== undefined && temp != null) {
              this.defaultPlaylistChannel = temp;
            } else {
              this.defaultPlaylistChannel = new ChannelPlaylistModel();
            }
          });
        });
      }
    });


    this.dialogRef = this.dialogService.open(
      SettingDialog,
      { context: item });
  }

  updateSetting() {
    const t = this.defaultChannel.playlist.findIndex(tt => tt.playlist_id === this.defaultPlaylistChannel.playlist_id);
    if (t !== -1) {

      this.defaultChannel.playlist[this.defaultPlaylistChannel.index] = Object.assign({}, this.defaultPlaylistChannel);
      this.afs.firestore.collection('restaurants').doc(this.restaurant.id).collection('channel')
        .doc(this.defaultChannel.id).update(Object.assign({}, this.defaultChannel));
      this.toastrService.success('Settings updated successfully', 'Update settings');

    }
  }

  editChannel(EditChannelDialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(
      EditChannelDialog,
      { context: item });
  }

  deleteChannel(DeleteChannelDialog: TemplateRef<any>, item: ChannelModel) {
    this.dialogRef = this.dialogService.open(
      DeleteChannelDialog,
      { context: item });
  }

  deleteC(item: ChannelModel) {
    this.afsChannel.doc(item.id).delete().then(() => {
      this.dialogRef.close(); // close dialog
      this.toastrService.success('Channel deleted successfully', 'Delete Channel');

    });
  }

  deleteCP(item: number) {
    // this.afs.firestore.collection('restaurants').doc(this.restaurant.id).collection('channel')
    // .doc(this.defaultChannel.id).collection('playlist').doc(item.id).delete().then(() =>{
    //   this.dialogRef.close();
    // }
    // );
    this.TotalHrs = 0;
    this.TotalMin = 0;
    this.TotalSec = 0;
    this.TotalMilSec = 0;
    this.TotalTimeString = '00:00:00';
    this.tempChannel = JSON.parse(JSON.stringify(this.defaultChannel));
    // this.channelPlaylists = this.channelPlaylists.splice(item, 1);
    this.channelPlaylists = this.channelPlaylists.filter(t => t !== this.channelPlaylists[item]);
    this.defaultChannel.playlist = [];
    this.channelPlaylists.forEach(single => {
      this.AddSecondsToTime(single.previewTime);
      const playlist = new ChannelPlaylistModel();
      playlist.playlist_id = single.id;
      this.tempChannel.playlist.forEach(x => {
        if (x.schedule_id && single.id == x.playlist_id) {
          playlist.schedule_id = x.schedule_id;
        }
      });
      this.defaultChannel.playlist.push(Object.assign({}, playlist));
    });
    this.change = true;
    this.dialogRef.close();
  }

  eyeAll(PreviewDialog: TemplateRef<any>) {
    this.eye(PreviewDialog, this.previewAllPlaylist);
  }

  eye(PreviewDialog: TemplateRef<any>, item: PlaylistModel) {
    clearTimeout(this.timer);
    this.i = 0;
    this.previewPlaylist = item;
    this.previewLength = (item.media).length;
    this.previewMedia = item.media[this.i];
    if (this.previewMedia.type === 'image/jpeg' || this.previewMedia.type === 'image/png') {
      this.timer = setTimeout((function () {
        this.changeMedia();
      }).bind(this), parseInt(this.previewMedia.length, 10) * 1000);
    }
    this.dialogRef = this.dialogService.open(
      PreviewDialog,
      { context: null });
  }

  changeMedia(event: any) {
    this.vidCheck = !this.vidCheck;
    if ((this.i + 1) > this.previewLength) {
      this.i = 0;
      this.dialogRef.close();
      this.previewMedia = null;
    }
    this.i++;
    this.previewMedia = this.previewPlaylist.media[this.i];
    this.previewLength = (this.previewPlaylist.media).length;
    this.timer = setTimeout((function () {
      this.changeMedia();
    }).bind(this), parseInt(this.previewPlaylist.media[this.i].length, 10) * 1000);
  }

  deleteChannelPlaylist(DeleteChannelPlaylistDialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(
      DeleteChannelPlaylistDialog,
      { context: item });
  }

  schedule(ScheduleDialog: TemplateRef<any>, item: any, i: any) {
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('restaurants').doc<CompanyModel>(res.uid).get().subscribe(companyDoc => {
          this.restaurant = companyDoc.data() as CompanyModel;
          this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(this.defaultChannel.id).get().subscribe(channel => {
            this.channelforSch = channel.data() as ChannelModel;
            const temp = this.channelforSch.playlist.find(t => t.playlist_id === item.id && t.index === i);
            const docRef = this.afs.firestore.collection('restaurants').doc(this.restaurant.id)
              .collection('channel').doc(this.defaultChannel.id)
              .collection('schedule').doc(temp.schedule_id);
            let playSch: any = null;
            const result = docRef.get().then(function (doc) {
              if (doc.exists) {
                playSch = doc.data();
              } else {
              }
            }).catch(function (error) {
            });

            result.then(() => {
              if (playSch != null) {
                this.sch = playSch;
                this.sch.index = i;
              } else {
                this.sch = new ChannelScheduleModel();
              }
            });

          });
        });
      }
    });

    this.sch = new ChannelScheduleModel();
    // this.index = i + '_' + item.id;
    this.sch.index = i;


    // this.sch.index = i;
    this.dialogRef = this.dialogService.open(
      ScheduleDialog,
      { context: item });


  }

  openNav() {
    document.getElementById('mySidenav').style.width = '220px';
    document.getElementById('check').style.margin = '0px 0px 0px 220px';
    document.getElementById('check').style.maxWidth = '81%';
    document.getElementById('check').style.minWidth = '81%';
    document.getElementById('open_btn').style.display = 'none';
    document.getElementById('close_btn').style.display = 'block';
    document.getElementById('align_menu').style.marginRight = '-45px';
  }

  closeNav() {
    document.getElementById('mySidenav').style.width = '0';
    document.getElementById('check').style.minWidth = '100%';
    document.getElementById('check').style.maxWidth = '100%';
    document.getElementById('check').style.margin = '0px 0px 0px 0px';
    document.getElementById('open_btn').style.display = 'block';
    document.getElementById('close_btn').style.display = 'none';
  }

  validate(event: ResizeEvent): boolean {
    const MIN_DIMENSIONS_PX: number = 100;
    if (
      event.rectangle.width &&
      event.rectangle.height &&
      (event.rectangle.width < MIN_DIMENSIONS_PX ||
        event.rectangle.height < MIN_DIMENSIONS_PX)
    ) {
      return false;
    }
    return true;
  }

  createChannel() {

    this.channel.id = this.afs.createId();
    this.channel.creationDate = moment().toDate();
    this.channel.previewTime = '0';
    this.channel.playlist = [];
    this.channel.name = this.ChannelName;
    // this.channel.playlist[0] = this.playLists[0].id;
    this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(this.channel.id).set(this.channel).then(() => {
      this.dialogRef.close(); // close dialog
      this.toastrService.success('Channel created successfully', 'Create Channel');

      // this.selectChannel(this.channel);
    });
    // this.emptyplaylistMedia  = [];
    // this.emptyplaylistMedia[0] = this.playLists[0];
  }

  updateChannel() {
    this.change = false;
    this.defaultChannel.previewTime = this.TotalSec.toString();
    const temp = this.defaultChannel;
    for (let j = 0; j < this.defaultChannel.playlist.length; j++) {
      this.defaultChannel.playlist[j].index = j.toString();
    }
    this.afs.firestore.collection('restaurants').doc(this.restaurant.id).collection('channel')
      .doc(this.defaultChannel.id).set(Object.assign({}, this.defaultChannel));
    this.toastrService.success('Channel updated successfully', 'Update Channel');


    this.afsPlaylist = this.afs.collection('restaurants').doc(this.restaurant.id).collection('playlist');
    this.playlists = this.afsPlaylist.snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as PlaylistModel;
        const id = a.payload.doc.id;
        return { id, ...data };
      })),
    ).subscribe((querySnapshot) => {
      this.playlistsList = querySnapshot;
      this.PlaylistsListtoCopy.forEach(item => {
        if (!this.playlistsList.find(t => t.id === item.id)) {
          this.afs.firestore.collection('restaurants').doc(this.restaurant.id).collection('playlist').doc(item.id).set(Object.assign({}, item));
        }
      });
    });


    this.selectChannel(temp);

    // this._CommonserviceService.SetChildResponse(true);
    if (this.ClickedOtherMenuItem) {
      this.subs.unsubscribe();
      this.dragulaService.destroy('vampire_channel');
      this.changemenusubscription.unsubscribe();
      if (this.ConfirmchanneldialogRef !== null && this.ConfirmchanneldialogRef !== undefined) {
        this.ConfirmchanneldialogRef.close();
      }
    }
    if (this.Changechannellist) {
      if (this.ConfirmchanneldialogRef !== null && this.ConfirmchanneldialogRef !== undefined) {
        this.ConfirmchanneldialogRef.close();
      }
      this.Changechannellist = false;
      this.selectChannel(this.tempChannel);
    }
    // this.getAllPlaylists(this.defaultChannel.id);
    // document.getElementById('publish').classList.remove('new-changes');
    // this.selectChannel(this.defaultChannel);
  }

  BeforeSelectchannelCall(channel: ChannelModel) {
    if (this.change) {
      this.Changechannellist = true;
      this.tempChannel = channel;
      document.getElementById('showsavechannelconfirm').click();
    } else {
      this.isActive = channel.id;
      this.selectChannel(channel);
    }
  }

  selectChannel(channel: ChannelModel) {
    this.TotalHrs = 0;
    this.TotalMin = 0;
    this.TotalSec = 0;
    this.TotalMilSec = 0;
    this.TotalTimeString = '00:00:00';
    this.i = 0;
    this.defaultChannel = channel;
    this.isActive = channel.id;
    this.getAllPlaylists(channel.id);
    this.AddSecondsToTime(channel.previewTime);
    this.tempChannel = {} as ChannelModel;
  }

  updateChannelName(channel: ChannelModel) {
    this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(channel.id).update(channel);
    this.toastrService.success('Channel updated successfully', 'Update Channel');

    this.dialogRef.close();
  }

  updatePlaylistSchedule(play: PlaylistModel, index: any) {
    if (!this.sch.id) {
      this.sch.id = this.afs.createId();
    }
    this.sch.playlistID = play.id;
    this.defaultPlaylistChannel = this.defaultChannel.playlist[this.sch.index];
    this.afs.firestore.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(this.defaultChannel.id)
      .collection('schedule').doc(this.sch.id).set(Object.assign({}, this.sch)).then(() => {
        this.dialogRef.close(); // close dialog
        this.toastrService.success('Playlist Schedule updated successfully', 'Update Playlist Schedule');

      });
    const i = this.defaultChannel.playlist.findIndex(t => t.playlist_id === play.id);
    if (i !== -1) {
      this.defaultPlaylistChannel.schedule_id = this.sch.id;
      this.defaultPlaylistChannel.playlist_id = play.id;
      this.defaultChannel.playlist[this.sch.index] = Object.assign({}, this.defaultPlaylistChannel);
      this.afs.firestore.collection('restaurants').doc(this.restaurant.id).collection('channel')
        .doc(this.defaultChannel.id).update(Object.assign({}, this.defaultChannel));

    }

  }

  searchAllList() {
    if (this.searchValue !== '') {
      this.searchAndSorting(this.searchValue);
    } else if (this.searchValue === '') {
      this.channelPlaylists = this.tempchannelPlaylists;
    }
  }
  searchAndSorting(keyword) {
    this.channelPlaylists = this.tempchannelPlaylists
      .filter(prof => {
        return prof.name.toLowerCase().includes(keyword.toLowerCase());
      })
      .sort((a, b) => {
        if (a.name.toLowerCase().indexOf(keyword.toLowerCase()) > b.name.toLowerCase().indexOf(keyword.toLowerCase())) {
          return 1;
        } else if (a.name.toLowerCase().indexOf(keyword.toLowerCase()) < b.name.toLowerCase().indexOf(keyword.toLowerCase())) {
          return -1;
        } else {
          if (a.name > b.name)
            return 1;
          else
            return -1;
        }
      });
  }


  refreshTab() {
    this.change = false;
  }

  getAllPlaylists(id) {

    this.channelLoading = true;
    let playlists: PlaylistModel[] = [];
    this.previewAllPlaylist.media = [];
    this.indexes = [];

    this.httpclient
      .get(`https://europe-west1-${environment.firebase.projectId}.cloudfunctions.net/getchannelplaylists?companyID=${this.restaurant.id}&channelID=${id}`)
      .subscribe((playlist: any[]) => {
        for (let i = 0; i < playlist.length; i++) {
          const play = new PlaylistModel();
          play.media = [];
          if (playlist[i] !== null && playlist[i] !== undefined &&
            playlist[i]._fieldsProto !== null && playlist[i]._fieldsProto !== undefined) {
            if (playlist[i]._fieldsProto.id) {
              play.id = playlist[i]._fieldsProto.id.stringValue;
            }
            if (playlist[i]._fieldsProto.name) {
              play.name = playlist[i]._fieldsProto.name.stringValue;
            }
            if (playlist[i]._fieldsProto.creationDate) {
              play.creationDate = playlist[i]._fieldsProto.creationDate.timestampValue;
            }
            if (playlist[i]._fieldsProto.previewTime) {
              play.previewTime = playlist[i]._fieldsProto.previewTime.stringValue;
            }
          }
          if (playlist[i] && playlist[i]._fieldsProto && playlist[i]._fieldsProto.media) {
            const tempMedia = playlist[i]._fieldsProto.media.arrayValue;
            this.index = i + '_' + play.id;
            this.indexes.push(this.index);

            for (let j = 0; j < tempMedia.values.length; j++) {
              const media = new MediaModel();
              media.id = tempMedia.values[j].mapValue.fields.id.stringValue;
              media.name = tempMedia.values[j].mapValue.fields.name.stringValue;
              media.creationDate = tempMedia.values[j].mapValue.fields.creationDate.timestampValue;
              media.length = tempMedia.values[j].mapValue.fields.length.stringValue;
              media.type = tempMedia.values[j].mapValue.fields.type.stringValue;
              media.url = tempMedia.values[j].mapValue.fields.url.stringValue;
              if (tempMedia.values[j].mapValue.fields.thumbnailPath) {
                media.thumbnailPath = tempMedia.values[j].mapValue.fields.thumbnailPath.stringValue;
              }
              if (tempMedia.values[j].mapValue.fields.thumbnailURL) {
                media.thumbnailURL = tempMedia.values[j].mapValue.fields.thumbnailURL.stringValue;
              }
              if (media.type !== 'html') {
                media.size = tempMedia.values[j].mapValue.fields.size.integerValue;
                media.path = tempMedia.values[j].mapValue.fields.path.stringValue;
              } else {
                media.size = '10';
                media.path = 'none';
              }
              play.media.push(media);
              this.previewAllPlaylist.media.push(media);
            }
          }
          playlists[i] = play;
        }
        playlists = playlists.filter(p => p.id != undefined)
        this.channelPlaylists = playlists;
        this.tempchannelPlaylists = playlists;

        const playIds = uniq(this.defaultChannel.playlist.map(p => p.playlist_id))
        playIds.forEach(p => {
          if (this.channelPlaylists.filter(play => play.id == p)[0] == undefined) {
            this.defaultChannel.playlist = this.defaultChannel.playlist.filter(pp => pp.playlist_id != p)
          }
        })

        this.channelLoading = false;
        this.TotalHrs = 0;
        this.TotalMin = 0;
        this.TotalSec = 0;
        this.TotalMilSec = 0;
        this.TotalTimeString = '00:00:00';
        if (this.channelPlaylists !== undefined && this.channelPlaylists.length > 0) {
          this.channelPlaylists.forEach(element => {
            this.AddSecondsToTime(element.previewTime);
          });
        }
        /*if (this.defaultChannel !== undefined) {
          if (this.defaultChannel.previewTime !== this.TotalSec.toString()) {
            this.defaultChannel.previewTime = this.TotalSec.toString();
            this.afs.collection('restaurants').doc(this.restaurant.id).collection('channel').doc(this.defaultChannel.id).update(this.defaultChannel);
          }
        }*/
      },
      );
  }

  AddSecondsToTime(seconds: string) {
    this.TotalSec = this.TotalSec + Number(seconds);
    const d = Number(this.TotalSec);
    const hrs = Number(Math.floor(d / 3600)) !== 0 ? Math.floor(d / 3600).toString() : 0;
    const min = Number(Math.floor(d % 3600 / 60)) !== 0 ? Math.floor(d % 3600 / 60) : 0;
    const sec = Number(Math.floor(d % 3600 % 60)) !== 0 ? Math.floor(d % 3600 % 60) : 0;
    this.TotalTimeString = (hrs >= 0 && hrs < 10 ? ('0' + hrs).toString() : hrs.toString()) + ':'
      + (min >= 0 && min < 10 ? ('0' + min).toString() : min.toString())
      + ':' + (sec >= 0 && sec < 10 ? ('0' + sec).toString() : sec.toString());
  }

  NoPendingPublish() {
    if (this.Changechannellist) {
      if (this.ConfirmchanneldialogRef !== null && this.ConfirmchanneldialogRef !== undefined) {
        this.ConfirmchanneldialogRef.close();
      }
      this.Changechannellist = false;
      this.change = false;
      this.selectChannel(this.tempChannel);
    } else {
      this.subs.unsubscribe();
      this.dragulaService.destroy('vampire_channel');
      this.changemenusubscription.unsubscribe();
      if (this.ConfirmchanneldialogRef !== null && this.ConfirmchanneldialogRef !== undefined) {
        this.ConfirmchanneldialogRef.close();
      }
    }
  }

  ConfirmationSaveModal(SaveChannelConfirmationDialog: TemplateRef<any>) {
    if (this.ConfirmchanneldialogRef !== null && this.ConfirmchanneldialogRef !== undefined) {
      this.ConfirmchanneldialogRef.close();
    }
    this.ConfirmchanneldialogRef = this.dialogService.open(
      SaveChannelConfirmationDialog,
      { context: {} });
  }
  Refresh() {
    this.getCompany();
  }
}
