import { Component, OnInit, TemplateRef } from "@angular/core";
import { NbDialogService } from "@nebular/theme";
import { UserModel } from "../../../model/user.model";
import { finalize, map, catchError } from "rxjs/operators";
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from "@angular/fire/firestore";
import {
  AngularFireStorage,
  AngularFireUploadTask,
} from "@angular/fire/storage";
import { AngularFireAuth } from "@angular/fire/auth";
import { CompanyModel } from "../../../model/companyModel";
import { HttpClient } from "@angular/common/http";
import { ChannelPlaylistModel } from "../../../model/channel.model";
import { NbToastrService } from "@nebular/theme";
import { PaginationService } from "../../../services/pagination.service";
import { SortPipe } from "../../../pipes/sort.pipe";
import { TranslateService } from "@ngx-translate/core";
import { environment } from "../../../../environments/environment";
import { of } from "rxjs";

@Component({
  selector: "ngx-users",
  templateUrl: "./users.component.html",
  styleUrls: ["./users.component.scss"],
})
export class UsersComponent implements OnInit {
  private allUsers: AngularFirestoreCollection<UserModel>;
  items: any;
  media: any;
  message: any;
  newUser = {} as UserModel;
  filename: string;
  reader = new FileReader();
  files: any;
  dialogRef: any;
  dialogRef1: any;
  task: AngularFireUploadTask;
  file: any;
  restaurant = {} as CompanyModel;
  emailexitmessage: string = "";
  emailAlreadyExist: boolean = false;
  usernameexistmessage: string = "";
  usernameAlreadyExist: boolean = false;
  addLoading: boolean = false;
  assignPlaylistCheck: boolean;
  Userslist: any[];
  tempUsersList: any[];
  users: any;
  user = {} as UserModel;
  userList: Array<any> = [];
  query: any;
  selectedDay: string = "";
  playLists: Array<ChannelPlaylistModel> = [];
  assignPlay: string[];
  challdata: boolean;
  pagination: any = {};
  pagedItems: any[];
  constructor(
    public translate: TranslateService,
    private _paginationService: PaginationService,
    private dialogService: NbDialogService,
    private afs: AngularFirestore,
    private storage: AngularFireStorage,
    private httpclient: HttpClient,
    private afAuth: AngularFireAuth,
    private toastrService: NbToastrService,
    private sortPipe: SortPipe
  ) {
    this.challdata = false;
    this.assignPlay = [];
    this.query = "";
  }

