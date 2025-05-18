import { Component, OnInit, TemplateRef } from "@angular/core";
import { NbDialogService, NbToastrService } from "@nebular/theme";
import { CompanyModel } from "../../../model/companyModel";
import { finalize, map } from "rxjs/operators";
import {
  AngularFirestore,
  AngularFirestoreCollection,
} from "@angular/fire/firestore";
import { HttpClient } from "@angular/common/http";
import {
  AngularFireStorage,
  AngularFireUploadTask,
} from "@angular/fire/storage";
import { UserModel } from "../../../model/user.model";
import { Router } from "@angular/router";
import { Subject } from "rxjs";
import { CommonserviceService } from "../../../commonservice/commonservice.service";
import { AngularFireAuth } from "@angular/fire/auth";
import { PaginationService } from "../../../services/pagination.service";
import { SortPipe } from "../../../pipes/sort.pipe";
import { TranslateService } from "@ngx-translate/core";
import { environment } from "../../../../environments/environment";
import * as moment from "moment";

@Component({
  selector: "ngx-partner-users",
  templateUrl: "./users.component.html",
  styleUrls: ["./users.component.scss"],
})
export class PartnersUsersComponent implements OnInit {
  private allPartners: AngularFirestoreCollection<UserModel>;
  items: any;
  tempItems: any;
  message: any;
  newCompany = {} as CompanyModel;
  dialogRef: any;
  baseURL = `https://europe-west1-${environment.firebase.projectId}.cloudfunctions.net/addUser`;
  filename: string;
  reader = new FileReader();
  files: any;
  task: AngularFireUploadTask;
  file: any;
  currentUser = {} as UserModel;
  restaurants: any;
  companieslist: any[];
  allUsers: any;
  userslist: any[];
  emailexitmessage: string = "";
  emailAlreadyExist: boolean = false;
  usernameexistmessage: string = "";
  usernameAlreadyExist: boolean = false;
  addLoading: boolean = false;
  query: any;
  user = {} as UserModel;
  IS_SUPER_ADMIN: boolean = false;
  oldPass: string;
  pagination: any = {};
  pagedItems: any[];
  private eventCompany: Subject<void> = new Subject<void>();
  constructor(
    public translate: TranslateService,
    private _paginationService: PaginationService,
    private dialogService: NbDialogService,
    private afs: AngularFirestore,
    private httpclient: HttpClient,
    private storage: AngularFireStorage,
    private router: Router,
    private toastrService: NbToastrService,
    private _CommonserviceService: CommonserviceService,
    private afAuth: AngularFireAuth,
    private sortPipe: SortPipe
  ) {
    this.allPartners = this.afs.collection("users");
    this.allPartners
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
      .subscribe((docs) => {
        this.items = docs;
        console.log(this.items)
        this.items = this.items.filter((item: UserModel) => {
          return item.role === "Partner";
        })
        this.items = this.sortPipe.transform(this.items, "username");
        this.tempItems = this.items;
        this.setPage(1);
      });

    this.newCompany = new CompanyModel();
    // console.error(this.newCompany);
    this.query = "";
  }

  ngOnInit() {
    this.afAuth.authState.subscribe((res) => {
      if (res && res.uid) {
        this.afs
          .collection("users")
          .doc<UserModel>(res.uid)
          .get()
          .subscribe((userDoc) => {
            this.user = userDoc.data() as UserModel;
            if (this.user != null && this.user !== undefined) {
              if (this.user.role === "Super Admin") {
                this.IS_SUPER_ADMIN = true;
              }
            }
          });
      }
    });
  }

  setPage(page: number) {
    // Get pagination object from service
    this.pagination = this._paginationService.getPagination(
      this.items.length,
      page
    );
    if (page < 1 || page > this.pagination.totalPages) {
      return;
    }
    // Get current page of items
    this.pagedItems = this.items.slice(
      this.pagination.startIndex,
      this.pagination.endIndex + 1
    );
  }

