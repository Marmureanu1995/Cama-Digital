import { ChannelPendingChangeService } from "./../../services/channel-pending-change.service";
import { take, map, filter } from "rxjs/operators";
import { uniq } from "lodash";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
} from "@angular/core";
import { ChannelModel, ChannelPlaylistModel } from "../../model/channel.model";
import { CompanyModel } from "../../model/companyModel";
import { PlaylistModel } from "../../model/playlist.model";
import { UserModel } from "../../model/user.model";
import { FirebaseService } from "../../services/firebase.service";
import { MediaModel } from "../../model/media.model";
import { AngularFirestore } from "@angular/fire/firestore";
import { NbDialogService, NbToastrService } from "@nebular/theme";
import { TranslateService } from "@ngx-translate/core";
import { ScheduleModel } from "../../model/schedule.model";
import { ChangeFormatPipe } from "../../pipes/date-format-pipe.module";

import { ChannelScheduleModel } from "../../model/channelSchedule.model";
import { PendingChangesComponent } from "../pending-changes/pending-changes.component";
import { Subject } from "rxjs";
import * as moment from "moment";
import { TruncatePipe } from "../../pipes/truncate.pipe";

@Component({
  selector: "ngx-channel",
  templateUrl: "./channel.component.html",
  styleUrls: ["./channel.component.scss"],
})
export class ChannelComponent implements OnInit, OnDestroy {
  selectedValue = "2";
  channelsList: Array<any> = [];
  previewMedia = {} as MediaModel;
  searchValue: string = "";
  channelPlaylists: Array<PlaylistModel> = new Array<PlaylistModel>();
  SearchChannelPlaylists: Array<PlaylistModel> = new Array<PlaylistModel>();
  scheduleList: Array<ScheduleModel> = new Array<ScheduleModel>();
  user = {} as UserModel;
  restaurant = {} as CompanyModel;
  channel = {} as ChannelModel;
  selectedChannel = {} as ChannelModel;
  ConfirmchanneldialogRef: any;
  playLists: Array<PlaylistModel> = [];
  indexes: any;
  index: any;
  timer: any;
  i: any;
  dialogRef: any;
  newChannelName: string = "";
  previewPlaylist = {} as PlaylistModel;
  previewAllPlaylist = {} as PlaylistModel;
  previewLength: any;
  vidCheck: boolean;
  sch = {} as ChannelScheduleModel;
  oldSch = {} as ChannelScheduleModel;
  selectedPlaylistChannel = {} as ChannelPlaylistModel;
  TotalHrs: number = 0;
  TotalMin: number = 0;
  TotalSec: number = 0;
  TotalMilSec: number = 0;
  TotalTimeString: string = "00:00:00";
  change: boolean = false;
  isShuffle: boolean = false;
  ChannelPlayListloading: boolean = false;
  selectAll: boolean;
  dragStarted: boolean = false;
  alternateHtml: any =
    "/assets/images/html_image.jpg";
  alternateImg: any =
    "no-preview.jpg";
  destroy$: Subject<boolean> = new Subject<boolean>();
  channelPatternMessage: string;
  wrongChannelNamePattern: boolean = false;
  tableHeader: Array<string> = ["CLUB", "M", "W", "V", "G", "PTN"];
  selectedCompany: string = "";
  competition: string = "";
  indexToHighlight: number;
  textColor: string;
  fontSize: number;
  color: string;
  banners = [];
  currentBannerCount = 0;
  interval: any;
  showLoader: boolean;
  paginationAgendaStartingIndex: number = -8;
  multiplePagesInAgenda: boolean = false;//are there multiplePages In Agenda
  multiPageAgendaInterval: any;
  paginateGap: number = 8;