  ngOnInit() {
    this.afAuth.authState.subscribe((res) => {
      if (res && res.uid) {
        // this.afs.collection('restaurants').doc<CompanyModel>(res.uid).get().subscribe(companyDoc => {
        //   this.restaurant = companyDoc.data() as CompanyModel;
        // console.error(this.restaurant);
        this.afs
          .collection("users")
          .doc<UserModel>(res.uid)
          .get()
          .subscribe((userDoc) => {
            this.user = userDoc.data() as UserModel;
            this.restaurant.id = this.user.companyID;

            this.afs
              .collection("restaurants")
              .doc(this.restaurant.id)
              .valueChanges()
              .subscribe((data) => {
                this.restaurant = data as CompanyModel;
              });

            // this.allUsers = this.afs.collection('restaurants').doc(this.restaurant.id).collection('users');
            this.allUsers = this.afs.collection("users");
            this.items = this.allUsers
              .snapshotChanges()
              .pipe(
                map((actions) =>
                  actions.map((a) => {
                    const data = a.payload.doc.data() as UserModel;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                  })
                )
              )
              .subscribe((querySnapshot) => {
                // console.error('Data',  this.playlistMedia);
                this.userList = querySnapshot;
                this.userList = this.userList.filter(
                  (t) => t.companyID === this.restaurant.id
                );
                this.userList = this.sortPipe.transform(
                  this.userList,
                  "username"
                );
                this.tempUsersList = this.userList;
                this.setPage(1);
                // this.emptyplaylistMedia[0] = this.playlistMedia[0];
              });
            this.newUser = new UserModel();
            // console.error(this.newUser);

            // Fetch Playlists
            this.afs
              .collection("restaurants")
              .doc(this.restaurant.id)
              .collection("playlist")
              .snapshotChanges()
              .pipe(
                map((actions) =>
                  actions.map((a) => {
                    const data = a.payload.doc.data() as ChannelPlaylistModel;
                    const id = a.payload.doc.id;
                    return { id, ...data };
                  })
                )
              )
              .subscribe((querySnapshot) => {
                this.playLists = querySnapshot;
              });
          });
      }
    });
  }
  setPage(page: number) {
    // Get pagination object from service
    this.pagination = this._paginationService.getPagination(
      this.userList.length,
      page
    );
    if (page < 1 || page > this.pagination.totalPages) {
      return;
    }
    // Get current page of items
    this.pagedItems = this.userList.slice(
      this.pagination.startIndex,
      this.pagination.endIndex + 1
    );
  }
  onSelectFile(event) {
    if (event.target.files && event.target.files[0]) {
      this.reader.readAsDataURL(event.target.files[0]); // read file as data url
      this.file = event.target.files[0];
      this.filename = this.file.name;
      // console.error(this.file);

      this.reader.onload = (eventFile: any) => {
        // called once readAsDataURL is completed
        /*this.url = eventFile.target.result;*/
      };
    }
  }
  selectChangeHandler(event: any) {
    //update the ui
    this.selectedDay = event.target.value;
  }
  async createUser() {
    console.log(this.newUser);
    this.addLoading = true;
    this.newUser.assignedplaylist = this.assignPlay;
    if (this.newUser.firstName == "") {
      this.addLoading = false;
      this.toastrService.danger("Enter First Name", "Create User");
      return;
    } else if (this.newUser.lastName == "") {
      this.addLoading = false;
      this.toastrService.danger("Enter First Name", "Create User");
      return;
    } else if (this.newUser.username == "") {
      this.addLoading = false;
      this.toastrService.danger("Enter Username", "Create User");
      return;
    } else if (this.newUser.email == "") {
      this.addLoading = false;
      this.toastrService.danger("Enter Email", "Create User");
      return;
    } else if (
      !this.newUser.email.match(
        "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
      )
    ) {
      this.addLoading = false;
      this.toastrService.danger("Enter Valid Email", "Create User");
      return;
    } else if (this.newUser.phone == "") {
      this.addLoading = false;
      this.toastrService.danger("Enter Phone  Number", "Create User");
      return;
    } else if (this.newUser.pass == "" || this.newUser.confirmPass == "") {
      this.addLoading = false;
      this.toastrService.danger(
        "Enter password and confirm password",
        "Create User"
      );
      return;
    }
    else if (this.newUser.pass.length < 6) {

    }


    else if (this.newUser.pass !== this.newUser.confirmPass) {
      this.addLoading = false;
      this.toastrService.danger(
        "Password and confirm password should be same",
        "Create User"
      );
      return;
    } else if (this.newUser.role == "") {
      this.addLoading = false;
      this.toastrService.danger("Please,Select Role", "Role");
      return;
    } else if (
      this.newUser.access_media == undefined &&
      this.newUser.role == "user"
    ) {
      this.addLoading = false;
      this.toastrService.danger("Must Select Access User Media", "User Media");
      return;
    } else if (this.emailAlreadyExist && this.usernameAlreadyExist) {
      this.addLoading = false;
      return;
      // this.emailexitmessage = "Already created account with this Email.";
    } else if (
      this.newUser.media == false &&
      this.newUser.channel == false &&
      this.newUser.playlist == false &&
      this.newUser.role == "user"
    ) {
      this.addLoading = false;
      this.toastrService.danger("Please select user role", "User Role");
      return;
    } else {
      this.message = "";
      this.httpclient
        .get(
          `https://europe-west1-${environment.firebase.projectId}.cloudfunctions.net/addUser?email=${this.newUser.email}&pass=${this.newUser.pass}`
        )
        .pipe(
          catchError((error) => {
            console.error('Error in HTTP request:', error);
            this.toastrService.danger(error.error.message, 'Error');
            this.addLoading = false;
            return of(null); // Return a null observable to continue the stream
          })
        )
        .subscribe((data: any) => {
          this.newUser.id = data.uid;
          this.newUser.companyID = this.restaurant.id;

          if (this.filename) {
            const filePath = `userfiles/${this.newUser.id
              }/${new Date().getTime()}_${this.filename}`;
            this.newUser.path = filePath;

            const fileRef = this.storage.ref(filePath);

            // The main task
            this.task = this.storage.upload(filePath, this.file, {
              customMetadata: { userID: this.newUser.id },
            });

            this.task
              .snapshotChanges()
              .pipe(
                finalize(() => {
                  fileRef.getDownloadURL().subscribe(async (url) => {
                    this.newUser.picURL = url;
                    // console.error(url);
                    // console.error(this.newUser);
                    await this.afs
                      .collection("users")
                      .doc(this.newUser.id)
                      .set(Object.assign({}, this.newUser));
                  });
                })
              )
              .subscribe();
          } else {
            // await this.afs.collection('restaurants').doc(this.restaurant.id)
            //   .collection('users').doc(this.newUser.id).set(Object.assign({}, this.newUser));
            this.afs
              .collection("users")
              .doc(this.newUser.id)
              .set(Object.assign({}, this.newUser));
          }
          this.dialogRef.close();

          this.addLoading = false;
        });
    }
  }

