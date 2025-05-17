import { HttpClient } from "@angular/common/http";
import { Component, OnDestroy, OnInit, TemplateRef } from "@angular/core";
import {
  NbCalendarRange,
  NbDialogService,
  NbToastRef,
  NbDateService,
} from "@nebular/theme";
import { MediaModel } from "../../model/media.model";
import {
  AngularFireStorage,
  AngularFireUploadTask,
} from "@angular/fire/storage";
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from "@angular/fire/firestore";

import { finalize, map, take, filter } from "rxjs/operators";
import { VideoProcessingService } from "../../video-processing-service";
import { AngularFireAuth } from "@angular/fire/auth";
import { CompanyModel } from "../../model/companyModel";
import { NbToastrService } from "@nebular/theme";
import { UserModel } from "../../model/user.model";
import { PaginationService } from "../../services/pagination.service";
import "rxjs/add/operator/takeUntil";
import { Subject, throwError } from "rxjs";
import { TranslateService } from "@ngx-translate/core";
import { WeatherService } from "../../services/weather.service";
import { FirebaseTimeService } from "../../services/firebase-time.service";
import * as moment from "moment";
import { NgxImageCompressService } from "ngx-image-compress";
import { Url } from "url";
import { Router } from "@angular/router";
import { environment } from "../../../environments/environment";
import { TruncatePipe } from "../../pipes/truncate.pipe";
import { MediaFolder } from "../../model/mediaFolder";
// import * as firebase from 'firebase'
// import { ImageCroppedEvent } from 'ngx-image-cropper';
@Component({
  selector: "ngx-media",
  templateUrl: "./media.component.html",
  styleUrls: ["./media.component.scss"],
})
export class MediaComponent implements OnInit, OnDestroy {
  public thumbnailData: string;
  destroy$: Subject<boolean> = new Subject<boolean>();
  private media: AngularFirestoreCollection<MediaModel>;
  private tempmedia: AngularFirestoreCollection<MediaModel>;
  items: any;
  tempitems: any;
  task: AngularFireUploadTask;
  thumbnailTask: AngularFireUploadTask;
  reader = new FileReader();
  files: any[] = [];
  mediaFile = {} as MediaModel;
  dialogRef: any;
  displayMode: number;
  webName: string;
  webUrl: string;
  webLength: string;
  searchValue: string;
  selectedValue: string;
  restaurant = {} as CompanyModel;
  today = moment();

  value: number[];
  change: boolean;
  index: number;
  FileIndex: number;
  SortBy: string = "";
  tempmedialist: Array<MediaModel> = [];
  copyMediaAll: Array<MediaModel> = [];
  user = {} as UserModel;
  categories: any;
  TotalHrs: number = 0;
  TotalMin: number = 0;
  TotalSec: number = 0;
  TotalMilSec: number = 0;
  uploadFlag: boolean = false;
  selectedWeather: string = "3 Days Weather";
  private afsCategory: AngularFirestoreCollection<any>;
  private ngUnsubscribeUploading = new Subject();
  imgResultBeforeCompress: any;
  imgResultAfterCompress: any;
  imageBefore: any;
  imageAfter: any;
  alternateImg: any =
    "/assets/images/no-preview.jpg";
  alternateHtml: any =
    "/assets/images/html_image.jpg";
  _validFileExtensions = [
    "image/jpeg",
    "image/jpeg",
    "image/bmp",
    "image/tiff",
    "application/octet-stream",
    "image/png",
    "video/m4v",
    "video/quicktime",
    "video/avi",
    "video/mpg",
    "video/mp4",
  ];
  isshow = false;
  isnotshow = true;
  pagination: any = {};
  pagedItems: any[];

  getweatherDetail: any;
  locationName: any = [];
  options = {
    multiple: false,
    theme: "classic",
    closeOnSelect: true,
    width: "160",
  };
  location: any = {};
  mediaUsedPlayList: any = [];

  imageChangedEvent: any = "";
  croppedImage: any = "";
  userId: any = "UGX1Hzo3MLSvyqUMc8CreGpss9L2";
  showSinage: boolean = false;
  mediaLoading: boolean = false;
  competition: string = "";
  currentBannerCount = 0;
  interval: any;
  indexToHighlight: number;
  color: string;
  textColor: string;
  fontSize: number;
  selectedCompany: string = "";
  showLoader: boolean = false;
  weekSelectedAgenda: number;
  paginationAgendaStartingIndex: number = -8;
  multiplePagesInAgenda: boolean = false; //are there multiplePages In Agenda
  multiPageAgendaInterval: any = null;
  paginateGap: number = 8;