  constructor(
    private _firebaseService: FirebaseService,
    private afs: AngularFirestore,
    private ref: ChangeDetectorRef,
    private dialogService: NbDialogService,
    public _channelPendingChangeService: ChannelPendingChangeService,
    public translate: TranslateService,
    private toastrService: NbToastrService,
    private changeFormat: ChangeFormatPipe,
    private truncantePipe: TruncatePipe

  ) {
    this.selectedChannel = new ChannelModel();
    this.channelsList = [];
    this.vidCheck = true;
    this.selectedPlaylistChannel = new ChannelPlaylistModel();
  }
  ngOnDestroy() {
    if (this.change) {
      this._channelPendingChangeService.selectedChannel = this.selectedChannel;
      this.dialogService
        .open(PendingChangesComponent)
        .onClose.pipe(take(1))
        .subscribe((data) => {
          if (data == "Yes") {
            this.selectedChannel = new ChannelModel();
            let pervoiusChannel =
              this._channelPendingChangeService.getPerviousChannel;
            pervoiusChannel.previewTime = this.TotalSec.toString();
            this._firebaseService
              .updateChannel(this.restaurant.id, pervoiusChannel)
              .then(() => {
                this.toastrService.success(
                  "Channel updated successfully",
                  "Update Channel"
                );
                this.destroy$.next(true);
                this.destroy$.unsubscribe();
                clearInterval(this.interval);
              });
          }
        });
    } else {
      this.destroy$.next(true);
      this.destroy$.unsubscribe();
      clearInterval(this.interval);
    }
  }
  ngOnInit(): void {
    this.getAuthState();
    if (
      document.documentElement.clientWidth > 280 &&
      document.documentElement.clientWidth < 980
    ) {
      document.getElementById("open_btn").style.display = "block";
      document.getElementById("close_btn").style.display = "none";
    } else {
      document.getElementById("open_btn").style.display = "none";
      document.getElementById("close_btn").style.display = "block";
    }
  }

  //returns max media for each playlist
  getMaxMediaIcon(itemsRow: PlaylistModel) {
    const maxMedia = this.selectedChannel.playlist.find(
      (item) => item.playlist_id == itemsRow.id
    ).MaxMedia;
    return maxMedia;
  }

  getAuthState() {
    this._firebaseService
      .getAuthState()
      .takeUntil(this.destroy$)
      .subscribe((res) => {
        console.log(res);
        this.getUserProfile(res.uid);
      });
  }

  getUserProfile(uid) {
    this._firebaseService
      .getUserProfile(uid)
      .takeUntil(this.destroy$)
      .subscribe((userDoc) => {
        this.user = userDoc as UserModel;
        this.restaurant.id = this.user.companyID;
        this.getChannelList();
        this.getPlayList();
      });
  }

  getChannelList() {
    this.ChannelPlayListloading = true;
    this._firebaseService
      .getChannelList(this.restaurant.id)
      .takeUntil(this.destroy$)
      .subscribe((data) => {
        this.ChannelPlayListloading = false;
        this.channelsList = data;
        if (data.length > 0) {
          let filterFlag = data.filter((x) => x.id == this.selectedChannel.id);
          if (this.channelsList[0] && filterFlag.length == 0) {
            this.selectedChannel = this.channelsList[0];
            this.getSchedule();
          }
        } else if (data.length == 0) {
          this.channelPlaylists = [];
        } else if (this.selectedChannel.id) {
          this.selectedChannel.name = this.channelsList.filter(
            (x) => x.id == this.selectedChannel.id
          )[0].name; //change channel name if updated
          this.getSchedule();
        }
      });
  }

  getPlayList() {
    this._firebaseService
      .getPlaylist(this.restaurant.id)
      .takeUntil(this.destroy$)
      .subscribe((playlist) => {
        this.playLists = playlist as PlaylistModel[];
      });
  }

  ChannelSelected(channel: ChannelModel) {
    if (
      document.documentElement.clientWidth > 280 &&
      document.documentElement.clientWidth < 1024
    ) {
      this.closeNav();
    }
    if (channel.id == this.selectedChannel.id) return;
    else if (this.change) {
      document.getElementById("showsavechannelconfirm").click();
    }
    this._firebaseService
      .getChannelList(this.restaurant.id)
      .pipe(take(1))
      .subscribe((data) => {
        this.channelsList = data;
      });
    this.change = false;
    this.selectedChannel = channel;
    this.AddSecondsToTime(channel.previewTime);
    this.getSchedule();
  }

