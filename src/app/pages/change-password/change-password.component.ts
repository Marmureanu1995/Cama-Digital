import { HttpClient } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { NbDialogRef, NbToastrService } from '@nebular/theme';
import { TranslateService } from '@ngx-translate/core';
import { map, take } from 'rxjs/operators';
import { CompanyModel } from '../../model/companyModel';
import { UserModel } from '../../model/user.model';
import { FirebaseService } from '../../services/firebase.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent implements OnInit {
  currentPassowrd: any = '';
  newPassword: any = '';
  confirmPassword: any = '';
  restaurant: any;
  user: UserModel;
  changePasswordLoading: boolean = false;
  constructor(public translate: TranslateService, private afAuth: AngularFireAuth, public ref: NbDialogRef<ChangePasswordComponent>, private httpclient: HttpClient, public toastrService: NbToastrService, private firebaseservice: FirebaseService, private afs: AngularFirestore) { }

  ngOnInit() {
    this.getUserDetail();
  }

  getUserDetail() {
    this.changePasswordLoading = true;
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('users').doc<UserModel>(res.uid).get().subscribe(userDoc => {
          this.user = userDoc.data() as UserModel;
          this.changePasswordLoading = false;
          this.getCompanyDetail(this.user);
        });
      }
    });
  }

  getCompanyDetail(user) {
    this.changePasswordLoading = true;
    this.afs.collection('restaurants').doc<CompanyModel>(user.companyID).get().subscribe(companyDoc => {
      this.restaurant = companyDoc.data() as CompanyModel;
      this.changePasswordLoading = false;
    });
  }

  updatePassword() {
    if (this.currentPassowrd.length == 0 || this.confirmPassword.length == 0 || this.newPassword.length == 0) {
      this.toastrService.danger('Empty Field', 'Error');
      return;
    }
    else if (this.user.pass != this.currentPassowrd) {
      this.toastrService.danger('Invalid current password ', 'Error');
      return;
    }
    else if (this.newPassword != this.confirmPassword) {
      this.toastrService.danger('New and Confirm Password not matched', 'Error');
      return;
    }
    else {
      this.changePasswordLoading = true;
      this.httpclient
        .get(`https://europe-west1-${environment.firebase.projectId}.cloudfunctions.net/changePass?email=${this.user.email}&pass=${this.newPassword}`)
        .subscribe((res) => {
          this.firebaseservice.updateuserpass(this.newPassword, this.user, this.restaurant);
          this.ref.close("");
          this.toastrService.success('Password Updated', "Password");
          this.changePasswordLoading = false;
          if (this.user.email === this.restaurant.email) {
            this.firebaseservice.updatecompanypass(this.newPassword, this.user, this.restaurant);
          }
        });
    }

  }

  close() {
    this.ref.close("");
  }


}