  /**
   * folders code
   * 
   */

  allFolders: MediaFolder[] = [];
  currentFolder: MediaFolder = null;
  newFolderName: string = '';

  constructor(
    private _paginationService: PaginationService,
    private router: Router,
    private videoService: VideoProcessingService,
    private dialogService: NbDialogService,
    private afs: AngularFirestore,
    private storage: AngularFireStorage,
    private afAuth: AngularFireAuth,
    private _firebaseTimeService: FirebaseTimeService,
    private toastrService: NbToastrService,
    public translate: TranslateService,
    public _weather: WeatherService,
    private imageCompress: NgxImageCompressService,
    private httpClient: HttpClient,
    private truncantePipe: TruncatePipe
  ) {
    this.change = false;
    this.displayMode = 1;
    this.searchValue = "";
  }
  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
    this.cancelUpload();
    clearInterval(this.interval);
    clearInterval(this.multiPageAgendaInterval);
  }

  // checkUserId() {
  //   let userID = localStorage.getItem('userId');
  //   if (userID == this.userId) {
  //     this.showSinage = true;
  //   }
  // }

  checkUserCompany(companyID) {
    companyID == "UGX1Hzo3MLSvyqUMc8CreGpss9L2"
      ? (this.showSinage = true)
      : (this.showSinage = false);
  }

  ngOnInit() {
    this.afAuth.authState.takeUntil(this.destroy$).subscribe((res) => {
      if (res && res.uid) {
        this.afs
          .collection("users")
          .doc<UserModel>(res.uid)
          .get()
          .takeUntil(this.destroy$)
          .subscribe((userDoc) => {
            this.user = userDoc.data() as UserModel;
            this.restaurant.id = this.user.companyID;
            this.checkUserCompany(this.restaurant.id);
            this.getAllFolders(this.user.id);
            // Fetch Categories
            this.getCompany(this.restaurant.id);
            var previoususerid = localStorage.getItem("previoususerid");
            if (previoususerid == this.user.id) {
              var pl;
              var p = localStorage.getItem("media");
              try {
                pl = JSON.parse(p);
              } catch {
                pl = null;
              }
              if (pl == null) {
                if (
                  this.user.access_media == "all_media" ||
                  this.user.access_media == undefined
                ) {
                  this.getMediaByOrder(this.restaurant.id, "creationDate")
                    .takeUntil(this.destroy$)
                    .subscribe((docs) => {
                      this.setMediaItemsToUi(docs);
                    });
                  this.displayMode = 1;
                } else {
                  this.getMediaByUserId(this.restaurant.id)
                    .takeUntil(this.destroy$)
                    .subscribe((docs) => {
                      this.setMediaItemsToUi(docs);

                      localStorage.setItem("media", JSON.stringify(this.items));
                    });
                  this.displayMode = 1;
                }
              } else {
                var allmedia = localStorage.getItem("media");
                this.items = JSON.parse(allmedia);
                this.setPage(1);
              }
            }
            if (
              this.user.access_media == "all_media" ||
              this.user.access_media == undefined
            ) {
              this.getMediaByOrder(this.restaurant.id, "creationDate")
                .takeUntil(this.destroy$)
                .subscribe((docs) => {
                  this.setMediaItemsToUi(docs);
                  localStorage.setItem("media", JSON.stringify(this.items));
                });
              this.displayMode = 1;
            } else {
              this.getMediaByUserId(this.restaurant.id)
                .takeUntil(this.destroy$)
                .subscribe((docs) => {
                  this.setMediaItemsToUi(docs);
                  localStorage.setItem("media", JSON.stringify(this.items));
                });
              this.displayMode = 1;
            }
          });
      }
    });
    // this.checkUserId();
  }


  setPage(page: number) {
    this.pagination = this._paginationService.getPagination(
      this.items.length,
      page,
      24
    );
    if (page < 1 || page > this.pagination.totalPages) {
      this.pagedItems = this.items
      console.log("first")
      return;
    }
    this.pagedItems = this.items.slice(
      this.pagination.startIndex,
      this.pagination.endIndex + 1
    );
    this.pagedItems.forEach((media: MediaModel) => {
      if (
        [
          "image/jpeg",
          "image/jpeg",
          "image/bmp",
          "image/tiff",
          "image/png",
        ].includes(media.type) &&
        media.height == 0
      ) {
        var _self = this;
        var img = new Image();
        img.onload = function () {
          _self.afs
            .collection("restaurants")
            .doc(_self.restaurant.id)
            .collection("media")
            .doc(media.id)
            .update({ height: img.height, width: img.width });
        };
        img.src = media.url;
      }
    });
  }

  getCompany(companyId) {
    this.afsCategory = this.afs
      .collection("restaurants")
      .doc(companyId)
      .collection("category");
    this.categories = this.afsCategory.snapshotChanges().pipe(
      map((actions) =>
        actions.map((a) => {
          const data = a.payload.doc.data();
          const id = a.payload.doc.id;
          return { id, ...data };
        })
      )
    );

    this.afs
      .collection("restaurants")
      .doc(companyId)
      .snapshotChanges().pipe(
        map((actions) => {
          const data = actions.payload.data() as CompanyModel;
          const id = actions.payload.id;
          return { id, ...data };
        })
      ).takeUntil(this.destroy$).subscribe((company) => {
        this.restaurant = company;
      });

  }
  getMediaByUserId(companyId) {
    return this.afs
      .collection("restaurants")
      .doc(companyId)
      .collection("media", (ref) => ref.where("user_id", "==", this.user.id))
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

  navigate(media: MediaModel) {
    console.log("Navigating,...");
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
  getMedia() {
    this.afs
      .collection("media")
      .snapshotChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as MediaModel;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      );
  }
  trackByEmpCode(index: number, media: any): string {
    return media.id;
  }
  search() {
    if (this.searchValue !== "") {
      this.searchAndSorting(this.searchValue);
    } else if (this.searchValue === "") {
      this.items = this.tempitems;
      this.setPage(1);
    }
  }

  searchAndSorting(keyword) {
    this.items = this.tempitems
      .filter((prof) => {
        return prof.name.toLowerCase().includes(keyword.toLowerCase());
      })
      .sort((a, b) => {
        if (
          a.name.toLowerCase().indexOf(keyword.toLowerCase()) >
          b.name.toLowerCase().indexOf(keyword.toLowerCase())
        ) {
          return 1;
        } else if (
          a.name.toLowerCase().indexOf(keyword.toLowerCase()) <
          b.name.toLowerCase().indexOf(keyword.toLowerCase())
        ) {
          return -1;
        } else {
          if (a.name > b.name) return 1;
          else return -1;
        }
      });
    this.setPage(1);
  }

  compressFile(imageThumbnail) {
    this.imgResultBeforeCompress = imageThumbnail;
    console.warn(
      "Size in bytes was:",
      this.imageCompress.byteCount(imageThumbnail)
    );
    return this.imageCompress.compressFile(imageThumbnail, -2, 50, 50);
  }

  onSelection(event) {
    let str = event;
    if (str === "Newest") {
      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("media", (ref) => ref.orderBy("creationDate", "desc"))
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as MediaModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .takeUntil(this.destroy$)
        .subscribe((docs) => {
          this.setMediaItemsToUi(docs);

        });
    } else if (str === "Oldest") {
      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("media", (ref) => ref.orderBy("creationDate", "asc"))
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as MediaModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .takeUntil(this.destroy$)
        .subscribe((docs) => {
          this.setMediaItemsToUi(docs);

        });
    } else if (str === "A-Z") {
      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("media", (ref) => ref.orderBy("name", "asc"))
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as MediaModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .takeUntil(this.destroy$)
        .subscribe((docs) => {
          this.setMediaItemsToUi(docs);

        });
    } else if (str === "image" || str === "video" || str === "audio") {
      const start = str;
      const end = str + "\uf8ff";

      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("media", (ref) =>
          ref.orderBy("type").startAt(start).endAt(end)
        )
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as MediaModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .takeUntil(this.destroy$)
        .subscribe((docs) => {
          this.setMediaItemsToUi(docs);

        });
    } else if (str === "html") {
      const start = str;
      const end = str + "\uf8ff";

      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("media", (ref) =>
          ref.orderBy("type").startAt(start).endAt(end)
        )
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as MediaModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .takeUntil(this.destroy$)
        .subscribe((docs) => {
          docs = docs.filter((x) => x.forecastdays == undefined);
          this.setMediaItemsToUi(docs);

        });
    } else if (str === "widget") {
      const start = "html";
      const end = "html";

      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("media", (ref) =>
          ref.orderBy("type").startAt(start).endAt(end)
        )
        .snapshotChanges()
        .pipe(
          map((actions) =>
            actions.map((a) => {
              const data = a.payload.doc.data() as MediaModel;
              const id = a.payload.doc.id;
              return { id, ...data };
            })
          )
        )
        .takeUntil(this.destroy$)
        .subscribe((docs) => {
          docs = docs.filter((x) => x.forecastdays != undefined);
          this.setMediaItemsToUi(docs);

        });
    } else {
      this.items = null;
    }
  }

  open3(EditDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(EditDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }
  openUploadDialog(UploadDialog: TemplateRef<any>) {
    var closeOnBackdropClick = false;
    this.dialogRef = this.dialogService.open(UploadDialog, {
      closeOnBackdropClick,
      context: "",
    });
  }

  openWWWDialog(wwwDialog: TemplateRef<any>) {
    this.webLength = "10";
    this.webName = "";
    this.webUrl = "";
    this.dialogRef = this.dialogService.open(wwwDialog, { context: "" });
  }
  openWeatherDialog(weatherDialog: TemplateRef<any>) {
    this.dialogRef = this.dialogService.open(weatherDialog, { context: "" });
  }

  onSinageFeedSubmit() {
    this.mediaLoading = true;
    this.httpClient
      .get(
        `https://europe-west1-${environment.firebase.projectId}.cloudfunctions.net/getSinageFeed`
      )
      .toPromise()
      .then((data) => {
        if (data == "Updated") {
          this.mediaLoading = false;
          this.toastrService.success(
            "Sinage Media Updated Successfully",
            "Sinage Data Updated"
          );
        }
      });
  }

  openWidgetDialog(widgetDialog: TemplateRef<any>) {
    this.dialogRef = this.dialogService.open(widgetDialog, {
      context: "will do this design later!",
    });
  }

  open2(dialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(dialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }

  async delete(item: MediaModel) {
    // item.path=""

    //also check if it was video delete it from Compression server
    if (item.type.includes("video")) {
      const doc: any = await this.httpClient
        .post(
          "https://europe-west1-" + environment.firebase.projectId + ".cloudfunctions.net/compressionDelete",
          {
            url: item.url,
          }
        )
        .toPromise();

      console.log(doc);
      //null if no doc in db , deleted string if video is deleted, else sent the doc
      if (doc && doc.compressionInProgess && doc.compressionInProgess == true) {
        this.toastrService.danger(
          "File is in compression Delete it after some time",
          "Under compression"
        );
        return;
      }
    }

    let deleteFlag = true;
    this.mediaUsedPlayList.forEach((playlist) => {
      if (deleteFlag && item.type !== "html") {
        let delteFromStoage = playlist.media.filter((x) => x.url == item.url);

        delteFromStoage.forEach((dS) => {
          console.log(dS.path);
          this.storage.storage.ref(dS.path).delete();
        });
        deleteFlag = false;
      }

      playlist.media = playlist.media.filter((x) => x.url != item.url);
      this.TotalHrs = 0;
      this.TotalMin = 0;
      this.TotalSec = 0;
      this.TotalMilSec = 0;
      this.searchValue = "";
      playlist.media.forEach((element) => {
        playlist.previewTime = this.AddSecondsToTime(element.length).toString();
      });
      if (playlist.media.length == 0) {
        playlist.previewTime = "0";
      }

      if (playlist.creationDate && playlist.creationDate.seconds) {
        playlist.creationDate = moment(
          playlist.creationDate.seconds * 1000
        ).toDate();
      } else if (
        playlist.creationDate &&
        typeof playlist.creationDate == "string"
      ) {
        playlist.creationDate = moment(playlist.creationDate).toDate();
      }

      if (playlist.ExpiryDate && playlist.ExpiryDate.seconds) {
        playlist.ExpiryDate = moment(
          playlist.ExpiryDate.seconds * 1000
        ).toDate();
      } else if (
        playlist.ExpiryDate &&
        typeof playlist.ExpiryDate == "string"
      ) {
        playlist.ExpiryDate = moment(playlist.ExpiryDate).toDate();
      }

      console.log("Updating playlist", playlist.id);

      this.afs
        .collection("restaurants")
        .doc(this.restaurant.id)
        .collection("playlist")
        .doc(playlist.id)
        .set(playlist);
    });

    //if it was in playlist it was deleted if it wasn't it will be deleted now

    this.media = this.afs
      .collection("restaurants")
      .doc(this.restaurant.id)
      .collection("media");
    if (deleteFlag && item.type !== "html") {
      this.storage.storage.ref(item.path).delete();
      deleteFlag = false;
    }
    this.media
      .doc(item.id)
      .delete()
      .then(() => {
        this.dialogRef.close(); // close dialog
        this.toastrService.success(
          "File deleted successfully",
          "Delete file"
        );
      });
    if (['image/jpeg', 'image/jpeg', 'image/bmp', 'image/tiff', 'image/png', 'video/mp4', 'video/quicktime'].includes(item.type)) {
      this.afs.collection("restaurants").doc(this.restaurant.id).update({ usedStorageLimit: this.restaurant.usedStorageLimit - (parseInt(item.size) / (1024 * 1024)) });
    }
  }

  AddSecondsToTime(seconds: string) {
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
    return this.TotalSec;
  }

  deleteMedia(DeleteDialog: TemplateRef<any>, item: any) {
    this.afs
      .collection("restaurants")
      .doc(this.restaurant.id)
      .collection("playlist")
      .valueChanges()
      .pipe(take(1))
      .subscribe((playlist) => {
        this.mediaUsedPlayList = [];
        playlist.forEach((p) => {
          let mediafound = p.media.filter((x) => x.url == item.url);
          if (mediafound.length > 0) {
            this.mediaUsedPlayList.push(p);
          }
        });
        this.dialogRef = this.dialogService.open(DeleteDialog, {
          context: JSON.parse(JSON.stringify(item)),
        });
      });
  }

  open(PreviewDialog: TemplateRef<any>, data: MediaModel) {
    //whenever preview clear the interval
    clearInterval(this.interval);
    this.reinitPaginationVariables();
    if (data.type == "html" && !data.url.includes("https://")) {
      data.url = `https://${data.url}`
    }

    this.dialogService
      .open(PreviewDialog, {
        context: JSON.parse(JSON.stringify(data)),
      })
      .onClose.subscribe(() => {
        clearInterval(this.interval);
        clearInterval(this.multiPageAgendaInterval);
        this.reinitPaginationVariables();
      });
  }

  dataURItoBlob(dataURI) {
    const byteString = window.atob(dataURI);
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const int8Array = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
      int8Array[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([int8Array], { type: "image/jpeg" });
    return blob;
  }

  clearFilesList() {
    this.files = [];
    this.SortBy = "";
    this.cancelUpload();
  }

  onSelectFile(event) {
    if (event.target.files && event.target.files.length > 0) {
      let i: number = 0;
      this.value = [];
      for (const singlefile of event.target.files) {
        if (this._validFileExtensions.includes(singlefile.type)) {
          this.reader = new FileReader();
          this.reader.readAsDataURL(singlefile); // read file as data url
          const file = singlefile;
          this.files.push(singlefile);
          this.value.push(0);
          i++;
          this.reader.onload = (eventFile: any) => {
            // called once readAsDataURL is completed

            var base64 = eventFile.target.result;
          };
        } else {
          this.toastrService.danger("Invalid File Formate", "Error");
        }
      }
    }
  }

  notSupported(item) {
    this.toastrService.danger(
      " Only 2K and 4K file resolutions are supported. File resolution not supported of " +
      item.name +
      ".",
      "Not Supported"
    );
  }
  UploadFirstCall() {
    console.log("before")

    if (this.files.length == 0) {
      this.toastrService.danger("No File Selected", "Media Error");
      return;
    }
    const allFilesSizes = this.files
      .map((x) => x.size / (1024 * 1024)) // Convert each file size to MB
      .reduce((a, b) => a + b, 0); // Sum up the sizes
    if ((allFilesSizes + this.restaurant.usedStorageLimit) > this.restaurant.storageAllowed) {
      this.toastrService.danger("Storage limit exceeded", "Media Error");
      return;
    }
    console.log("before")
    this.uploadFlag = true;
    this.FileIndex = 0;
    console.log("file")

    this.uploadToFirebase(this.files[0]);
  }

  cancelUpload() {
    this.ngUnsubscribeUploading.next(false);
    this.uploadFlag = false;
  }

  CancelUploadingCheck(cancelUploadingCheck: TemplateRef<any>, item: any) {
    var closeOnBackdropClick = false;
    this.dialogService
      .open(cancelUploadingCheck, { closeOnBackdropClick })
      .onClose.subscribe((data) => {
        if (data == "Yes") {
          this.clearFilesList();
          this.cancelUpload();
          this.toastrService.danger("File Upload Canceled");
        }
      });
  }

  async uploadToFirebase(file: any) {
    try {
      if (
        this.files != null &&
        this.files != undefined &&
        this.files.length > 0
      ) {
        this.change = true;
        this.mediaFile = Object.assign({}, new MediaModel());
        this.mediaFile.id = this.afs.createId();

        let tempNameArr = file.name.split(".");
        let tempName = file.name.replace(
          tempNameArr[tempNameArr.length - 1],
          ""
        );
        tempName = tempName.replace("-", " ");
        tempName = tempName.replace("_", " ");

        tempName = tempName.replace(/[^a-zA-Z0-9 ]/g, "");
        tempName = tempName + " " + new Date().getTime();

        this.mediaFile.name =
          tempName + "." + tempNameArr[tempNameArr.length - 1];
        this.mediaFile.size = file.size;
        this.mediaFile.type = file.type;
        this.mediaFile.user_id = this.user.id;
        this.mediaFile.creationDate =
          this._firebaseTimeService.firebaseServerTime();
        this.mediaFile.length = "10";
        this.mediaFile.width = 0;
        this.mediaFile.height = 0;
        this.mediaFile.thumbnailPath = "";

        //if user is in a folder then add the folder id to the file
        if (this.currentFolder) {
          console.log(this.currentFolder)
          this.mediaFile.folderBelongsTo = this.currentFolder.id
        }

        if (
          this.mediaFile.type === "video/mp4" ||
          this.mediaFile.type === "video/quicktime"
        ) {
          const imageName = this.mediaFile.id + "_thumbnail" + ".jpeg";
          this.videoService.generateThumbnail(file).then((thumbnailData) => {
            this.compressFile(thumbnailData.base64).then((compressData) => {
              this.thumbnailData = compressData;
              this.thumbnailData = this.thumbnailData.replace(
                "data:image/png;base64,",
                ""
              );
              this.mediaFile.width = thumbnailData.width;
              this.mediaFile.height = thumbnailData.height;
              this.mediaFile.length = thumbnailData.length;
              const imageBlob = this.dataURItoBlob(
                this.thumbnailData.toString()
              );
              const imageFile = new File([imageBlob], imageName, {
                type: "image/jpeg",
              });
              const thumbnailPath = `mediafiles/${this.mediaFile.id
                }/${new Date().getTime()}_${imageName}`;
              this.mediaFile.thumbnailPath = thumbnailPath;
              const thumbnailRef = this.storage.ref(thumbnailPath);
              // The main task
              this.thumbnailTask = this.storage.upload(
                thumbnailPath,
                imageFile,
                {
                  customMetadata: {
                    mediaID: this.mediaFile.id,
                    companyID: this.restaurant.id,
                  },
                }
              );
              this.thumbnailTask
                .snapshotChanges()
                .takeUntil(this.ngUnsubscribeUploading)
                .pipe(
                  finalize(() => {
                    thumbnailRef
                      .getDownloadURL()
                      .takeUntil(this.ngUnsubscribeUploading)
                      .subscribe(async (thumbURL) => {
                        this.mediaFile.thumbnailURL = thumbURL;
                        this.uploadSecondCall(file);
                      });
                  })
                )
                .takeUntil(this.ngUnsubscribeUploading)
                .subscribe(() => { });
            });
          });
        } else {
          this.uploadSecondCall(file);
        }
      }
    } catch (ex) { }
  }

  uploadSecondCall(file) {
    try {
      const filePath = `mediafiles/${this.mediaFile.id
        }/${new Date().getTime()}_${this.mediaFile.name}`;
      this.mediaFile.path = filePath;
      const fileRef = this.storage.ref(filePath);
      this.task = this.storage.upload(filePath, file, {
        customMetadata: { mediaID: this.mediaFile.id, companyID: this.restaurant.id },
      });
      this.task
        .percentageChanges()
        .takeUntil(this.ngUnsubscribeUploading)
        .subscribe((res) => {
          this.setValue(res.toFixed(0));
        });

      this.task
        .snapshotChanges()
        .takeUntil(this.ngUnsubscribeUploading)
        .pipe(
          finalize(() => {
            fileRef
              .getDownloadURL()
              .takeUntil(this.ngUnsubscribeUploading)
              .subscribe(async (url) => {
                this.mediaFile.url = url;
                this.mediaFile.length = this.mediaFile.length.toString();
                await this.afs
                  .collection("restaurants")
                  .doc(this.restaurant.id)
                  .collection("media")
                  .doc(this.mediaFile.id)
                  .set(this.mediaFile)
                  .then(() => {
                    this.addFileSizeToCompany(this.restaurant.id, file.size);
                    this.change = false;
                    this.files.splice(0, 1);
                    this.toastrService.success(
                      "Files uploaded successfully",
                      "Upload file"
                    );
                    this.uploadToFirebase(this.files[0]);
                    if (this.files.length == 0) {
                      this.dialogRef.close();
                    }
                  });
                if (this.files.length == 0) {
                  this.uploadFlag = false;
                  this.dialogRef.close();
                }
              });
          })
        )
        .takeUntil(this.ngUnsubscribeUploading)
        .subscribe(() => { });
    } catch (ex) { }
  }

  async addFileSizeToCompany(companyId, size) {
    this.afs.collection("restaurants").doc(companyId).update({ usedStorageLimit: (size / (1024 * 1024)) + (this.restaurant.usedStorageLimit || 0) });
  }
  websiteToFirebase() {
    debugger;
    if (this.webUrl.match(/^http:\/\//)) {
      this.toastrService.danger("http URL not allowed", "Website Media");
      return;
    }
    // this.mediaFile.id = this.afs.createId();
    // this.mediaFile.name ='sdsd'
    // this.mediaFile.path = `mediafiles/${this.mediaFile.id}/${new Date().getTime()}_${this.mediaFile.name}`;
    this.mediaFile = new MediaModel();
    this.mediaFile.id = this.afs.createId();
    this.mediaFile.type = "html";
    this.mediaFile.creationDate =
      this._firebaseTimeService.firebaseServerTime();

    let tempName = this.webName.replace("-", " ");
    tempName = tempName.replace("_", " ");
    tempName = tempName.replace(/[^a-zA-Z0-9 ]/g, "");
    tempName = tempName + " " + new Date().getTime();

    this.mediaFile.name = tempName;
    this.mediaFile.length = this.webLength;
    this.mediaFile.user_id = this.user.id;
    this.mediaFile.url = this.webUrl;
    this.mediaFile.width = 3840;
    this.mediaFile.height = 2160;

    this.afs
      .collection("restaurants")
      .doc(this.restaurant.id)
      .collection("media")
      .doc(this.mediaFile.id)
      .set(Object.assign({}, this.mediaFile));
    this.toastrService.success(
      "Website file uploaded successfully",
      "Upload file"
    );
    this.dialogRef.close();
  }

  onDisplayModeChange(mode: number): void {
    this.displayMode = mode;
  }

  updateMediaItem(media: MediaModel) {
    this.afs
      .collection("restaurants")
      .doc(this.restaurant.id)
      .collection("media")
      .doc(media.id)
      .update(media);
    this.toastrService.success("Media item updated", "Update media");
  }

  get status() {
    if (this.value[this.FileIndex] <= 25) {
      return "danger";
    } else if (this.value[this.FileIndex] <= 50) {
      return "warning";
    } else if (this.value[this.FileIndex] <= 75) {
      return "info";
    } else {
      return "success";
    }
  }

  setValue(newValue) {
    this.value[this.FileIndex] = Math.min(Math.max(newValue, 0), 100);
  }

  SortUploadFiles(event) {
    if (
      this.files != null &&
      this.files !== undefined &&
      this.files.length > 0
    ) {
      if (this.SortBy === "name") {
        this.files = this.files.sort((a, b) => (a.name > b.name ? 1 : -1));
      }
      if (this.SortBy === "type") {
        this.files = this.files.sort((a, b) => (a.type > b.type ? 1 : -1));
      }
      if (this.SortBy === "size") {
        this.files = this.files.sort((a, b) => (a.size > b.size ? 1 : -1));
      }
    }
  }

  toggleDisplay() {
    if (this.isshow == false) {
      this.isshow = !this.isshow;
    }
    if (this.isnotshow == true) {
      this.isnotshow = !this.isnotshow;
    }
  }
  onclose() {
    this.isshow = false;
    this.isnotshow = true;
  }
  AddImage(addImageDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(addImageDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }
  widgetPreview(widgetPreviewDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(widgetPreviewDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }
  widgetPreviewCurrentweather(
    currentweatherwidgetPreviewDialog: TemplateRef<any>,
    item: any
  ) {
    this.dialogService.open(currentweatherwidgetPreviewDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }
  widgetPreviewfourdayweather(
    fourdayweatherwidgetPreviewDialog: TemplateRef<any>,
    item: any
  ) {
    this.dialogService.open(fourdayweatherwidgetPreviewDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }
  widgetedit(widgetEditDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(widgetEditDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }

  reinitPaginationVariables() {
    clearInterval(this.multiPageAgendaInterval);
    this.paginateGap = 8;
    this.paginationAgendaStartingIndex = -8;
    this.multiplePagesInAgenda = false;
    this.multiPageAgendaInterval = null;
  }


  /**
   * @description opens Template editing tab in new tab
   * @param item
   * @returns void
   */
  editTemplate(item: MediaModel) {
    const url = "http://" + environment.firebase.ip + ":3000/?templateId=" + item.id;
    window.open(url, "_blank");
  }

  /**
   * opens modal to add a folder
   */

  openAddFolderModal(AddFolderDialog: TemplateRef<any>) {
    this.dialogRef = this.dialogService.open(AddFolderDialog, {
      context: "",
    });
  }
  /**
   * this acctually creates the folder in the db and validates the input
   */
  createFolder() {
    if (this.newFolderName == "") {
      this.toastrService.danger("Folder Name Can't be empty", "New Folder");
      return;
    }
    if (this.allFolders.map(x => x.name).includes(this.newFolderName)) {
      this.toastrService.danger("Folder Already Exists", "New Folder");
      return;
    }
    this.afs.collection("restaurants").doc(this.restaurant.id).collection("folders").add({
      name: this.newFolderName,
      user_id: this.user.id,
    } as MediaFolder).then((doc) => {
      doc.update({
        id: doc.id
      }).then(() => {
        this.getAllFolders(this.user.id);
        this.toastrService.success("Folder Created Successfully", "New Folder");
        this.dialogRef.close();
        this.newFolderName = "";
      })
    })

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
    this.items = currentFolderItems;
    this.tempitems = this.items;
    this.setPage(1);
  }


  /**
   * gets the folder media items
   */
  getFolderItems(folder: MediaFolder) {
    return this.copyMediaAll.filter((x) => {
      if (folder == null) {
        return !x.folderBelongsTo || x.folderBelongsTo == ""
      }
      //if folderId is empty then show all items  that are not in a folder else show the media to crosponding folders
      return !x.folderBelongsTo && folder.id == "" || x.folderBelongsTo == folder.id;
    });
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
    this.items = currentFolderItems;
    this.tempitems = this.items;
    this.setPage(1);
  }

  /**
   * this function will go back from a folder to the home screen
   */
  backFolder() {
    this.currentFolder = null;
    this.items = JSON.parse(JSON.stringify(this.copyMediaAll.filter(x => !x.folderBelongsTo || x.folderBelongsTo == "")));
    this.tempitems = this.items;
    this.setPage(1);
  }

  deleteFolderShowModal(DeleteFolder: TemplateRef<any>, folder: MediaFolder) {
    this.dialogRef = this.dialogService.open(DeleteFolder, {
      context: folder,
    });
  }

  /**
   * delete folder
   */
  deleteFolder(folder: MediaFolder) {
    const mediaItems = this.getFolderItems(folder);
    mediaItems.forEach(async (media) => {
      this.delete(media)
    });
    this.afs.collection("restaurants").doc(this.restaurant.id).collection("folders").doc(folder.id).delete().then(() => {
      this.getAllFolders(this.user.id)
    })
    this.dialogRef.close();
    this.toastrService.success("folder Deleted", "folder")
  }


  getRemainingSpace() {
    return ((this.restaurant.storageAllowed || 0) - (this.restaurant.usedStorageLimit || 0)).toFixed(2)
  }
}