  //////////////////////////////////////////////////////////////////
  itemsTable: any = [];
  boxWidth = 144;
  columnSize: number;
  selectedList = [];
  dragIndex: number;

  getItemsTable(rowLayout: Element): number[][] {
    const { width } = rowLayout.getBoundingClientRect();
    const columnSize = Math.floor(width / this.boxWidth);
    if (columnSize != this.columnSize) {
      this.columnSize = columnSize;
      this.initTable();
    }
    return this.itemsTable;
  }

  onDragStarted(index: number): void {
    this.dragStarted = true;
    this.playLists[index].state = true;
    if (this.itemsTable.length == 1)
      document.getElementById("DropZone0").style.cssText = "min-height: 340px;";
    else if (this.itemsTable.length == 2)
      document.getElementById("DropZone1").style.cssText = "min-height: 240px;";
  }

  onDragStartedDropZone(index: number) {
    this.dragIndex = index;
  }

  getSchedule() {
    this.ChannelPlayListloading = true;
    this._firebaseService
      .getSchedule(this.restaurant.id, this.selectedChannel.id)
      .takeUntil(this.destroy$)
      .subscribe((data) => {
        this.scheduleList = data as ScheduleModel[];
        this.ChannelPlayListloading = false;
        this.getAllPlaylists();
      });
  }
  reinitPaginationVariables() {
    clearInterval(this.multiPageAgendaInterval);
    this.paginateGap = 8;
    this.paginationAgendaStartingIndex = -8;
    this.multiplePagesInAgenda = false;
    this.multiPageAgendaInterval = null;
  }

  initTable() {
    this.itemsTable = this.channelPlaylists
      .filter((_, outerIndex) => outerIndex % this.columnSize == 0) // create outter list of rows
      .map((_, rowIndex) =>
        this.channelPlaylists.slice(
          rowIndex * this.columnSize,
          rowIndex * this.columnSize + this.columnSize
        )
      );
    if (document.getElementById("DropZone0") != null)
      document.getElementById("DropZone0").style.cssText = "min-height: unset;";
    if (document.getElementById("DropZone1") != null) {
      document.getElementById("DropZone1").style.cssText = "min-height: unset;";
    }
  }

  openNav() {
    document.getElementById("mySidenav").style.width = "220px";
    document.getElementById("check").style.margin = "0px 0px 0px 220px";
    document.getElementById("check").style.maxWidth = "81%";
    document.getElementById("check").style.minWidth = "81%";
    document.getElementById("open_btn").style.display = "none";
    document.getElementById("close_btn").style.display = "block";
    document.getElementById("align_menu").style.marginRight = "15px";
  }

  closeNav() {
    document.getElementById("mySidenav").style.width = "0";
    document.getElementById("check").style.minWidth = "100%";
    document.getElementById("check").style.maxWidth = "100%";
    document.getElementById("check").style.margin = "0px 0px 0px 0px";
    document.getElementById("open_btn").style.display = "block";
    document.getElementById("close_btn").style.display = "none";
  }

  onTimeChangeValidation() {
    //if wrong revert
    if (this.sch.timeFrom >= this.sch.timeTo) {
      this.toastrService.danger(
        "From Time can't be greater than or equal to TimeTO"
      );

      this.sch.timeTo = this.oldSch.timeTo;
      this.sch.timeFrom = this.oldSch.timeFrom;
    }
    //else make it as latest oldSch
    else {
      this.oldSch.timeTo = this.sch.timeTo;
      this.oldSch.timeFrom = this.sch.timeFrom;
    }
  }

