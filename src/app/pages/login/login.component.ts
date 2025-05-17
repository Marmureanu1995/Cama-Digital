import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyModel } from '../../model/companyModel';
import { AngularFireAuth } from '@angular/fire/auth';
import { UserModel } from '../../model/user.model';
import { map } from 'rxjs/operators';
import { AngularFirestore } from '@angular/fire/firestore';
import { NbToastrService } from '@nebular/theme';
import { take } from 'rxjs/operators';
import { CommonserviceService } from "../../commonservice/commonservice.service";
import { Subscription } from "rxjs";
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';
import { FirebaseService } from '../../services/firebase.service';
import { NgForm } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
/* export const allroutes: Routes = [
  { path: 'channel', component: ChannelComponent},
];*/
@Component({
  selector: 'ngx-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  closeResult = '';
  resetemail: string;
  email: string = '';
  email1: string;
  password: string;
  message: string;
  user: any;
  restaurant = {} as CompanyModel;
  loader: boolean = false;
  loading: boolean = false;
  usernameCheck: boolean = false;
  usernameCheck1: string;
  CurrentCompany = {} as CompanyModel;
  companyidfromcompanySub: Subscription;
  adminUser = {} as UserModel;
  errMsg: string;
  selectedItemNgModel: any;
  constructor(private firebaseservice: FirebaseService, private modalService: NgbModal, private router: Router, private afAuth: AngularFireAuth, private afs: AngularFirestore,
    public toastrService: NbToastrService, private _CommonserviceService: CommonserviceService, public translate: TranslateService) {
    this.errMsg = '';
    this.resetemail = '';
    this.companyidfromcompanySub = this._CommonserviceService.getCompany().subscribe(clicked => {
      this.CurrentCompany.id = clicked;
      console.log(this.CurrentCompany.id)
      if (JSON.parse(window.localStorage.getItem('alternateLogin1')) && this.CurrentCompany.id) {
        this.afs.collection('restaurants').doc(this.CurrentCompany.id).get().subscribe(companyDoc => {
          this.CurrentCompany = companyDoc.data() as CompanyModel;
          console.log(this.CurrentCompany)
          if (JSON.parse(window.localStorage.getItem('superAdmin'))) {
            this.adminUser = JSON.parse(window.localStorage.getItem('superAdmin'));
            window.localStorage.setItem('loginMsg', this.adminUser.username + ' is logged in as: ' + this.CurrentCompany.username);
          }
          this.continueLogin(this.CurrentCompany.email, this.CurrentCompany.pass, true);
        });
      }
    });
    const browserLang = translate.getBrowserLang();
    if (localStorage.getItem('Lang') != null) {
      translate.setDefaultLang(localStorage.getItem('Lang'));
      translate.use(localStorage.getItem('Lang'));
      this.selectedItemNgModel = localStorage.getItem('Lang');
    }
    else {
      translate.use('English');
    }
  }
  ResetPassword() {
    //console.log(this.resetemail);
    if (this.resetemail == '') {
      this.errMsg = 'Enter Email';
      /*this.toastrService.danger('Enter Email','Forgot');*/
    }
    else {
      this.afAuth.auth.sendPasswordResetEmail(this.resetemail).then(
        () => {
          this.toastrService.success("Sent Email", "Reset");
          this.modalService.dismissAll();
          this.resetemail = '';
        },
        err => {
          console.log(err);
          if (err.code === 'auth/user-not-found') {
            /*this.toastrService.danger('There is no user record corresponding to this email. The user may have been deleted.', 'Forgot')*/
            this.errMsg = 'There is no user record corresponding to this email. The user may have been deleted.';
          } else {
            /*this.toastrService.danger(err,'Forgot');*/
            this.errMsg = err.message;
          }
        }
      );
    }

  }
  openemailmodal(content) {
    this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then((result) => {
      this.closeResult = `Closed with: ${result}`;
    }, (reason) => {
      this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
    });
  }

  private getDismissReason(reason: any): string {
    if (reason === ModalDismissReasons.ESC) {
      return 'by pressing ESC';
    } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
      return 'by clicking on a backdrop';
    } else {
      return `with: ${reason}`;
    }
  }
  getUserUsingUsername() {
    this.email = this.email.trim();
    if (this.email.match('^(?!.*\\.\\.)(?!.*\\.$)[^\\W][\\w.]{0,29}$')) {
      this.usernameCheck = true;
    } else {
      this.usernameCheck = false;
    }
  }

  login() {
    if (!this.email) {
      this.toastrService.danger('Enter Username', 'Login');
    } else if (!this.password) {
      this.toastrService.danger('Enter Password', 'Login');
    }

    if (this.usernameCheck) {
      this.email = this.email.trim();
      this.afs.collection('users',
        ref => ref.where('username', '==', this.email))
        .snapshotChanges().pipe(take(1),
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as UserModel;
            const id = a.payload.doc.id;
            return { id, ...data };
          }))
        ).subscribe(doc => {
          if (doc[0]) {
            this.email1 = doc[0].email;
          }
          if (!this.email1) {
            this.toastrService.danger("Wrong Username!", "Login");
          }
          else if (!this.password) {
            this.toastrService.danger("Wrong Password!", "Login");
          }
          this.continueLogin(this.email1, this.password, false);
        })
    } else {
      this.email1 = this.email.trim();
      this.continueLogin(this.email1, this.password, false);
    }
  }
  continueLogin(email, pass, alternateLogin) {
    this.message = '';
    // this.router.navigate(['/media']);
    try {
      const result = this.afAuth.auth.signInWithEmailAndPassword(email, pass);
      this.loader = true;
      result.then(resolve => {

        this.afAuth.authState.pipe(take(1)).subscribe(res => {
          if (res && res.uid) {
            localStorage.setItem('userId', res.uid);
            if (alternateLogin) {

            } else {
              this.toastrService.success("Successfull", "Login");
            }
            this.afs.collection('users').doc<UserModel>(res.uid).get().subscribe(userDoc => {

              this.user = userDoc.data() as UserModel;
              console.log(this.user);
              console.log(userDoc);
              console.log(userDoc.data());


              this.restaurant.id = this.user.companyID;
              this.afs.collection('restaurants').doc(this.user.companyID).get().subscribe(companyDoc => {
                this.restaurant = companyDoc.data() as CompanyModel;
                if (pass == this.user.pass) {
                }
                else {
                  this.firebaseservice.updateuserpass(pass, this.user, this.restaurant)
                }

                if (email == this.restaurant.email) {
                  this.firebaseservice.updatecompanypass(pass, this.user, this.restaurant);
                }

                this.firebaseservice.updateAllMedia(this.restaurant.id);
                if (this.restaurant.isActive === true) {
                  if (!alternateLogin) {
                    this.afs.collection('users').doc(this.user.id).update({
                      lastLogin: moment().toDate()
                    });
                  }
                  this.loader = false;
                  if (this.user.channel == false && this.user.media == true && this.user.playlist == false) {
                    this.router.navigate(['pages/dashboard']);
                  }
                  else
                    this.router.navigate(['/pages/dashboard']);

                }
                else {
                  if (!alternateLogin) {
                    this.loader = false;
                    this.loading = true;
                    this.router.navigate(['']);
                    this.toastrService.danger('The restaurant has been disabled by Super Admin', "Login");
                    this.afAuth.auth.signOut().then(() => {
                      this.router.navigate(['']);
                    });
                  } else {
                    this.loader = false;
                    this.loading = true;
                    if (this.user.channel == false && this.user.media == true && this.user.playlist == false) {
                      this.router.navigate(['/pages/dashboard']);
                    }
                    else
                      this.router.navigate(['/pages/dashboard']);
                  }
                }
              });


            });

          }
        });
      }).catch(reason => {
        this.loader = false;

        reason.message = reason.message.replace('or the user does not have a password', '');
        reason.message = reason.message.replace("identifier", "email");

        this.toastrService.danger(reason.message, "Login");
      });
    } catch (e) {
    }
  }
  dialogclose(form: NgForm) {
    this.errMsg = '';
    this.modalService.dismissAll();
    this.resetemail = '';

  }
  setLang(langSelect) {
    this.translate.use(langSelect.value);
    localStorage.setItem('Lang', langSelect.value);
  }


  languageChanged() {
    this.translate.use(this.selectedItemNgModel);
    localStorage.setItem('Lang', this.selectedItemNgModel);
  }


}