  reset() {
    this.newUser = new UserModel();
  }
  edit(EditDialog: TemplateRef<any>, item: any) {
    this.filename = "";
    this.emailexitmessage = "";
    this.emailAlreadyExist = false;
    this.usernameexistmessage = "";
    this.usernameAlreadyExist = false;
    this.dialogRef = this.dialogService.open(EditDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }
  add(AddDialog: TemplateRef<any>, item: any) {
    this.newUser = new UserModel();
    this.filename = "";
    this.emailexitmessage = "";
    this.emailAlreadyExist = false;
    this.usernameexistmessage = "";
    this.usernameAlreadyExist = false;
    this.dialogRef = this.dialogService.open(AddDialog, { context: item });
  }
  delete(DeleteDialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(DeleteDialog, { context: item });
  }

  deleteUser(item: UserModel) {
    this.dialogRef.close();
    this.httpclient
      .get(
        `https://europe-west1-${environment.firebase.projectId}.cloudfunctions.net/deleteAuthentication?email=${item.email}`
      )
      .subscribe((res) => {
        // console.error(res);
        if (res === "delete success") {
          this.allUsers
            .doc(item.id)
            .delete()
            .then(() => {
              // console.log('deleted');
              this.toastrService.success("User Deleted Successfully", "User");
              if (item.path) {
                this.storage.ref(item.path).delete();
              }
            });
        }
      });
  }
  async updateUser(item: UserModel) {
    item.assignedplaylist = this.assignPlay;
    if (item.pass !== item.confirmPass) {
      this.message = "Password and confirm password should be same";
    } else {
      this.message = "";
      if (this.filename) {
        this.storage.ref(item.path).delete();

        const filePath = `userfiles/${item.id}/${new Date().getTime()}_${this.filename
          }`;
        item.path = filePath;

        const fileRef = this.storage.ref(filePath);

        // The main task
        this.task = this.storage.upload(filePath, this.file, {
          customMetadata: { userID: item.id },
        });

        this.task
          .snapshotChanges()
          .pipe(
            finalize(() => {
              fileRef.getDownloadURL().subscribe(async (url) => {
                item.picURL = url;
                // console.error(url);
                // console.error(this.newUser);
                // await this.afs.collection('restaurants').doc(this.restaurant.id).collection('users').doc(item.id).update(item);
                await this.afs.collection("users").doc(item.id).update(item);
              });
            })
          )
          .subscribe();
      } else {
        // await this.afs.collection('restaurants').doc(this.restaurant.id).collection('users').doc(item.id).update(item);
        await this.afs.collection("users").doc(item.id).update(item);
      }
      this.dialogRef.close();
    }
  }
  openplaylist(PlaylistDialog: TemplateRef<any>, item: UserModel) {
    this.playLists.forEach((doc) => {
      if (typeof item.assignedplaylist != "undefined") {
        let index = item.assignedplaylist.indexOf(doc.id);
        if (index >= 0) {
          doc.state = true;
        } else {
          doc.state = false;
        }
      } else {
        doc.state = false;
      }
    });
    this.dialogRef1 = this.dialogService.open(PlaylistDialog);
  }
  AssignPlaylistToUser() {
    this.assignPlay = [];
    this.playLists.forEach((doc) => {
      if (doc.state == true) {
        this.assignPlay.push(doc.id);
      }
    });
    this.dialogRef1.close();
  }
  checkAlldata() {
    if (this.challdata) {
      this.playLists.forEach((doc) => {
        doc.state = true;
      });
    } else {
      this.playLists.forEach((doc) => {
        doc.state = false;
      });
    }
  }
  CheckAlreadyExist(item: UserModel) {
    this.users = this.afs
      .collection("users")
      .snapshotChanges()
      .pipe(
        map((actions) =>
          actions.map((a) => {
            const data = a.payload.doc.data() as any;
            const id = a.payload.doc.id;
            return { id, ...data };
          })
        )
      )
      .subscribe((querySnapshot) => {
        this.Userslist = querySnapshot;
        if (this.Userslist.length > 0) {
          this.emailAlreadyExist = false;
          this.emailexitmessage = "";
          this.usernameAlreadyExist = false;
          this.usernameexistmessage = "";
          this.Userslist.forEach((single) => {
            if (
              item.email != null &&
              item.email !== undefined &&
              item.email.includes(".")
            ) {
              if (single.email === item.email) {
                this.emailAlreadyExist = true;
                this.emailexitmessage =
                  "Already created account with this Email.";
              }
            }
            if (
              item.username.match(
                "^(?!.*\\.\\.)(?!.*\\.$)[^\\W][\\w.]{0,29}$"
              ) == null
            ) {
              this.usernameAlreadyExist = true;
              this.usernameexistmessage =
                "Username can only contain letters, numbers, underscore and dot";
            } else if (single.username === item.username) {
              this.usernameAlreadyExist = true;
              this.usernameexistmessage =
                "Already created account with this username.";
            }
          });
        }
      });
  }
  userSearch() {
    if (this.query.length > 0) {
      this.userList = this.tempUsersList.filter(
        (t) =>
          t.firstName.toLowerCase().includes(this.query.toLowerCase()) ||
          t.username.toLowerCase().includes(this.query.toLowerCase()) ||
          t.email.toLowerCase().includes(this.query.toLowerCase()) ||
          (t.phone != undefined
            ? t.phone.toLowerCase().includes(this.query.toLowerCase())
            : false) ||
          (t.lastName != undefined
            ? t.lastName.toLowerCase().includes(this.query.toLowerCase())
            : false) ||
          (t.role != undefined
            ? t.role.toLowerCase().includes(this.query.toLowerCase())
            : false)
      );
      this.setPage(1);
    } else {
      this.userList = this.tempUsersList;
      this.setPage(1);
    }
  }
}