  onDateChangeValidation() {
    if (this.sch.dateFrom > this.sch.dateTo) {
      this.toastrService.danger("From Date can't be greater than to DateTo");

      this.sch.dateTo = this.oldSch.dateTo;
      this.sch.dateFrom = this.oldSch.dateFrom;
    }
    //else make it as latest oldSch
    else {
      this.oldSch.dateTo = this.sch.dateTo;
      this.oldSch.dateFrom = this.sch.dateFrom;
    }
  }

  reorderDroppedItem(event: CdkDragDrop<number[]>, index) {
    this.dragStarted = false;
    if (this.channelsList.length == 0) {
      this.toastrService.info("Please Create Channel", "Channel");
      return;
    }
    this.change = true;
    if (
      event.previousContainer.id.includes("DropZone") &&
      event.container.id.includes("DropZone")
    ) {
      if (index == this.dragIndex) {
        moveItemInArray(
          this.channelPlaylists,
          this.columnSize * index + event.previousIndex,
          this.columnSize * index + event.currentIndex
        );
        moveItemInArray(
          this.selectedChannel.playlist,
          this.columnSize * index + event.previousIndex,
          this.columnSize * index + event.currentIndex
        );
        this.resetonDrop();
      } else {
        moveItemInArray(
          this.channelPlaylists,
          this.columnSize * this.dragIndex + event.previousIndex,
          this.columnSize * index + event.currentIndex
        );
        moveItemInArray(
          this.selectedChannel.playlist,
          this.columnSize * this.dragIndex + event.previousIndex,
          this.columnSize * index + event.currentIndex
        );
      }
      this.selectedList = [];
      this.resetonDrop();
    } else {
      for (let i = this.playLists.length - 1; i >= 0; i--) {
        if (this.playLists[i].state && this.playLists[i].media.length > 0) {
          this.channelPlaylists.splice(
            this.columnSize * index + event.currentIndex,
            0,
            this.playLists[i]
          );
          var Channelplaylist = {} as any;
          Channelplaylist["playlist_id"] = this.playLists[i].id;
          Channelplaylist["index"] = (this.columnSize * index).toString();
          this.selectedChannel.playlist.splice(
            this.columnSize * index + event.currentIndex,
            0,
            Channelplaylist
          );
        }
      }
      this.resetonDrop();
    }
  }

  drop() {
    this.resetonDrop();
  }

  resetonDrop() {
    this.SearchChannelPlaylists = JSON.parse(
      JSON.stringify(this.channelPlaylists)
    );
    this.selectAll = false;
    this.dragStarted = false;
    for (let i = 0; i < this.playLists.length; i++) {
      this.playLists[i].state = false;
    }
    for (let j = 0; j < this.selectedChannel.playlist.length; j++) {
      this.selectedChannel.playlist[j].index = j.toString();
    }
    this.selectedList = [];
    this.getAllPlaylists();
    this.initTable();
  }

  onTouch(playList, idx: number) {
    if (playList.media.length == 0) {
      this.toastrService.danger('Empty playlist can"t be added', "Playlist");
      return;
    }
    this.selectedList = [];
    const selectedItem = this.playLists[idx];
    selectedItem.state = !selectedItem.state;
    for (const item of this.playLists) {
      if (item.state) {
        this.selectedList.push(JSON.parse(JSON.stringify(item)));
      }
    }
    var playlistcount = this.playLists.filter((x) => x.media.length > 0);
    var selectallcount = this.playLists.filter((x) => x.state == true);
    if (selectallcount.length == playlistcount.length) {
      this.selectAll = true;
    } else {
      this.selectAll = false;
    }
  }

