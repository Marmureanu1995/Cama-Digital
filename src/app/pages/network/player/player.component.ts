import {
  Component,
  ElementRef,
  Input,
  NgModule,
  NgZone,
  TemplateRef,
  ViewChild,
} from "@angular/core";
import { AngularFireAuth } from "@angular/fire/auth";
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from "@angular/fire/firestore";
import { NbDialogService, NbToastrService } from "@nebular/theme";
import { TranslateService } from "@ngx-translate/core";
import { Observable, Subject } from "rxjs";
import { map, take, takeUntil } from "rxjs/operators";
import { ChannelModel } from "../../../model/channel.model";
import { CompanyModel } from "../../../model/companyModel";
import { NetworkDeviceModel } from "../../../model/networkDevice";
import { screenshotModel } from "../../../model/screenshot.model";
import { UserModel } from "../../../model/user.model";
import { FirebaseService } from "../../../services/firebase.service";

import * as moment from "moment";
import { UserStatistics } from "../../../model/userstatistics.model";
import { TimeZones } from "../../../../constants/timezones";

import { MapsAPILoader, MouseEvent } from "@agm/core";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";

import { Select2Data } from "ng-select2-component";
import { MediaModel } from "../../../model/media.model";
import { PlaylistModel } from "../../../model/playlist.model";

//so that we have interval and ss for each player
type IntervalObject = {
  [key: string]: NodeJS.Timer;
};

type ImageObject = {
  [key: string]: string;
};

type progressBarObject = {
  [key: string]: boolean;
};

type progressValue = {
  [key: string]: number;
};

@Component({
  selector: "ngx-player",
  templateUrl: "./player.component.html",
  styleUrls: ["./player.component.scss"],
})
export class PlayerComponent {
  destroy$: Subject<boolean> = new Subject<boolean>();
  private channels: AngularFirestoreCollection<any>;
  private Players: AngularFirestoreCollection<NetworkDeviceModel>;
  channelsID: any;
  PlayersList: any;
  networkDev = {} as NetworkDeviceModel;
  preChannelID: string;
  restaurant = {} as CompanyModel;
  AllPlayerList: NetworkDeviceModel[];
  playerId: any;
  private eventsubscription: any;
  @Input() events: Observable<void>;
  //@Input() pl_length : number;
  user = {} as UserModel;
  playerlimit: boolean = false;
  oldHexCode: string = "";
  isOnline: boolean = false;
  lastContacted: string;
  playerVersion: string = "";
  progressValue: progressValue = {};
  showProgressBar: progressBarObject = {};
  imagePath: ImageObject = {};
  interval: IntervalObject = {};
  timeZoneItems: { value: string; label: string }[] = TimeZones;
  dialogRef: any;
  // google maps zoom level
  zoom: number = 12;

  // initial center position for the map
  lat: number | null = null;
  lng: number | null = null;
  address: string = "";
  playlists: PlaylistModel[] = [];
  private geoCoder;

  locationModalHidden: boolean = true;
  @ViewChild("LocationSearch")
  public searchElementRef: ElementRef;
  @Input('media') media: MediaModel[];

  mapClicked($event: MouseEvent) {
    (this.lat = $event.coords.lat),
      (this.lng = $event.coords.lng),
      this.getAddress($event.coords.lat, $event.coords.lng);
  }

  marker: { lat: number; lng: number } | null = null;

