import { Overlay } from '@angular/cdk/overlay';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { AngularFireStorage, AngularFireUploadTask } from '@angular/fire/storage';
import { NbDialogRef, NbToastrService } from '@nebular/theme';
import { TranslateService } from '@ngx-translate/core';
import { finalize, map, take } from 'rxjs/operators';
import { CompanyModel } from '../../model/companyModel';
import { UserModel } from '../../model/user.model';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  restaurant: CompanyModel;
  user: UserModel;
  Userslist: any[];
  usernameexistmessage: string = '';
  usernameAlreadyExist: boolean = false;
  filename: string;
  task: AngularFireUploadTask;
  reader = new FileReader();
  imageUrl: any;
  file: any;
  profileLoading: boolean = false;
  constructor(private storage: AngularFireStorage, private afAuth: AngularFireAuth,
    public ref: NbDialogRef<ProfileComponent>, private httpclient: HttpClient,
    public toastrService: NbToastrService, private firebaseservice: FirebaseService,
    private afs: AngularFirestore, public overlay: Overlay, public translate: TranslateService) {
    this.user = new UserModel;
    this.restaurant = new CompanyModel;
    this.imageUrl = '/assets/images/no-preview.jpg';
  }

  ngOnInit() {
    this.getUserDetail();
  }
  getUserDetail() {
    this.profileLoading = true;
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('users').doc<UserModel>(res.uid).get().subscribe(userDoc => {
          this.user = userDoc.data() as UserModel;
          if (this.user.picURL && this.user.picURL.length > 0) {
            this.imageUrl = this.user.picURL;
          }
          this.getCompanyDetail(this.user);
        });
      }
    });
  }
  update() {
    if (this.user.username.length == 0 || this.user.firstName.length == 0 || this.user.email.length == 0) {
      this.toastrService.danger('Empty Field', 'Error');
      return;
    }
    else {
      if (this.filename) {
        this.profileLoading = true;
        const filePath = `userfiles/${this.user.id}/${new Date().getTime()}_${this.filename}`;
        this.user.path = filePath;
        const fileRef = this.storage.ref(filePath);
        // The main task
        this.task = this.storage.upload(filePath, this.file, { customMetadata: { userID: this.user.id } });

        this.task.snapshotChanges().pipe(
          finalize(() => {
            fileRef.getDownloadURL().pipe(take(1)).subscribe(async url => {
              this.user.picURL = url;
              await this.afs.collection('users').doc(this.user.id).set(Object.assign({}, this.user));
              this.imageUrl = url;
              this.updateUser();
              this.ref.close("");
              this.toastrService.success('Profile Updated', "Profile update");
              if (this.user.email === this.restaurant.email) {
                this.updateChannel();
              }
              this.profileLoading = false;
            });
          })).subscribe(() => {
          });
      }
      else {
        this.profileLoading = true;
        this.updateUser();
        this.toastrService.success('Profile Updated', "Profile update");
        if (this.user.email === this.restaurant.email) {
          this.updateChannel();
          this.ref.close("");
          this.profileLoading = false;
        }
      }
    }
  }
  updateUser() {
    this.afs.collection('users').doc(this.user.id).update(this.user);
  }
  updateChannel() {
    this.restaurant.username = this.user.username;
    this.restaurant.path = this.user.path;
    this.restaurant.picURL = this.user.picURL;
    this.afs.collection('restaurants').doc(this.user.companyID).update(this.restaurant);
  }
  onSelectFile(event) {
    if (event.target.files && event.target.files[0]) {
      this.reader.readAsDataURL(event.target.files[0]);
      this.file = event.target.files[0];
      this.filename = this.file.name;
      this.reader.onload = (eventFile: any) => {
        this.imageUrl = this.reader.result;
      };
    }
  }
  getCompanyDetail(user) {
    this.afs.collection('restaurants').doc<CompanyModel>(user.companyID).get().subscribe(companyDoc => {
      this.restaurant = companyDoc.data() as CompanyModel;
      this.profileLoading = false;
    });
  }
  CheckAlreadyExist(item: UserModel) {
    if (this.user.username.length == 0)
      return;
    else {
      this.afs.collection('users').snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as any;
          const id = a.payload.doc.id;
          return { id, ...data };
        })),
      ).subscribe((querySnapshot) => {
        this.Userslist = querySnapshot;
        if (this.Userslist.length > 0) {
          this.usernameAlreadyExist = false;
          this.usernameexistmessage = '';
          this.Userslist.forEach(single => {
            if (item.username.match('^(?!.*\\.\\.)(?!.*\\.$)[^\\W][\\w.]{0,29}$') == null) {
              this.usernameAlreadyExist = true;
              this.usernameexistmessage = 'Username can only contain letters, numbers, underscore and dot';
            }
            else if (single.username === item.username) {
              this.usernameAlreadyExist = true;
              this.usernameexistmessage = 'Already created account with this username.';
            }
          });
        }
      });
    }
  }
  cancel() {
    this.ref.close('');
  }
}