  getAllPlaylists() {
    if (this.channelsList.length == 0) return;

    this.previewAllPlaylist.media = [];
    this.indexes = [];
    this.indexes = [];
    this.ChannelPlayListloading = true;
    if (this.channelsList.length == 0) return;

    let ids = [];
    this.selectedChannel.playlist.forEach((id) => {
      ids.push(id.playlist_id);
    });
    ids = uniq(ids.map((p) => p));
    let temp = [];
    this.selectedChannel.playlist.forEach((p) => {
      let filter = this.playLists.filter((x) => x.id == p.playlist_id)[0];
      if (filter != undefined && filter.media.length > 0) {
        temp.push(filter);
      }
    });
    this.channelPlaylists = JSON.parse(JSON.stringify(temp));
    this.initTable();
    const playIds = uniq(
      this.selectedChannel.playlist.map((p) => p.playlist_id)
    );
    playIds.forEach((p) => {
      if (
        this.channelPlaylists.filter((play) => play.id == p)[0] == undefined
      ) {
        this.selectedChannel.playlist = this.selectedChannel.playlist.filter(
          (pp) => pp.playlist_id != p
        );
      }
    });
    this.selectedChannel.playlist.forEach((s, i) => {
      if (s.schedule_id) this.channelPlaylists[i].scheduleID = s.schedule_id;
      this.channelPlaylists[i].isScheduled = this.checkSchedule(s.schedule_id);
    });
    this.TotalHrs = 0;
    this.TotalMin = 0;
    this.TotalSec = 0;
    this.TotalMilSec = 0;
    this.TotalTimeString = "00:00:00";
    if (
      this.channelPlaylists !== undefined &&
      this.channelPlaylists.length > 0
    ) {
      this.channelPlaylists.forEach((element) => {
        this.AddSecondsToTime(element.previewTime);
        element.media.forEach((m) => {
          this.previewAllPlaylist.media.push(m);
        });
      });
    }
    this.ChannelPlayListloading = false;
    this.SearchChannelPlaylists = JSON.parse(
      JSON.stringify(this.channelPlaylists)
    );
  }

  AddSecondsToTime(seconds: string) {
    this.TotalSec = this.TotalSec + Number(seconds);
    const d = Number(this.TotalSec);
    const hrs =
      Number(Math.floor(d / 3600)) !== 0 ? Math.floor(d / 3600).toString() : 0;
    const min =
      Number(Math.floor((d % 3600) / 60)) !== 0
        ? Math.floor((d % 3600) / 60)
        : 0;
    const sec =
      Number(Math.floor((d % 3600) % 60)) !== 0
        ? Math.floor((d % 3600) % 60)
        : 0;
    this.TotalTimeString =
      (parseInt(`${hrs}`) >= 0 && parseInt(`${hrs}`) < 10 ? ("0" + hrs).toString() : hrs.toString()) +
      ":" +
      (min >= 0 && min < 10 ? ("0" + min).toString() : min.toString()) +
      ":" +
      (sec >= 0 && sec < 10 ? ("0" + sec).toString() : sec.toString());
  }

  deleteChannelPlaylist(
    DeleteChannelPlaylistDialog: TemplateRef<any>,
    item: any,
    currentIndex: any,
    currentRow: any
  ) {
    item = this.columnSize * currentRow + currentIndex;
    this.dialogRef = this.dialogService.open(DeleteChannelPlaylistDialog, {
      context: item,
    });
  }

  checkSchedule(id) {
    let sCheck;
    if (this.scheduleList == undefined || this.scheduleList.length == 0)
      return false;
    sCheck = this.scheduleList.filter((s) => s.id == id);
    if (sCheck == undefined || sCheck.length == 0) return false;
    sCheck = sCheck[0];
    if (
      sCheck.allDay == true &&
      sCheck.dateCheck == false &&
      sCheck.timeCheck == false
    ) {
      if (sCheck.days.toString().includes("false")) return true;
      else return false;
    } else return true;
  }

  trackByEmpCode(item: any): string {
    return item.id;
  }

  eyeAll(PreviewDialog: TemplateRef<any>) {
    this.eye(PreviewDialog, this.previewAllPlaylist);
  }