  constructor(
    public translate: TranslateService,
    private firebaseservice: FirebaseService,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth,
    private toastrService: NbToastrService,
    private dialogService: NbDialogService,
    private modalService: NgbModal,
    private mapsAPILoader: MapsAPILoader,
    private ngZone: NgZone
  ) {
    this.networkDev = new NetworkDeviceModel();
    this.afAuth.authState.subscribe((res) => {
      if (res && res.uid) {
        this.afs
          .collection("users")
          .doc<UserModel>(res.uid)
          .get()
          .subscribe((userDoc) => {
            this.user = userDoc.data() as UserModel;
            this.restaurant.id = this.user.companyID;

            this.channels = this.afs
              .collection("restaurants")
              .doc(this.restaurant.id)
              .collection("channel");
            this.channels
              .snapshotChanges()
              .pipe(
                map((actions) =>
                  actions.map((a) => {
                    const data = a.payload.doc.data() as any;
                    const id = a.payload.doc.id;
                    // console.error(data);
                    return { id, ...data };
                  })
                )
              )
              .subscribe((docs) => {
                this.channelsID = docs;
              });

            this.Players = this.afs
              .collection("restaurants")
              .doc(this.restaurant.id)
              .collection("networkDevices");
            this.getPlaylists()
            this.PlayersList = this.Players.snapshotChanges()
              .pipe(
                map((actions) =>
                  actions.map((a) => {
                    const data = a.payload.doc.data() as NetworkDeviceModel;
                    const id = a.payload.doc.id;
                    // console.error(data);
                    return { id, ...data };
                  })
                )
              )
              .subscribe((querySnapshot) => {
                this.AllPlayerList = querySnapshot;
              });
          });
      }
    });

    // console.error('constructor');
    this.networkDev.id = "";
    this.networkDev.playerName = "";
    this.networkDev.hexCode = "";
    this.networkDev.connectionInterval = 1;
    this.networkDev.timeZone = "";
    this.networkDev.channelID = "";
    this.networkDev.videoCheck = false;
    this.networkDev.audioCheck = false;
    this.networkDev.activeCheck = false;
  }

  ngOnDestroy() {
    console.log("clearing interval");
    clearInterval(this.interval[this.playerId]);
    this.destroy$.unsubscribe();
  }

  ngOnInit(): void {
    this.clearplayermodel();


    // this.initilizeMapSearch();
    this.eventsubscription = this.events.subscribe((playerId) => {
      //if block runs when u click on any player. else runs when u click on add.
      if (playerId != undefined && playerId != null) {
        this.playerId = playerId;
        this.networkDev = this.AllPlayerList.find((t) => t.id == this.playerId);
        this.oldHexCode = this.networkDev.hexCode;
        this.preChannelID = this.networkDev.channelID;

        if (this.networkDev.location != null) {
          this.lat = this.networkDev.location.lat;
          this.lng = this.networkDev.location.lng;
          if (this.networkDev.location.address !== undefined) {
            this.address = this.networkDev.location.address;
          } else {
            this.address = this.getAddress(this.lat, this.lng);
          }
        } else {
          this.networkDev.location = null;
        }

        // check if the time zone exisits in the list
        let timeZone = this.timeZoneItems.find(
          (e) => e.value == this.networkDev.timeZone
        );
        //if not exists then add it to the list
        if (timeZone == undefined) {
          this.timeZoneItems.push({
            value: this.networkDev.timeZone,
            label: this.networkDev.timeZone,
          });
        }

        this.networkDev.timeZone = this.networkDev.timeZone;

        //online offline status
        if (!Object.keys(this.imagePath).includes(this.playerId))
          this.imagePath[this.playerId] =
            "../../../../assets/images/screenshot.jpeg";
        if (!this.progressValue[this.playerId]) {
          this.progressValue[this.playerId] = 0;
        }

        if (!this.showProgressBar[this.playerId]) {
          this.showProgressBar[this.playerId] = false;
        }

        this.afs
          .collection("networkDevices")
          .doc(this.playerId)
          .collection("userstatistics")
          .doc(this.playerId)
          .snapshotChanges().takeUntil(this.destroy$)
          .subscribe((doc) => {
            if (doc.payload.exists) {
              const nh = doc.payload.data() as UserStatistics;
              console.log("DOC EXISTS", nh);
              this.isOnline = nh.isOnline;
              console.log(moment(nh.lastContacted));
              this.lastContacted = moment(nh.lastContacted).format(
                "DD/MM/YYYY HH:mm"
              );
              this.playerVersion = nh.playerVersion;
            } else {
              this.isOnline = false;
              this.lastContacted = "N/A";
              this.playerVersion = "N/A";
            }
          });
      } else {
        this.oldHexCode = "";
        this.clearplayermodel();
      }
    });
  }