  onSelectFile(event) {
    if (event.target.files && event.target.files[0]) {
      this.reader.readAsDataURL(event.target.files[0]); // read file as data url
      this.file = event.target.files[0];
      this.filename = this.file.name;

      this.reader.onload = (eventFile: any) => { };
    }
  }
  async createCompany() {
    this.addLoading = true;
    if (this.currentUser.partnerName == "") {
      this.addLoading = false;
      this.toastrService.danger("Enter Partner Name", "Create Restaurant");
    } else if (this.newCompany.username == "") {
      this.addLoading = false;
      this.toastrService.danger("Enter Username", "Create Restaurant");
    } else if (this.newCompany.email == "") {
      this.addLoading = false;
      this.toastrService.danger("Enter Email", "Create Restaurant");
    } else if (
      !this.newCompany.email.match(
        "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
      )
    ) {
      this.addLoading = false;
      this.toastrService.danger("Enter Valid Email", "Create Restaurant");
    } else if (this.newCompany.pass == "" || this.newCompany.confirmPass == "") {
      this.addLoading = false;
      this.toastrService.danger(
        "Enter password and confirm password",
        "Create Restaurant"
      );
    } else if (
      this.newCompany.pass.length < 6 ||
      this.newCompany.confirmPass.length < 6
    ) {
      this.addLoading = false;
      this.toastrService.danger(
        "Password length must be greater than 6 characters",
        "Invalid Password Pattern"
      );
    } else if (this.newCompany.pass !== this.newCompany.confirmPass) {
      this.addLoading = false;
      this.toastrService.danger(
        "Password and confirm password should be same",
        "Create Restaurant"
      );
    } else if (
      !this.usernameAlreadyExist
    ) {
      this.message = "";
      this.httpclient
        .get(
          this.baseURL +
          `?name=${this.newCompany.name}&email=${this.newCompany.email}&pass=${this.newCompany.pass}`
        )
        .subscribe((data: any) => {
          // console.error('data: ', data);
          this.newCompany.id = data.uid;
          this.newCompany.partnerId = data.uid;
          this.currentUser.id = this.newCompany.id;
          this.currentUser.companyID = this.newCompany.id;
          this.currentUser.username = this.newCompany.username;
          this.currentUser.firstName = this.newCompany.name;
          this.currentUser.email = this.newCompany.email;
          this.currentUser.pass = this.newCompany.pass;
          this.currentUser.confirmPass = this.newCompany.confirmPass;
          this.currentUser.role = "Partner";
          this.newCompany.isActive = true;
          this.newCompany.companyExpireDate = this.currentUser.partnerExpireDate
          this.currentUser.active = true;
          this.newCompany.name = this.currentUser.partnerName;
          this.newCompany.playerLimit = 9;
          if (this.filename) {
            const filePath = `companyfiles/${this.newCompany.id
              }/${new Date().getTime()}_${this.filename}`;
            this.newCompany.path = filePath;

            const fileRef = this.storage.ref(filePath);

            // The main task
            this.task = this.storage.upload(filePath, this.file, {
              customMetadata: { userID: this.newCompany.id },
            });

            this.task
              .snapshotChanges()
              .pipe(
                finalize(() => {
                  fileRef.getDownloadURL().subscribe(async (url) => {
                    this.newCompany.picURL = url;
                    // console.error(url);
                    // console.error(this.newCompany);
                    this.currentUser.path = this.newCompany.path;
                    this.currentUser.picURL = this.newCompany.picURL;
                    await this.afs
                      .collection("restaurants")
                      .doc(this.newCompany.id)
                      .set(Object.assign({}, this.newCompany));
                    this.afs
                      .collection("users")
                      .doc(this.currentUser.id)
                      .set(Object.assign({}, this.currentUser));
                  });
                })
              )
              .subscribe();
          } else {
            this.afs
              .collection("restaurants")
              .doc(this.newCompany.id)
              .set(Object.assign({}, this.newCompany));
            this.afs
              .collection("users")
              .doc(this.currentUser.id)
              .set(Object.assign({}, this.currentUser));
          }
          this.dialogRef.close();
          this.addLoading = false;
        });
    }
  }