  eye(PreviewDialog: TemplateRef<any>, item: PlaylistModel) {
    if (this.change) {
      this.toastrService.danger(
        "Changes are pending,Please Publish them",
        "Channel"
      );
      return;
    }
    clearTimeout(this.timer);
    clearInterval(this.interval);
    this.i = 0;
    this.previewPlaylist = item;
    this.previewLength = item.media.length;
    this.previewMedia = item.media[this.i];
    if (
      this.previewMedia.type === "image/jpeg" ||
      this.previewMedia.type === "image/png" ||
      this.previewMedia.type == "html"
    ) {
      if (this.previewMedia && this.previewMedia.length) {



        this.afs
          .collection("banners")
          .valueChanges()
          .takeUntil(this.destroy$)
          .subscribe((banner: any) => {
            this.banners = banner;
            this.interval = setInterval(() => {
              console.log("5 seconds done");
              if (this.currentBannerCount < this.banners.length - 1)
                this.currentBannerCount = this.currentBannerCount + 1;
              else this.currentBannerCount = 0;
            }, 5000);
          });


        this.timer = setTimeout(
          function () {
            this.changeMedia();
          }.bind(this),
          parseInt(this.previewMedia.length, 10) * 1000
        );
      }
    }



    this.dialogRef = this.dialogService.open(PreviewDialog, { context: null }).onClose.subscribe(() => {
      clearInterval(this.interval)
      clearInterval(this.multiPageAgendaInterval)
    });
  }

  changeMedia(event: any) {
    this.vidCheck = !this.vidCheck;
    if (this.i + 1 > this.previewLength) {
      this.i = 0;
      this.dialogRef.close();
      this.previewMedia = null;
    }
    this.i++;
    this.previewMedia = this.previewPlaylist.media[this.i];
    this.previewLength = this.previewPlaylist.media.length;
    if (
      this.previewPlaylist.media[this.i] &&
      this.previewPlaylist.media[this.i].length
    ) {
      this.timer = setTimeout(
        function () {
          this.changeMedia();
        }.bind(this),
        parseInt(this.previewPlaylist.media[this.i].length, 10) * 1000
      );
    } else {
      this.dialogRef.close();
    }
  }

  addChannel(AddChannelDialog: TemplateRef<any>) {
    this.newChannelName = "";
    this.dialogRef = this.dialogService.open(AddChannelDialog, {
      context: "New Channel is added.",
    });
  }

  checkAlldata(event) {
    this.playLists.forEach((p) => {
      if (p.media.length > 0) p.state = event.currentTarget.checked;
    });
  }

  refreshChannel() {
    if (this.change) {
      document.getElementById("showsavechannelconfirm").click();
      return;
    }
    this.selectedValue = "2";
    this.change = false;
    this.selectedChannel = new ChannelModel();
    this.getChannelList();
  }

  closeDialog() {
    this.dialogRef.close();
    this.wrongChannelNamePattern = false;
  }

  deleteChannel(DeleteChannelDialog: TemplateRef<any>, item: ChannelModel) {
    this.dialogRef = this.dialogService.open(DeleteChannelDialog, {
      context: item,
    });
  }

  deleteCP(item: number) {
    this.dialogRef.close();
    this.TotalHrs = 0;
    this.TotalMin = 0;
    this.TotalSec = 0;
    this.TotalMilSec = 0;
    this.TotalTimeString = "00:00:00";
    this.channelPlaylists.splice(item, 1);
    this.selectedChannel.playlist.splice(item, 1);
    this.channelPlaylists.forEach((element) => {
      this.AddSecondsToTime(element.previewTime);
    });
    this.initTable();
    this.change = true;
  }

  validationchannelNameChaeck() {
    // if (this.newChannelName.includes(" ")) {
    //   this.wrongChannelNamePattern = true;
    //   this.channelPatternMessage = "Channel Name must be without any spaces";
    // } else 
    if (
      this.newChannelName === undefined ||
      this.newChannelName === null ||
      this.newChannelName === ""
    ) {
      this.wrongChannelNamePattern = true;
      this.channelPatternMessage = "Channel Name must be entered";
    } else {
      this.wrongChannelNamePattern = false;
    }
  }

