import { Component, ComponentRef, Input, OnInit, ViewChild, OnDestroy } from '@angular/core';

import { NbDialogService, NbMenuItem, NbMenuService, NbSidebarService } from '@nebular/theme';
import { UserData } from '../../../@core/data/users';
import { AnalyticsService } from '../../../@core/utils';
import { ActivatedRoute, Router } from '@angular/router';
import { AngularFireAuth } from '@angular/fire/auth';
import { filter, map, take } from 'rxjs/operators';
import { UserModel } from '../../../model/user.model';
import { AngularFirestore, AngularFirestoreCollection } from '@angular/fire/firestore';
import { CompanyModel } from '../../../model/companyModel';
import { ChangePasswordComponent } from '../../../pages/change-password/change-password.component';
import { ProfileComponent } from '../../../pages/profile/profile.component';
import { HeaderService } from '../../../services/header.service';
import { TitleCasePipe } from '@angular/common';
import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import { MENU_ITEMS } from '../../../pages/pages-menu';
import { Subject } from 'rxjs';
@Component({
  selector: 'ngx-header',
  styleUrls: ['./header.component.scss'],
  templateUrl: './header.component.html',
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Input() position = 'normal';

  user: any;
  restaurant = {} as CompanyModel;
  private allUsers: AngularFirestoreCollection<UserModel>;
  items: any;
  userList: Array<any> = [];
  newUser = {} as UserModel;
  selectedItem: any;
  selectedItemNgModel: any;
  menu: NbMenuItem[] = [];
  userMenu = [{ title: 'Edit Profile' }, { title: 'Change Password' }, { title: 'Log out' }];
  tempselecteditem: any;
  destroy$: Subject<boolean> = new Subject<boolean>();

  constructor(private _header: HeaderService, private dialogService: NbDialogService, private sidebarService: NbSidebarService,
    private menuService: NbMenuService, private activatedRoute: ActivatedRoute,
    private userService: UserData, private afs: AngularFirestore,
    private analyticsService: AnalyticsService, private router: Router, private afAuth: AngularFireAuth, public translate: TranslateService) {
    this._header.setcallBit = true;
    this.menu = MENU_ITEMS;
    this.tempselecteditem = [];
  }

  ngOnDestroy(): void {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  ngOnInit() {
    this.setLanguage();
    this.menuService.onItemClick().subscribe(res => {
      this.selectedItem = res.item.title;
      this.tempselecteditem = res;
    });
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {

        this.afs.collection('users').doc(res.uid).snapshotChanges().takeUntil(this.destroy$).subscribe(userDoc => {
          if (userDoc.payload.exists) {
            this.user = userDoc.payload.data() as UserModel;
            this.restaurant.id = this.user.companyID;

            this.afs
              .collection("restaurants")
              .doc(this.restaurant.id)
              .valueChanges()
              .subscribe((data) => {
                this.restaurant = data as CompanyModel;
              });

            // this.allUsers = this.afs.collection('restaurants').doc(this.restaurant.id).collection('users');
            this.allUsers = this.afs.collection('users');
            this.items = this.allUsers.snapshotChanges().pipe(
              map(actions => actions.map(a => {
                const data = a.payload.doc.data() as UserModel;
                const id = a.payload.doc.id;
                return { id, ...data };
              })),
            ).takeUntil(this.destroy$).subscribe((querySnapshot) => {
              // console.error('Data',  this.playlistMedia);
              this.userList = querySnapshot;
              this.userList = this.userList.filter(t => t.companyID === this.restaurant.id);
              // this.emptyplaylistMedia[0] = this.playlistMedia[0];
            });
            this.newUser = new UserModel();
            // console.error(this.newUser);

            this.menuService.getSelectedItem().takeUntil(this.destroy$).subscribe(res => {
              if (res && res.item)
                this.selectedItem = res.item.title;
              this.tempselecteditem = res;
            });
          }
        });
      }
      else {
        return this.afAuth.auth.signOut().then(() => {
          window.localStorage.setItem('alternateLogin1', JSON.stringify(false));
          window.localStorage.setItem('alternateLogin', JSON.stringify(false));
          window.localStorage.setItem('superAdmin', '');
          this.router.navigate(['']);
        });
      }
    });


    // this.userService.getUsers()
    //   .subscribe((users: any) => this.user = users.nick);

    this.menuService.onItemClick()
      .pipe(
        map(({ item: { title } }) => title),
      )
      .takeUntil(this.destroy$).subscribe(title => {
        if (this.selectedItem == "Edit Profile" && this._header.getcallBit == true) {
          this._header.setcallBit = false;
          this.dialogService.open(ProfileComponent).onClose.pipe(take(1)).subscribe(data => {
            this._header.setcallBit = true;
            this.selectedItem = (window.location.href).split('/')[5];
            this.selectedItem = this.toTitle(this.selectedItem);
          });
          return;

        }
        else if (this.selectedItem == 'Change Password' && this._header.getcallBit == true) {
          this._header.setcallBit = false;
          this.dialogService.open(ChangePasswordComponent).onClose.pipe(take(1)).subscribe(data => {
            this._header.setcallBit = true;
            this.selectedItem = (window.location.href).split('/')[5];
            this.selectedItem = this.toTitle(this.selectedItem);

          });
          return;
        }

        if (title === 'Log out') {
          return this.afAuth.auth.signOut().then(() => {
            window.localStorage.setItem('alternateLogin1', JSON.stringify(false));
            window.localStorage.setItem('alternateLogin', JSON.stringify(false));
            window.localStorage.setItem('superAdmin', '');
            this.router.navigate(['']);
            localStorage.setItem("previoususerid", this.user.id);
          });
        }
      });

  }
  setLanguage() {
    const browserLang = this.translate.getBrowserLang();
    if (localStorage.getItem('Lang') != null) {
      this.translate.setDefaultLang(localStorage.getItem('Lang'));
      this.translate.use(localStorage.getItem('Lang'));
      this.selectedItemNgModel = localStorage.getItem('Lang');
    }
    else {
      this.translate.use('English');
      this.selectedItemNgModel = 'English';
    }
  }

  languageChanged() {
    this.translate.use(this.selectedItemNgModel);
    if (this.tempselecteditem.item) {
      var item = this.menu.filter(x => x.link == this.tempselecteditem.item.link);
      if (item)
        this.selectedItem = this.translate.instant(item[0].title);
    }

  }

  toTitle(str) {
    return str.replace(/(^|\s)\S/g, function (t) { return t.toUpperCase() });
  }

  toggleSidebar(): boolean {
    this.sidebarService.toggle(true, 'menu-sidebar');

    return false;
  }

  goToHome() {
    this.menuService.navigateHome();
  }

  startSearch() {
    this.analyticsService.trackEvent('startSearch');
  }

}
