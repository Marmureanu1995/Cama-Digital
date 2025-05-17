import { MediaModel } from "./../../model/media.model";
import { last, map, take } from "rxjs/operators";
import { CdkDragDrop, moveItemInArray } from "@angular/cdk/drag-drop";
import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
} from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { NbDialogService, NbToastrService, NbWindowService } from "@nebular/theme";
import { TranslateService } from "@ngx-translate/core";
import { Subject, Subscription, of } from "rxjs";
import { CompanyModel } from "../../model/companyModel";
import { PlaylistModel } from "../../model/playlist.model";
import { UserModel } from "../../model/user.model";
import { FirebaseService } from "../../services/firebase.service";
import { ScheduleModel } from "../../model/schedule.model";
import { ChannelPendingChangeService } from "../../services/channel-pending-change.service";
import { PendingChangesComponent } from "../pending-changes/pending-changes.component";
import { FirebaseTimeService } from "../../services/firebase-time.service";
import * as moment from "moment";
import { HttpClient } from "@angular/common/http";
import { TruncatePipe } from "../../pipes/truncate.pipe";
import { MediaFolder } from "../../model/mediaFolder";
import { environment } from "../../../environments/environment";
import { NetworkDeviceModel } from "../../model/networkDevice";


@Component({
  selector: "ngx-playlist",
  templateUrl: "./playlist.component.html",
  styleUrls: ["./playlist.component.scss"],
})
export class PlaylistComponent implements OnInit, OnDestroy {
  selectedValue = "2";
  getAllPlayList: Array<any> = [];
  destroy$: Subject<boolean> = new Subject<boolean>();
  user = {} as UserModel;
  restaurant = {} as CompanyModel;
  selectedPlayList = {} as PlaylistModel;
  tempSelectedPlayList = {} as PlaylistModel;
  ChannelPlayListloading: boolean = false;
  getAllMediaList: any = [];
  change: boolean = false;
  newPlayListName: string = "";
  dialogRef: any;
  newPlayListObj = {} as PlaylistModel;
  ExpiryDate: Date;
  allCompanyUsers: Array<any> = [];
  TotalHrs: number = 0;
  TotalMin: number = 0;
  TotalSec: number = 0;
  TotalMilSec: number = 0;
  sch = {} as ScheduleModel;
  oldSch = {} as ScheduleModel;

  TotalTimeString: string = "00:00:00";
  schedules: Array<ScheduleModel> = new Array<ScheduleModel>();
  i: any;
  playlistLoading: boolean = true;
  ClickedOtherMenuItem: boolean;
  private subs = new Subscription();
  searchValue: string = "";
  timer: any;
  vidCheck: boolean;
  previewMedia = {} as MediaModel;
  previewLength: any;
  challdata = false;
  selectAll: boolean;
  dragStarted: boolean = false;
  alternateImg: any =
    "/assets/images/no-preview.jpg";
  alternateHtml: any =
    "/assets/images/html_image.jpg";
  ConfirmchanneldialogRef: any;
  itemsTable: any = [];
  boxWidth = 144;
  columnSize: number;
  selectedList = [];
  dragIndex: number;
  wrongPlaylistNamePattern: boolean = false;
  playlistPatternMessage: string;
  playlistNamePatternCheck: boolean = false;
  selectedCompany: string = ""
  interval: any;
  currentBannerCount = 0;
  indexToHighlight: number;
  color: string;
  textColor: string;
  fontSize: number;
  showLoader: boolean = false;
  tildaPart: string;
  fileFormat: string;
  paginationAgendaStartingIndex: number = -8;
  multiplePagesInAgenda: boolean = false;//are there multiplePages In Agenda
  multiPageAgendaInterval: any = null;
  paginateGap: number = 8;

  /**
 * folders code
 * 
 */

  allFolders: MediaFolder[] = [];
  currentFolder: MediaFolder = null;
  newFolderName: string = '';
  copyMediaAll: Array<MediaModel> = [];