  createChannel() {
    this.validationchannelNameChaeck();
    if (this.wrongChannelNamePattern == false) {
      this.newChannelName = this.newChannelName.trim();
      this.closeDialog();
      this.ChannelPlayListloading = true;
      this.channel.creationDate = moment().toDate();
      this.channel.previewTime = "0";
      this.channel.playlist = [];
      this.channel.name = this.newChannelName;
      this._firebaseService
        .addNewChannel(this.restaurant.id, this.channel)
        .then(() => {
          this.ChannelSelected(this.channel);
          this.ChannelPlayListloading = false;
          this.toastrService.success(
            "Channel created successfully",
            "Create Channel"
          );
        });
    }
  }

  deleteChannelConfirm(channel: ChannelModel) {
    this._firebaseService.deleteChannel(this.restaurant.id, channel.id).then(() => {
      this.dialogRef.close();
      this.toastrService.success(
        "Channel deleted successfully",
        "Delete Channel"
      );
    });
  }

  editChannel(EditChannelDialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(EditChannelDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }

  validationChannelNameEdit(channel: ChannelModel) {
    if (channel.name.includes(" ")) {
      this.wrongChannelNamePattern = true;
      this.channelPatternMessage = "Channel Name must be without any spaces";
      return;
    }
    if (
      channel.name === "" ||
      channel.name === undefined ||
      channel.name === null
    ) {
      this.wrongChannelNamePattern = true;
      this.channelPatternMessage = "Channel Name must be entered";
      return;
    } else {
      this.wrongChannelNamePattern = false;
    }
  }
  updateChannelName(channel: ChannelModel) {
    if (this.wrongChannelNamePattern == false) {
      this.dialogRef.close();
      this._firebaseService
        .updateChannelName(this.restaurant.id, channel)
        .then(() => {
          this.toastrService.success(
            "Channel updated successfully",
            "Update Channel"
          );
        });
    }
  }

  schedule(
    ScheduleDialog: TemplateRef<any>,
    item: any,
    currentIndex: any,
    currentRow: any
  ) {
    if (this.change == true) {
      this.toastrService.info(
        "Please Publish the changes to schedule playlist",
        "Channel"
      );
      return;
    }
    let playSch: any = null;
    if (item.scheduleID) {
      playSch = this.scheduleList.filter((x) => x.id == item.scheduleID);
    }
    if (playSch != null) {
      this.sch = new ChannelScheduleModel();
      this.sch = playSch[0];
      this.sch.index = this.columnSize * currentRow + currentIndex;
    } else {
      this.sch = new ChannelScheduleModel();
      this.sch.index = this.columnSize * currentRow + currentIndex;
    }
    this.oldSch.timeFrom = this.sch.timeFrom;
    this.oldSch.timeTo = this.sch.timeTo;
    this.oldSch.dateFrom = this.sch.dateFrom;
    this.oldSch.dateTo = this.sch.dateTo;
    this.dialogRef = this.dialogService.open(ScheduleDialog, { context: item });
  }

  updatePlaylistSchedule(play: PlaylistModel, index: any) {
    if (!this.sch.id) {
      this.sch.id = this.afs.createId();
    }
    this.sch.playlistID = play.id;
    this.selectedPlaylistChannel =
      this.selectedChannel.playlist[this.sch.index];

    this._firebaseService
      .updateSchedule(this.restaurant.id, this.selectedChannel.id, this.sch)
      .then(() => {
        this.dialogRef.close();
        this.toastrService.success(
          "Playlist Schedule updated successfully",
          "Update Playlist Schedule"
        );
      });

    const i = this.selectedChannel.playlist.findIndex(
      (t) => t.schedule_id === play.scheduleID
    );
    if (i !== -1) {
      this.selectedPlaylistChannel.schedule_id = this.sch.id;
      this.selectedPlaylistChannel.playlist_id = play.id;
      this.selectedChannel.playlist[this.sch.index] = Object.assign(
        {},
        this.selectedPlaylistChannel
      );

      this._firebaseService
        .updateChannelSchedule(this.restaurant.id, this.selectedChannel)
        .then(() => { });
    }
  }

  setting(
    SettingDialog: TemplateRef<any>,
    item: any,
    currentIndex: any,
    currentRow: any
  ) {
    let obj = {
      item: JSON.parse(JSON.stringify(item)),
      index: this.columnSize * currentRow + currentIndex,
    };
    this.dialogRef = this.dialogService.open(SettingDialog, { context: obj });
  }

  updateSetting() {
    this._firebaseService
      .updateChannelSetting(this.restaurant.id, this.selectedChannel)
      .then(() => {
        this.toastrService.success(
          "Settings updated successfully",
          "Update settings"
        );
      });
  }

  onSelection(event) {
    if (this.selectedValue === "1") {
      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("channel", (ref) => ref.orderBy("name", "asc"))
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as ChannelModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .pipe(take(1))
        .subscribe((querySnapshot) => {
          this.channelsList = querySnapshot;
        });
    }
    if (this.selectedValue === "2") {
      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("channel", (ref) => ref.orderBy("creationDate", "desc"))
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as ChannelModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .pipe(take(1))
        .subscribe((querySnapshot) => {
          this.channelsList = querySnapshot;
        });
    }
  }

  updateChannel() {
    if (this.change == true) {
      this.change = false;
      this.selectedChannel.previewTime = this.TotalSec.toString();
      this._firebaseService
        .updateChannel(this.restaurant.id, this.selectedChannel)
        .then(() => {
          this.toastrService.success(
            "Channel updated successfully",
            "Update Channel"
          );
        });
    }
  }

  onSelectDaysCheck(event) {
    this.sch.timeCheck = !this.sch.timeCheck;
    if (this.sch.allDay) {
      this.sch.timeFrom = null;
      this.sch.timeTo = null;
    }
  }
  onSelectTimeCheck(event) {
    this.sch.allDay = !this.sch.allDay;
  }

  searchAllList() {
    if (this.searchValue !== "") {
      this.channelPlaylists = this.SearchChannelPlaylists.filter((t) =>
        t.name.toLowerCase().includes(this.searchValue.toLowerCase())
      );
      this.initTable();
    } else if (this.searchValue === "") {
      this.channelPlaylists = this.SearchChannelPlaylists;
      this.initTable();
    }
  }

  checkMatchDate(date: string, time: string) {
    let currentDate = moment();
    let combinedDateString = `${date} ${time}`;
    const matchDateTime = moment(combinedDateString, "DD/MM HH:mm:ss");
    if (matchDateTime.isAfter(currentDate)) {
      return true; //true means will play
    } else {
      return false; //false means N/A (match was played but has no result)
    }
  }

  ConfirmationSaveModal(SaveChannelConfirmationDialog: TemplateRef<any>) {
    if (
      this.ConfirmchanneldialogRef !== null &&
      this.ConfirmchanneldialogRef !== undefined
    ) {
      this.ConfirmchanneldialogRef.close();
    }
    this._channelPendingChangeService.selectedChannel = this.selectedChannel;
    this.dialogService
      .open(SaveChannelConfirmationDialog, { context: {} })
      .onClose.subscribe((data) => {
        if (data == "Yes") {
          this.selectedChannel = new ChannelModel();
          let pervoiusChannel =
            this._channelPendingChangeService.getPerviousChannel;
          pervoiusChannel.previewTime = this.TotalSec.toString();
          this.change = false;
          this._firebaseService
            .updateChannel(this.restaurant.id, pervoiusChannel)
            .then(() => {
              this.toastrService.success(
                "Channel updated successfully",
                "Update Channel"
              );
            });
        } else {
          this.selectedValue = "2";
          this.change = false;
          this.selectedChannel = new ChannelModel();
          this.getChannelList();
        }
      });
  }

}