  reset() {
    this.newCompany = new CompanyModel();
  }
  edit(EditDialog: TemplateRef<any>, item: any) {
    this.filename = "";
    this.oldPass = item.pass;
    this.dialogRef = this.dialogService.open(EditDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }
  add(AddDialog: TemplateRef<any>, item: any) {
    this.filename = "";
    this.emailexitmessage = "";
    this.emailAlreadyExist = false;
    this.newCompany = new CompanyModel();
    this.dialogRef = this.dialogService.open(AddDialog, { context: item });
  }
  delete(DeleteDialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(DeleteDialog, {
      context: JSON.parse(JSON.stringify(item)),
    });
  }

  deleteCompany(item: CompanyModel) {
    this.httpclient
      .get(
        `https://europe-west1-${environment.firebase.projectId}.cloudfunctions.net/deleteAuthentication?email=${item.email}`
      )
    // console.error(res);
    this.allPartners
      .doc(item.id)
      .delete()
      .then(() => {
        this.afs.collection("users").doc(item.id).delete();
        this.afs.collection("restaurant").doc(item.id).delete();
        if (item.path !== "") {
          this.storage.ref(item.path).delete();
        }
        // console.log('deleted');
      });
    this.dialogRef.close(); // close dialog
  }
  async updateCompany(item: any) {
    if (item.partnerName === undefined || item.partnerName === null || item.partnerName === "") {
      this.toastrService.danger("Partner Name must be Entered", "Create Restaurant");
      return;
    }
    if (item.pass !== item.confirmPass) {
      this.toastrService.danger(
        "Password and confirm password should be same",
        "Invalid Password"
      );
      return;
    } else if (item.pass.length < 6 || item.confirmPass.length < 6) {
      this.toastrService.danger(
        "Password length must be greater than 6 characters",
        "Invalid Password Pattern"
      );
    } else {
      if (this.oldPass !== item.pass) {
        this.httpclient
          .get(
            `https://europe-west1-${environment.firebase.projectId}.cloudfunctions.net/changePass?email=${item.email}&pass=${item.pass}`
          )
          .subscribe((res) => { });
      }
      this.message = "";
      this.currentUser.id = item.id;
      this.currentUser.companyID = item.id;
      this.currentUser.username = item.username;
      this.currentUser.firstName = item.partnerName;
      this.currentUser.email = item.email;
      this.currentUser.pass = item.pass;
      this.currentUser.confirmPass = item.confirmPass;
      this.currentUser.partnerExpireDate = item.partnerExpireDate;
      item.companyExpireDate = item.partnerExpireDate
      // console.error(item);

      //making the restaurant active if the user has changed the expire date

      if (this.filename) {
        const filePath = `companyfiles/${item.id}/${new Date().getTime()}_${this.filename
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

                this.currentUser.path = item.path;
                this.currentUser.picURL = item.picURL;
                this.afs
                  .collection("users")
                  .doc(this.currentUser.id)
                  .update(Object.assign({}, this.currentUser));
                await this.afs
                  .collection("restaurants")
                  .doc(item.id)
                  .update(Object.assign({}, item));
              });
            })
          )
          .subscribe();
      } else {
        this.afs
          .collection("users")
          .doc(this.currentUser.id)
          .update(Object.assign({}, this.currentUser));
        this.afs
          .collection("restaurants")
          .doc(item.id)
          .update(Object.assign({}, item));
      }
      this.dialogRef.close();
    }
  }

  CheckAlreadyExist(item: any) {
    this.allUsers = this.afs
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
        this.userslist = querySnapshot;
        if (this.userslist.length > 0) {
          this.emailAlreadyExist = false;
          this.emailexitmessage = "";
          this.usernameAlreadyExist = false;
          this.usernameexistmessage = "";
          this.userslist.forEach((single) => {
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

  opencompanychannel(item: any) {
    window.localStorage.setItem("alternateLogin1", JSON.stringify(false));
    this.router.navigate(["pages/companychannels"]);
    setTimeout(() => {
      this._CommonserviceService.SendCompany(item.id);
    }, 100);
  }

  openCompany(item: any) {
    window.localStorage.clear();
    window.localStorage.setItem("superAdmin", JSON.stringify(this.user));
    window.localStorage.setItem("alternateLogin", JSON.stringify(true));
    window.localStorage.setItem("alternateLogin1", JSON.stringify(true));
    this.router.navigate([""]);
    setTimeout(() => {
      this._CommonserviceService.SendCompany(item.id);
    }, 100);
  }
  userSearch() {
    if (this.query.length > 0) {
      this.items = this.tempItems.filter(
        (t) =>
          t.name.toLowerCase().includes(this.query.toLowerCase()) ||
          t.username.toLowerCase().includes(this.query.toLowerCase()) ||
          t.email.toLowerCase().includes(this.query.toLowerCase())
      );
      this.setPage(1);
    } else {
      this.items = this.tempItems;
      this.setPage(1);
    }
  }
}