  constructor(
    private _firebaseService: FirebaseService,
    private afs: AngularFirestore,
    private ref: ChangeDetectorRef,
    private dialogService: NbDialogService,
    public _channelPendingChangeService: ChannelPendingChangeService,
    public translate: TranslateService,
    private toastrService: NbToastrService,
    private _firebaseTimeService: FirebaseTimeService,
    private httpclient: HttpClient,
    private truncantePipe: TruncatePipe

  ) {
    this.getAllPlayList = [];
    this.sch = new ScheduleModel();
    this.i = 0;
    this.vidCheck = true;
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

  getAllCompanyUsers() {
    this._firebaseService
      .getAllCompanyUsers(this.restaurant.id)
      .takeUntil(this.destroy$)
      .subscribe((data) => {
        this.allCompanyUsers = data;
      });
  }

  getAuthState() {
    this._firebaseService
      .getAuthState()
      .takeUntil(this.destroy$)
      .subscribe((res) => {
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
        this.getAllFolders(this.user.id)
        this.getPlayListList();
        this.getAllMedia();
        this.getAllCompanyUsers();
      });
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

  getAllMedia() {
    this._firebaseService
      .getAllMedia(this.restaurant.id)
      .takeUntil(this.destroy$)
      .subscribe((media) => {
        this.setMediaItemsToUi(media as MediaModel[])
      });
  }

  getPlayListList() {
    this._firebaseService
      .getPlayList(this.restaurant.id)
      .takeUntil(this.destroy$)
      .subscribe((data) => {
        if (data.length == 0) {
          this.getAllPlayList = [];
          this.selectedPlayList = new PlaylistModel();
          return;
        }
        if (
          this.user.role == "user" &&
          this.user.assignedplaylist.length == 0
        ) {
          this.getAllPlayList = [];
          this.selectedPlayList = new PlaylistModel();
          return;
        }
        if (this.user.role == "user") {
          if (this.user.assignedplaylist.length > 0) {
            this.getAllPlayList = [];
            this.user.assignedplaylist.forEach((id) => {
              let tempPlay = data.filter((doc) => doc.id == id)[0];
              this.getAllPlayList.push(tempPlay);
            });
          }
        } else {
          this.getAllPlayList = data;
        }
        let filterFlag = data.filter((x) => x.id == this.selectedPlayList.id);
        if (this.getAllPlayList[0] && filterFlag.length == 0) {
          this.selectedPlayList = this.getAllPlayList[0];
        } else if (
          this.selectedPlayList.id &&
          this.getAllPlayList.length != 0
        ) {
          this.selectedPlayList.name = this.getAllPlayList.filter(
            (x) => x.id == this.selectedPlayList.id
          )[0].name; //change PlayList name if updated
        }
        this.tempSelectedPlayList = JSON.parse(
          JSON.stringify(this.selectedPlayList)
        );
        this.getSchedules(this.selectedPlayList);
        this.TotalHrs = 0;
        this.TotalMin = 0;
        this.TotalSec = 0;
        this.TotalMilSec = 0;
        this.TotalTimeString = "00:00:00";
        this.selectedPlayList.media.forEach((single) => {
          this.AddSecondsToTime(single.length);
        });
        this.initTable();
      });
  }

  ngOnDestroy() {
    if (this.change) {
      this._channelPendingChangeService.selectedPlayList =
        this.selectedPlayList;
      this.dialogService
        .open(PendingChangesComponent)
        .onClose.takeUntil(this.destroy$)
        .subscribe((data) => {
          if (data == "Yes") {
            let pervoiusPlayList =
              this._channelPendingChangeService.getPerviousPlayList;
            pervoiusPlayList.previewTime = this.TotalSec.toString();
            this._firebaseService
              .updatePlayList(this.restaurant.id, pervoiusPlayList)
              .then(() => {
                this.toastrService.success(
                  "Playlist updated successfully",
                  "Update Playlist"
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

  initTable() {
    this.itemsTable = this.selectedPlayList.media
      .filter((_, outerIndex) => outerIndex % this.columnSize == 0) // create outter list of rows
      .map((_, rowIndex) =>
        this.selectedPlayList.media.slice(
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

  trackByEmpCode(item: any): string {
    return item.id;
  }

  getItemsTable(rowLayout: Element): number[][] {
    const { width } = rowLayout.getBoundingClientRect();
    const columnSize = Math.floor(width / this.boxWidth);
    if (columnSize != this.columnSize) {
      this.columnSize = columnSize;
      this.initTable();
    }
    return this.itemsTable;
  }

  async onDragStarted(index: number): Promise<void> {
    const item = this.getAllMediaList[index];
    if (item.type.includes("video")) {
      const res: any = await this.httpclient
        .post("https://europe-west1-" + environment.firebase.projectId + ".cloudfunctions.net/getInfo", {
          url: item.url,
        })
        .toPromise();
      if (res) {
        if (res.compressionInProgess == true) {
          this.toastrService.danger(
            "This video is under compression process. Please Try Again Later",
            "Compressing"
          );
          return;
        }
      }
    }

    this.dragStarted = true;
    this.getAllMediaList[index].state = true;

    if (this.itemsTable.length == 1)
      document.getElementById("DropZone0").style.cssText = "min-height: 340px;";
    else if (this.itemsTable.length == 2)
      document.getElementById("DropZone1").style.cssText = "min-height: 240px;";
  }

  reorderDroppedItem(event: CdkDragDrop<number[]>, index) {
    this.dragStarted = false;
    if (this.getAllPlayList.length == 0) {
      this.toastrService.info("Please Create PlayList First", "PlayList");
      return;
    }
    this.change = true;
    if (
      event.previousContainer.id.includes("DropZone") &&
      event.container.id.includes("DropZone")
    ) {
      if (index == this.dragIndex) {
        // if same row
        moveItemInArray(
          this.selectedPlayList.media,
          this.columnSize * index + event.previousIndex,
          this.columnSize * index + event.currentIndex
        );
        this.resetonDrop();
      } else {
        // if different row
        moveItemInArray(
          this.selectedPlayList.media,
          this.columnSize * this.dragIndex + event.previousIndex,
          this.columnSize * index + event.currentIndex
        );
      }
      this.selectedList = [];
      this.resetonDrop();
    } else {
      // if dropped from different div
      for (let i = this.getAllMediaList.length - 1; i >= 0; i--) {
        if (this.getAllMediaList[i].state) {
          let med = {} as MediaModel;
          if (this.getAllMediaList[i].state == true) {
            med.id = this.getAllMediaList[i].id;
            med.name = this.getAllMediaList[i].name;
            med.type = this.getAllMediaList[i].type;
            med.creationDate = this.getAllMediaList[i].creationDate;
            med.length = this.getAllMediaList[i].length;
            med.length = med.length + "";
            med.url = this.getAllMediaList[i].url;
            med.width = this.getAllMediaList[i].width;
            med.height = this.getAllMediaList[i].height;
            if (!this.getAllMediaList[i].path) {
              med.path = "";
            } else {
              med.path = this.getAllMediaList[i].path;
            }
            if (med.url.includes("allurerealestate")) {
              med.pictures = this.getAllMediaList[i].pictures;
              med.gerdenSize = this.getAllMediaList[i].gerdenSize;
              med.groundArea = this.getAllMediaList[i].groundArea;
              med.price = this.getAllMediaList[i].price;
              med.totalArea = this.getAllMediaList[i].totalArea;
              med.totalBaths = this.getAllMediaList[i].totalBaths;
              med.totalToilets = this.getAllMediaList[i].totalToilets;
            }

            if (med.type != "html" && med.type != "weather") {
              med.size = this.getAllMediaList[i].size;
              med.path = this.getAllMediaList[i].path;
            }
            if (this.getAllMediaList[i].forecastdays) {
              med.forecastdays = this.getAllMediaList[i].forecastdays;
              med.location = this.getAllMediaList[i].location;
              med.scale = this.getAllMediaList[i].scale;
            }
            if (
              med.type === "video/mp4" ||
              med.type === "video/quicktime"
            ) {
              med.thumbnailPath = this.getAllMediaList[i].thumbnailPath;
              if (typeof this.getAllMediaList[i].thumbnailURL === "undefined") {
                med.thumbnailURL = "";
              } else {
                med.thumbnailURL = this.getAllMediaList[i].thumbnailURL;
              }
            }

            this.TotalMilSec =
              Number(med.length.split(".")[1]) != null &&
                Number(med.length.split(".")[1]) !== undefined
                ? this.TotalMilSec + Number(med.length.split(".")[1])
                : 0;
            if (this.TotalMilSec >= 1000) {
              this.TotalMilSec = this.TotalMilSec - 1000;
              this.TotalSec = this.TotalSec + 1;
            }
            this.TotalSec = this.TotalSec + Number(med.length.split(".")[0]);
            const d = Number(this.TotalSec);
            const hrs =
              Number(Math.floor(d / 3600)) !== 0
                ? Math.floor(d / 3600).toString()
                : 0;
            const min =
              Number(Math.floor((d % 3600) / 60)) !== 0
                ? Math.floor((d % 3600) / 60)
                : 0;
            const sec =
              Number(Math.floor((d % 3600) % 60)) !== 0
                ? Math.floor((d % 3600) % 60)
                : 0;
            this.TotalTimeString =
              (hrs >= 0 && hrs < 10 ? ("0" + hrs).toString() : hrs.toString()) +
              ":" +
              (min >= 0 && min < 10 ? ("0" + min).toString() : min.toString()) +
              ":" +
              (sec >= 0 && sec < 10 ? ("0" + sec).toString() : sec.toString());
            this.challdata = false;
            this.getAllMediaList[i].state = false;
          }
          var getDate = <any>med.creationDate;
          if (getDate && getDate.seconds) {
            med.creationDate = moment(getDate.seconds * 1000).toDate();
          }

          this.selectedPlayList.media.splice(
            this.columnSize * index + event.currentIndex,
            0,
            med
          );
          this.tempSelectedPlayList.media.splice(
            this.columnSize * index + event.currentIndex,
            0,
            med
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
    this.selectAll = false;
    this.dragStarted = false;
    for (let i = 0; i < this.getAllMediaList.length; i++) {
      this.getAllMediaList[i].state = false;
    }
    this.initTable();
    this.selectedList = [];
  }

  playListSelected(playList: PlaylistModel) {
    this.TotalHrs = 0;
    this.TotalMin = 0;
    this.TotalSec = 0;
    this.TotalMilSec = 0;
    this.TotalTimeString = "00:00:00";
    this.i = 0;
    if (
      document.documentElement.clientWidth > 280 &&
      document.documentElement.clientWidth < 1024
    ) {
      this.closeNav();
    }
    if (playList.id == this.selectedPlayList.id) return;
    else if (this.change) {
      document.getElementById("showsavechannelconfirm").click();
    }
    this.change = false;
    try {
      this.selectedPlayList = this.getAllPlayList.filter(
        (x) => x.id == playList.id
      )[0];
    } catch {
      this.selectedPlayList = this.getAllPlayList[0];
    }
    this.tempSelectedPlayList = JSON.parse(
      JSON.stringify(this.selectedPlayList)
    );
    this.selectedPlayList.media.forEach((single) => {
      this.AddSecondsToTime(single.length);
    });

    this.getSchedules(this.selectedPlayList);

    this.initTable();
  }

  addPlaylist(AddPlaylistDialog: TemplateRef<any>) {
    this.newPlayListName = "";
    this.dialogRef = this.dialogService.open(AddPlaylistDialog, {
      context: "New playlist is added.",
    });
  }

  validationPlaylistNameCheck() {
    // if (this.newPlayListName.includes(" ")) {
    //   this.wrongPlaylistNamePattern = true;
    //   this.playlistPatternMessage = "Playlist Name must be without any spaces";
    // } else 
    if (
      this.newPlayListName === undefined ||
      this.newPlayListName === null ||
      this.newPlayListName === ""
    ) {
      this.wrongPlaylistNamePattern = true;
      this.playlistPatternMessage = "Playlist Name must be without any spaces";
    } else {
      this.wrongPlaylistNamePattern = false;
    }
  }

  createPlayList() {
    if (this.wrongPlaylistNamePattern == false) {
      this.newPlayListObj.id = this.afs.createId();
      this.newPlayListObj.creationDate =
        this._firebaseTimeService.firebaseServerTime();
      this.newPlayListObj.previewTime = "0";
      this.newPlayListObj.media = [];
      this.newPlayListObj.name = this.newPlayListName;
      this.newPlayListObj.ExpiryDate = this.ExpiryDate ? this.ExpiryDate : null;
      this._firebaseService
        .addNewPlayList(this.restaurant.id, this.newPlayListObj)
        .then(() => {
          if (this.user.role == "user") {
            this.user.assignedplaylist.push(this.newPlayListObj.id);
            this.afs.collection("users").doc(this.user.id).update(this.user);
          }
          this.newPlayListObj.creationDate = moment().toDate();
          this.getAllPlayList.push(this.newPlayListObj);
          this.playListSelected(this.newPlayListObj);
          this.toastrService.success(
            "Playlist created successfully",
            "Publish changes"
          );
          this.getPlayListList();
        });
      this.closeDialog();
    }
  }

  closeDialog() {
    this.dialogRef.close();
    this.wrongPlaylistNamePattern = false;
  }

  editPlaylist(EditPlaylistDialog: TemplateRef<any>, item: any) {

    this.dialogRef = this.dialogService.open(EditPlaylistDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }

  validationPlaylistNameEditCheck(play: PlaylistModel) {
    // if (play.name.includes(" ")) {
    //   this.wrongPlaylistNamePattern = true;
    //   this.playlistPatternMessage = "Playlist Name must be without any spaces";
    // } else 
    if (
      play.name === undefined ||
      play.name === null ||
      play.name === ""
    ) {
      this.wrongPlaylistNamePattern = true;
      this.playlistPatternMessage = "Playlist Name must be Entered";
    } else {
      this.wrongPlaylistNamePattern = false;
    }
  }
  updatePlaylistName(play: PlaylistModel) {
    if (this.wrongPlaylistNamePattern == false) {
      this.dialogRef.close();
      this.playlistNamePatternCheck = false;
      this._firebaseService.upDatePlayListName(this.restaurant.id, play).then(() => {
        this.toastrService.success(
          "Playlist updated successfully",
          "Update Playlist"
        );
      });
    }
  }

  deletePlaylistModal(
    DeletePlaylistDialog: TemplateRef<any>,
    item: PlaylistModel
  ) {
    this.dialogRef = this.dialogService.open(DeletePlaylistDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }

  deletePlayList(item: PlaylistModel) {
    this._firebaseService.deletePlayList(this.restaurant.id, item.id).then(() => {
      this.allCompanyUsers.forEach(async (doc) => {
        if (typeof doc.assignedplaylist != "undefined") {
          let index = doc.assignedplaylist.indexOf(item.id);
          if (index >= 0) {
            let ppp = [];
            for (let k = 0; k < doc.assignedplaylist.length; k++) {
              if (index != k) {
                ppp.push(doc.assignedplaylist[k]);
              }
            }
            doc.assignedplaylist = ppp;
            await this.afs.collection("users").doc(doc.id).update(doc);
          }
        }
      });
      this.dialogRef.close();
      this.toastrService.success(
        "Playlist deleted successfully",
        "Publish changes"
      );
    });
  }

  refreshChannel() {
    if (this.change) {
      document.getElementById("showsavechannelconfirm").click();
    }
    this.selectedValue = "2";
    this.change = false;
    this.selectedPlayList = new PlaylistModel();
    this.getPlayListList();
  }

  onSelection(event) {
    if (this.selectedValue === "1") {
      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("playlist", (ref) => ref.orderBy("name", "asc"))
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as PlaylistModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .takeUntil(this.destroy$)
        .subscribe((querySnapshot) => {
          this.getAllPlayList = querySnapshot;
        });
    }
    if (this.selectedValue === "2") {
      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("playlist", (ref) => ref.orderBy("creationDate", "desc"))
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as PlaylistModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .takeUntil(this.destroy$)
        .subscribe((querySnapshot) => {
          this.getAllPlayList = querySnapshot;
        });
    }
  }

  deletePlaylistMedia(DeletePlaylistMediaDialog: TemplateRef<any>, item: any) {
    item = JSON.parse(JSON.stringify(item));
    this.dialogRef = this.dialogService.open(DeletePlaylistMediaDialog, {
      context: { item },
    });
  }

  deletePM(i) {
    this.TotalHrs = 0;
    this.TotalMin = 0;
    this.TotalSec = 0;
    this.TotalMilSec = 0;
    this.TotalTimeString = "00:00:00";
    this.change = true;
    var deletedIndex = this.selectedPlayList.media
      .map(function (e) {
        return e.id;
      })
      .indexOf(i.item.id);
    this.selectedPlayList.media.splice(deletedIndex, 1);
    this.tempSelectedPlayList.media.splice(deletedIndex, 1);
    this.selectedPlayList.media.forEach((element) => {
      this.AddSecondsToTime(element.length);
    });
    this.initTable();
    this.change = true;
    this.dialogRef.close();
  }

  remove(array, element) {
    return array.filter((el) => el !== element);
  }

  read(dialog: TemplateRef<any>, item: any) {
    this.dialogService.open(dialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }

  edit(EditDialog: TemplateRef<any>, item: any) {
    const itemCopy = { ...item }//because if you edit item name on just opening it for the view. it's wrong.
    //basically the item has not changed but the name we are sending to dialog box is just changed
    this.dialogService.open(EditDialog, {
      context: JSON.parse(JSON.stringify(itemCopy)),
    });
  }

  editPlaylistMedia(EditPlayListDialog: TemplateRef<any>, item: any) {
    const itemCopy = { ...item }
    this.dialogRef = this.dialogService.open(EditPlayListDialog, {
      context: JSON.parse(JSON.stringify(itemCopy)),
    });
  }

  updatePlayListMediaItem(media: MediaModel) {
    if (media.creationDate && media.creationDate.seconds) {
      media.creationDate = moment(media.creationDate.seconds * 1000).toDate();
    }
    if (typeof media.creationDate == "string") {
      media.creationDate = new Date(media.creationDate);
    }

    if (media.name.length == 0) {
      this.toastrService.danger("Please Enter Name", "Invalid Name");
      return;
    } else if (media.length == null) {
      this.toastrService.danger("Invalid Length", "Invalid Length added");
      return;
    }

    var index = this.selectedPlayList.media.findIndex((x) => x.id == media.id);
    if (index != -1) {
      this.selectedPlayList.media[index] = media;
      this.updatePlayList();
      this.dialogRef.close();
    }
  }

  updateMediaItem(media: MediaModel) {
    if (this.change == true) {
      this.toastrService.danger("Please publish changes", "Edit Media");
      return;
    }
    if (media.creationDate && media.creationDate.seconds) {
      media.creationDate = moment(media.creationDate.seconds * 1000).toDate();
    }
    if (typeof media.creationDate == "string") {
      media.creationDate = moment(media.creationDate).toDate();
    }
    if (typeof media.length == "number") {
      media.length = media.length + "";
    }

    this.afs
      .collection("restaurants")
      .doc(this.restaurant.id)
      .collection("media")
      .doc(media.id)
      .update(media);

    this.RefreshMedias()


    this.toastrService.success(
      "Media updated successfully",
      "Media"
    );
  }

  onSelectTimeCheck(event) {
    this.sch.allDay = !this.sch.allDay;
  }
  onSelectDaysCheck(event) {
    this.sch.timeCheck = !this.sch.timeCheck;
  }

  deleteMedia(DeleteDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(DeleteDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }

  deleteM(item: MediaModel) {
    this._firebaseService.deleteMedia(this.restaurant.id, item.id).then(() => { });
  }

  schedule(ScheduleDialog: TemplateRef<any>, media: any) {
    let mediaSch: any = null;
    this._firebaseService
      .getPlaylistMediaSchedule(media, this.restaurant.id, this.selectedPlayList)
      .then((data) => {
        if (data.exists) {
          mediaSch = data.data();
          if (mediaSch != null) {
            this.sch = mediaSch;
            if (this.sch.dateCheck == false) {
              this.sch.dateFrom = new Date().toISOString().substring(0, 10);
              this.sch.dateTo = new Date().toISOString().substring(0, 10);
            } else {
              this.sch.dateFrom = new Date(this.sch.dateFrom)
                .toISOString()
                .substring(0, 10);
              this.sch.dateTo = new Date(this.sch.dateTo)
                .toISOString()
                .substring(0, 10);
            }
          } else {
            this.sch = new ScheduleModel();
          }
        } else {
          this.sch = new ScheduleModel();
        }

        this.oldSch.timeFrom = this.sch.timeFrom;
        this.oldSch.timeTo = this.sch.timeTo;
        this.oldSch.dateFrom = this.sch.dateFrom;
        this.oldSch.dateTo = this.sch.dateTo;

        this.dialogRef = this.dialogService.open(ScheduleDialog, {
          context: JSON.parse(JSON.stringify(media)),
        });
      });
  }

  updateMediaSchedule(media: MediaModel) {
    if (this.sch.id) {
      this.sch.mediaID = media.id;
      this.afs.firestore
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("playlist")
        .doc(this.selectedPlayList.id)
        .collection("schedule")
        .doc(media.id)
        .update(Object.assign({}, this.sch))
        .then(() => {
          this.toastrService.success(
            "Media Scheduled successfully",
            "Update Playlist"
          );
          this.dialogRef.close(); // close dialog
        });
    } else {
      this.sch.id = this.afs.createId();
      this.sch.mediaID = media.id;
      this.afs.firestore
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("playlist")
        .doc(this.selectedPlayList.id)
        .collection("schedule")
        .doc(media.id)
        .set(Object.assign({}, this.sch))
        .then(() => {
          this.toastrService.success(
            "Media Scheduled successfully",
            "Update Playlist"
          );
          this.dialogRef.close(); // close dialog
        });
    }
  }


  getSchedules(playlist: PlaylistModel) {
    if (!playlist) return undefined;

    this.afs
      .collection("restaurants")
      .doc(this.restaurant.id)
      .collection("playlist")
      .doc(playlist.id)
      .collection("schedule")
      .snapshotChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as ScheduleModel;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      )
      .takeUntil(this.destroy$)
      .subscribe((docs) => {
        this.schedules = docs;
      });
  }

  checkSchedule(item: MediaModel) {
    let sCheck = this.schedules.filter((s) => s.mediaID == item.id)[0];
    if (sCheck == undefined) {
      return false;
    }
    if (
      sCheck.allDay == true &&
      sCheck.dateCheck == false &&
      sCheck.timeCheck == false
    ) {
      if (sCheck.days.toString().includes("false")) {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  updatePlayList() {
    //before updating playlist iteratie in all media if it's video send it to getCompressedURL
    this.change = false;
    this.i = 0;
    this.playlistLoading = true;
    this.selectedPlayList.media.forEach((e) => {
      if (!e.url.includes("expoweather.web.app")) delete e.forecastdays;
    });
    this.selectedPlayList.previewTime = this.TotalSec.toString();
    const temp = this.selectedPlayList as any;
    if (temp.creationDate && temp.creationDate.seconds) {
      temp.creationDate = moment(temp.creationDate * 1000).toDate();
      this.selectedPlayList.creationDate = temp.creationDate;
    }
    this.selectedPlayList.media.forEach(async (x) => {
      if (!x.path) {
        x.path = "";
      }
      if (x.creationDate && x.creationDate.seconds) {
        x.creationDate = moment(x.creationDate.seconds * 1000).toDate();
      }
      if (typeof x.creationDate == "string") {
        x.creationDate = moment(x.creationDate).toDate();
      }
      if (typeof x.length == "number") {
        x.length = x.length + "";
      }
      if (typeof x.length == "number") {
        x.length = x.length + "";
      }
      if (typeof x.creationDate == "string") {
        x.creationDate = new Date(x.creationDate);
      }
    });

    this.afs.firestore
      .collection("restaurants")
      .doc(this.restaurant.id)
      .collection("playlist")
      .doc(this.selectedPlayList.id)
      .update({
        media: this.selectedPlayList.media,
        previewTime: this.selectedPlayList.previewTime,
      })
      .then(() => {
        this.playListSelected(temp);
        this.getSchedules(this.selectedPlayList);
        this.playlistLoading = false;
        this.toastrService.success(
          "Playlist updated successfully",
          "Publish changes"
        );
        this.TotalHrs = 0;
        this.TotalMin = 0;
        this.TotalSec = 0;
        this.TotalMilSec = 0;
        this.TotalTimeString = "00:00:00";
        this.RefreshPlayList();
        this.updateAllTables();
      });
  }

  async updateAllTables() {
    const tables = (await this.afs.collection('networkDevices', ref => ref.where('playlistId', '==', this.selectedPlayList.id)).get().toPromise()).docs.map(doc => doc.data());
    tables.forEach(async table => {
      const tableId = table.id;
      await this.afs.collection('networkDevices').doc(tableId).update({
        lastUpdate: this._firebaseTimeService.firebaseServerTime(),
      });
      await this.afs.collection('restaurants').doc(this.restaurant.id).collection('networkDevices').doc(tableId).update({
        lastUpdate: this._firebaseTimeService.firebaseServerTime(),
      })
    });
  }


  RefreshMedias() {
    this.getAllMediaList.length = 0
    this.getAllMedia()
  }

  RefreshPlayList() {
    this.change = false;
    this.TotalHrs = 0;
    this.TotalMin = 0;
    this.TotalSec = 0;
    this.TotalMilSec = 0;
    this.searchValue = "";
    this.TotalTimeString = "00:00:00";
    this.playlistLoading = false;
    this.selectedPlayList = this.getAllPlayList.find(
      (t) => t.id === this.selectedPlayList.id
    );
    this.selectedPlayList.media.forEach((single) => {
      this.AddSecondsToTime(single.length);
    });
    this.getSchedules(this.selectedPlayList);
  }

  AddSecondsToTime(seconds: string) {
    seconds = seconds + "";
    this.TotalMilSec =
      Number(seconds.split(".")[1]) != null &&
        Number(seconds.split(".")[1]) !== undefined
        ? this.TotalMilSec + Number(seconds.split(".")[1])
        : 0;
    if (this.TotalMilSec >= 1000) {
      this.TotalMilSec = this.TotalMilSec - 1000;
      this.TotalSec = this.TotalSec + 1;
    }
    this.TotalSec = this.TotalSec + Number(seconds.split(".")[0]);
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
      (hrs >= 0 && hrs < 10 ? ("0" + hrs).toString() : hrs.toString()) +
      ":" +
      (min >= 0 && min < 10 ? ("0" + min).toString() : min.toString()) +
      ":" +
      (sec >= 0 && sec < 10 ? ("0" + sec).toString() : sec.toString());
  }

  searchAllList() {
    if (this.searchValue !== "") {
      this.selectedPlayList.media = this.tempSelectedPlayList.media.filter(
        (t) => t.name.toLowerCase().includes(this.searchValue.toLowerCase())
      );
      this.initTable();
    } else if (this.searchValue === "") {
      this.selectedPlayList.media = JSON.parse(
        JSON.stringify(this.tempSelectedPlayList.media)
      );
      this.initTable();
    }
  }

  eyeAll(PreviewAllDialog: TemplateRef<any>) {
    clearTimeout(this.timer);
    clearInterval(this.interval);
    this.i = 0;
    console.log(this.i)
    var _self = this;
    this.previewLength = this.selectedPlayList.media.length;
    this.previewMedia = this.selectedPlayList.media[this.i];
    this.ref.detectChanges();
    if (
      this.previewMedia.type === "image/jpeg" ||
      this.previewMedia.type === "image/png" ||
      this.previewMedia.type == "html"
    ) {
      if (this.previewMedia) {
        this.timer = setTimeout(
          function () {
            _self.changeMedia();
          }.bind(this),
          parseInt(this.previewMedia.length) * 1000
        );
      }
    }



    this.dialogRef = this.dialogService.open(PreviewAllDialog, {
      context: null,
    }).onClose.subscribe(() => {
      clearInterval(this.interval)
      clearInterval(this.multiPageAgendaInterval)
      this.reinitPaginationVariables()
    });
  }

  changeMedia() {
    clearTimeout(this.timer);

    this.vidCheck = !this.vidCheck;
    if (this.i + 1 > this.previewLength) {
      this.i = 0;
      this.previewMedia = {} as MediaModel;
      this.dialogRef.close();
      return;
    }
    var _self = this;
    var counter = ++this.i;
    this.previewLength = this.selectedPlayList.media.length;
    this.previewMedia = this.selectedPlayList.media[counter];
    if (this.selectedPlayList.media[counter]) {
      this.timer = setTimeout(
        function () {
          _self.changeMedia();
        }.bind(this),
        parseInt(this.previewMedia.length) * 1000
      );
    }


  }

  eye(PreviewDialog: TemplateRef<any>, data: MediaModel) {
    clearInterval(this.interval);
    this.dialogService.open(PreviewDialog, { context: data }).onClose.subscribe(() => {
      clearInterval(this.interval)
      clearInterval(this.multiPageAgendaInterval)
      this.reinitPaginationVariables()
    });
  }

  checkAlldata(event) {
    this.getAllMediaList.forEach((p) => {
      if (p.length > 0) p.state = event.currentTarget.checked;
    });
  }

  onTouch(media, idx: number) {
    if (media.length == 0) {
      return;
    }
    this.selectedList = [];
    const selectedItem = this.getAllMediaList[idx];
    selectedItem.state = !selectedItem.state;
    for (const item of this.getAllMediaList) {
      if (item.state) {
        this.selectedList.push(JSON.parse(JSON.stringify(item)));
      }
    }
    var selectallcount = this.getAllMediaList.filter((x) => x.state == true);
    if (selectallcount.length == this.getAllMediaList.length) {
      this.selectAll = true;
    } else {
      this.selectAll = false;
    }
  }

  onDragStartedDropZone(index: number) {
    this.dragIndex = index;
  }

  ConfirmationSaveModal(SaveChannelConfirmationDialog: TemplateRef<any>) {
    if (
      this.ConfirmchanneldialogRef !== null &&
      this.ConfirmchanneldialogRef !== undefined
    ) {
      this.ConfirmchanneldialogRef.close();
    }
    this._channelPendingChangeService.selectedPlayList = this.selectedPlayList;
    this.dialogService
      .open(SaveChannelConfirmationDialog, { context: {} })
      .onClose.subscribe((data) => {
        if (data == "Yes") {
          let pervoiusPlayList =
            this._channelPendingChangeService.getPerviousPlayList;
          pervoiusPlayList.previewTime = this.TotalSec.toString();
          this._firebaseService
            .updatePlayList(this.restaurant.id, pervoiusPlayList)
            .then(() => {
              this.toastrService.success(
                "Playlist updated successfully",
                "Update Playlist"
              );
            });
        } else {
          this.getPlayListList();
        }
      });
  }

  reinitPaginationVariables() {
    clearInterval(this.multiPageAgendaInterval)
    this.paginateGap = 8
    this.paginationAgendaStartingIndex = -8;
    this.multiplePagesInAgenda = false
    this.multiPageAgendaInterval = null
  }

  /**
 * this function gets all the folders of current user
 */
  getAllFolders(userId: string) {
    this.afs.collection("restaurants").doc(this.restaurant.id).collection("folders", (ref) => ref.where("user_id", "==", userId)).get().toPromise().then((querySnapshot) => {
      this.allFolders = querySnapshot.docs.map((doc) => {
        return doc.data() as MediaFolder;
      });
    })
  }

  /**
   * this function addes media to ui and pages them
   */

  setMediaItemsToUi(items: MediaModel[]) {
    const folder = this.currentFolder;
    this.copyMediaAll = JSON.parse(JSON.stringify(items))
    const currentFolderItems = items.filter((x) => {
      if (folder == null) {
        return !x.folderBelongsTo || x.folderBelongsTo == ""
      }
      //if folderId is empty then show all items  that are not in a folder else show the media to crosponding folders
      return !x.folderBelongsTo && folder.id == "" || x.folderBelongsTo == folder.id;
    });
    this.getAllMediaList = currentFolderItems;
  }


  /**
   * this function run when you open a folder and loads media in it and renders it
   */

  changeFolder(folder: MediaFolder) {
    this.currentFolder = folder;
    const currentFolderItems = JSON.parse(JSON.stringify(this.copyMediaAll)).filter((x) => {
      //if folderId is empty then show all items  that are not in a folder else show the media to crosponding folders
      if (folder == null) {
        return !x.folderBelongsTo || x.folderBelongsTo == ""
      }
      return !x.folderBelongsTo && folder.id == "" || x.folderBelongsTo == folder.id;
    });
    this.getAllMediaList = currentFolderItems;
  }

  /**
   * this function will go back from a folder to the home screen
   */
  backFolder() {
    this.currentFolder = null;
    this.getAllMediaList = JSON.parse(JSON.stringify(this.copyMediaAll.filter(x => !x.folderBelongsTo || x.folderBelongsTo == "")));
  }

}