  getPlaylists() {
    console.log(this.restaurant.id)
    this.firebaseservice.getPlayList(this.restaurant.id).takeUntil(this.destroy$).subscribe((querySnapshot) => {
      console.log(querySnapshot)
      this.playlists = querySnapshot as PlaylistModel[];
    });
  }

  getAddress(latitude: number, longitude: number) {
    var tempaddres = "";
    this.geoCoder.geocode(
      { location: { lat: latitude, lng: longitude } },
      (results, status) => {
        if (status === "OK") {
          if (results[0]) {
            this.zoom = 12;
            results.forEach((r) => {
              if (
                !r.types.includes("plus_code") &&
                !r.types.includes("premise") &&
                !r.formatted_address.includes("+")
              ) {
                tempaddres += r.formatted_address + " ";
              }
            });
            this.address = tempaddres;
          } else {
            console.log("No results found");
          }
        } else {
          console.log("Geocoder failed due to: " + status);
        }
      }
    );
    return tempaddres;
  }

  updateTimezone(event: any) {
    this.networkDev.timeZone = event;
  }

  openMediaSelectDialog(mediaSelectDialog) {
    this.dialogRef = this.dialogService.open(
      mediaSelectDialog,
      { context: {} });
  }

  initilizeMapSearch() {
    //google map search functionality
    this.mapsAPILoader.load().then(() => {
      // this.setCurrentLocation();
      this.geoCoder = new google.maps.Geocoder();

      let autocomplete = new google.maps.places.Autocomplete(
        this.searchElementRef.nativeElement
      );

      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          //get the place result
          let place: google.maps.places.PlaceResult = autocomplete.getPlace();

          //verify result
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }

          //set latitude, longitude and zoom
          this.lat = place.geometry.location.lat();
          this.lng = place.geometry.location.lng();
          this.address = this.searchElementRef.nativeElement.value;
          this.zoom = 12;
        });
      });
    });
  }
  closeModal() {
    this.locationModalHidden = true;
  }

  SaveLocation() {
    if (this.lat != null && this.lng != null && this.address != "") {
      this.networkDev.location = {
        lat: this.lat,
        lng: this.lng,
        address: this.address,
      };
      if (this.oldHexCode !== "") {
        this.saveNetworkDevice(this.networkDev);
      }
      this.closeModal();
    } else {
      this.toastrService.danger(
        "Please select a point on map, location cannot Be empty",
        "Invalid Location Value"
      );
    }
  }
  saveNetworkDevice(network: NetworkDeviceModel) {
    network.connectionInterval = 1; //hard coded
    let connectionIntervalFormat =
      /^[a-zA-Z!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]*$/;
    if (
      network.playerName == null ||
      network.playerName == undefined ||
      network.playerName == ""
    ) {
      this.toastrService.danger("Network name must be Entered", "Empty Name");
      return;
    } else if (network.hexCode === null || network.hexCode === undefined) {
      this.toastrService.danger(
        "Hex-Code cannot Be empty",
        "Invalid HexCode Value"
      );
      return;
    } else if (network.hexCode.includes("-") || network.hexCode.includes(" ")) {
      this.toastrService.danger(
        "Hex-Code cannot contain negative values",
        "Invalid HexCode Value"
      );
      return;
    } else if (!network.playlistId) {
      this.toastrService.danger(
        "Please Select a Playlist",
        "Error"
      );
      return;
    } else if (
      connectionIntervalFormat.test(network.connectionInterval.toString())
    ) {
      this.toastrService.danger(
        "Connection Interval can only contain numbers",
        "Invalid Connection Interval Value"
      );
      return;
    } else if (
      network.timeZone === null ||
      network.timeZone === undefined ||
      network.timeZone == ""
    ) {
      this.toastrService.danger(
        "Atleast One Time Zone Must Be Selected",
        "Empty TimeZone"
      );
      return;
    }

    if (network.id != undefined) {
      network.companyID = this.restaurant.id;

      if (
        network.playerName !== "" &&
        network.hexCode !== "" &&
        network.timeZone !== ""
      )
        this.afs
          .collection("restaurants")
          .doc(this.restaurant.id)
          .collection("networkDevices")
          .doc(network.id)
          .update(network);
      this.afs.collection("networkDevices").doc(network.id).update(network);

      this.toastrService.success(
        "Player Updated successfully",
        "Update Player"
      );
    } else {
      this.afs
        .collection("networkDevices", (ref) =>
          ref.where("hexCode", "==", network.hexCode)
        )
        .valueChanges()
        .pipe(take(1))
        .subscribe((data) => {
          if (data.length != 0) {
            data.forEach((net: any, index) => {
              this.afs
                .collection("networkDevices")
                .doc(net.id)
                .delete()
                .then(() => {
                  this.afs
                    .collection("restaurants")
                    .doc(net.companyID)
                    .collection("networkDevices")
                    .doc(net.id)
                    .delete()
                    .then(() => {
                      if (data.length - 1 == index) {
                        this.addnewplayer(network);
                      }
                    });
                });
            });
          } else {
            this.addnewplayer(network);
          }
        });
      this.clearplayermodel();
    }
  }
  addnewplayer(network: NetworkDeviceModel) {
    if (this.firebaseservice.PlayerLimit == this.firebaseservice.playerLength) {
      this.toastrService.danger(
        "The restaurant players has reached its max limit",
        "Create Player"
      );
    } else if (
      this.firebaseservice.PlayerLimit > this.firebaseservice.playerLength
    ) {
      network.id = this.afs.createId();
      network.companyID = this.restaurant.id;
      let networkAdd = Object.assign({}, network);
      if (
        network.playerName !== "" &&
        network.hexCode !== "" &&
        network.timeZone !== ""
      )
        this.afs
          .collection("restaurants")
          .doc(this.restaurant.id)
          .collection("networkDevices")
          .doc(networkAdd.id)
          .set(networkAdd);
      this.afs.collection("networkDevices").doc(networkAdd.id).set(networkAdd);

      this.toastrService.success(
        "Player created successfully",
        "Create Player"
      );
    } else {
      this.toastrService.danger(
        "The restaurant players has reached its max limit",
        "Create Player"
      );
    }
  }

  clearplayermodel() {
    console.log("Clearing player model");
    this.networkDev = new NetworkDeviceModel();
    this.networkDev.channelID = "";
  }
  channelSelected() {
    console.log("Channel change");
    let selectedChannel = this.channelsID.find(
      (e) => e.id == this.networkDev.channelID
    );
    if (selectedChannel.playlist.length == 0) {
      this.toastrService.danger("Empty channel not allowed", "Empty Channel");
      this.networkDev.channelID = null;
    }
  }
  onStatusClick(status: string) {
    console.log("Clicked on:", status);
    // Here you can add any logic you want to perform when the status is clicked.
  }

  takescreenshot(PreviewDialog: TemplateRef<any>) {
    this.showProgressBar[this.playerId] = false;
    console.log("clearing interval");
    clearInterval(this.interval[this.playerId]); //delete old intervals
    this.showProgressBar[this.playerId] = true;
    this.progressValue[this.playerId] = 0;
    this.animateProgressBar();

    this.afs
      .collection("screenshots")
      .doc(this.networkDev.hexCode)
      .get()
      .takeUntil(this.destroy$)
      .subscribe((screenshotdoc) => {
        let oldNumber: number;
        if (screenshotdoc.data()) {
          const screenShotDocument = screenshotdoc.data() as screenshotModel;
          oldNumber = screenShotDocument.screenshotNumber;

          const newDocument = {
            screenshotNumber: oldNumber + 1,
            url: "",
            takeScreenShot: true,
          } as screenshotModel;
          this.afs
            .collection("screenshots")
            .doc(this.networkDev.hexCode)
            .update(newDocument);
        } else {
          oldNumber = 0;
          const newDocument = {
            screenshotNumber: oldNumber + 1,
            url: "",
            takeScreenShot: true,
          } as screenshotModel;
          this.afs
            .collection("screenshots")
            .doc(this.networkDev.hexCode)
            .set(newDocument);
        }

        const subscription = this.afs
          .collection("screenshots")
          .doc(this.networkDev.hexCode)
          .valueChanges()
          .pipe(takeUntil(this.destroy$))
          .subscribe((docData) => {
            if (docData) {
              const ssDocument = docData as screenshotModel;
              if (ssDocument.url !== "") {
                console.log("GOT IMAGE", ssDocument.url);
                this.showProgressBar[this.playerId] = false;
                this.imagePath[this.playerId] = ssDocument.url;
                console.log("clearing interval");
                clearInterval(this.interval[this.playerId]);
              }
            }
          });
      });
  }

  animateProgressBar() {
    //each step will take 0.1 seconds
    //10 steps will take 1 second
    const increment = 1; // Increment 1 by 1
    console.log("clearing interval");

    clearInterval(this.interval[this.playerId]);
    this.interval[this.playerId] = setInterval(() => {
      if (this.progressValue[this.playerId] < 100) {
        this.progressValue[this.playerId] += increment;
      } else {
        clearInterval(this.interval[this.playerId]);
        this.showProgressBar[this.playerId] = false; // Hide the progress bar
        this.toastrService.danger(
          "The TV Device is offline right now",
          "Failed!"
        );
      }
    }, 100);
  }

  resolutionChange($event, key) {
    if (!this.networkDev.playerSetting) {
      this.networkDev.playerSetting = {
        resolution: {},
      };
    }
    if (!this.networkDev.playerSetting.resolution) {
      this.networkDev.playerSetting.resolution = {};
    }
    // Move this line inside the condition where you're sure `resolution` exists
    this.networkDev.playerSetting.resolution[key] = $event.target.value;
  }

  offsetChange($event, key) {
    console.log(this.networkDev)
    if (!this.networkDev.playerSetting) {
      this.networkDev.playerSetting = {
        offset: {},
      };
    }
    if (!this.networkDev.playerSetting.offset) {
      this.networkDev.playerSetting.offset = {};
    }
    // Move this line outside the else block
    this.networkDev.playerSetting.offset[key] = $event.target.value;
  }

  screenInfoChange($event, key) {
    if (!this.networkDev.screenInfo) {
      this.networkDev.screenInfo = {};
    }
    this.networkDev.screenInfo[key] = $event.target.value;
  }
  checkFitStatus(val) {
    if (this.networkDev.playerSetting && this.networkDev.playerSetting.fit) {
      return this.networkDev.playerSetting.fit === val;
    }
    return false;
  }
  fitChange($event) {
    if (!this.networkDev.playerSetting) this.networkDev.playerSetting = { fit: '' };
    this.networkDev.playerSetting.fit = $event.target.value;
  }
  onTransitionChange($event) {
    if (!this.networkDev.playerSetting) {
      this.networkDev.playerSetting = {

      }
    }
    this.networkDev.playerSetting.transition = $event.target.value;
  }
  changePlayerMedia(item: MediaModel) {
    this.networkDev.assignedMedia = item;
  }
  async saveAssignedMediaPlayer() {
    await this.afs
      .collection("restaurants")
      .doc(this.restaurant.id)
      .collection("networkDevices")
      .doc(this.networkDev.id)
      .update({ assignedMedia: this.networkDev.assignedMedia });
    await this.afs.collection("networkDevices").doc(this.networkDev.id)
      .update({ assignedMedia: this.networkDev.assignedMedia });
    this.dialogRef.close();
    this.toastrService.success("Media Assigned Successfully", "Table")
  }
}
