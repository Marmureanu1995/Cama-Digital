import { Component } from "@angular/core";
import { NbMenuItem, NbMenuService } from "@nebular/theme";
import { takeWhile } from "rxjs/operators";
import { MENU_ITEMS, TEMP_MENU_ITEMS } from "./pages-menu";
import { CommonserviceService } from "../commonservice/commonservice.service";
import { Subject, Subscription } from "rxjs";
import { UserModel } from "../model/user.model";
import { AngularFireAuth } from "@angular/fire/auth";
import { AngularFirestore } from "@angular/fire/firestore";
import { Router } from "@angular/router";

import { NbToastrService } from "@nebular/theme";
import { LangChangeEvent, TranslateService } from "@ngx-translate/core";
import { CompanyModel } from "../model/companyModel";
import { takeUntil } from "rxjs/operators";

@Component({
  selector: "ngx-pages",
  styleUrls: ["pages.component.scss"],
  template: `
    <ngx-sample-layout>
      <nb-menu tag="menu" [items]="menu"></nb-menu>
      <router-outlet></router-outlet>
    </ngx-sample-layout>
  `,
})
export class PagesComponent {
  destroy$: Subject<boolean> = new Subject<boolean>();
  menu: NbMenuItem[] = [];
  tempMenu: any;
  private alive: boolean = true;
  selectedItem: string;
  newItem: string;
  Channeltab: string = "Channels";
  Playlisttab: string = "Playlists";
  OnClickSubscribtion: Subscription;
  GetSelectedSubscribtion: Subscription;
  DefaultselectedMenuItem: string = "Channels";
  childresponse: Subscription;
  childres: boolean;
  user = {} as UserModel;
  restaurant = {} as CompanyModel;
  constructor(
    private menuService: NbMenuService,
    private router: Router,
    private afs: AngularFirestore,
    public translate: TranslateService,
    private toastrService: NbToastrService,
    private afAuth: AngularFireAuth,
    private _CommonserviceService: CommonserviceService
  ) {
    translate.addLangs(["English", "Deutsch", "Francais", "Nederlands"]);
    translate.setDefaultLang("English");

    const browserLang = translate.getBrowserLang();
    if (localStorage.getItem("Lang") != null)
      translate.use(localStorage.getItem("Lang"));
    else translate.use("English");
  }

  ngOnInit(): void {
    this.tempMenu = TEMP_MENU_ITEMS;
    this.afAuth.authState.subscribe((res) => {
      if (res && res.uid) {
        this.afs
          .collection("users")
          .doc<UserModel>(res.uid)
          .get()
          .subscribe(async (userDoc) => {
            this.user = userDoc.data() as UserModel;

            this.restaurant.id = this.user.companyID;
            this.afs
              .collection("restaurants")
              .doc(this.restaurant.id)
              .valueChanges()
              .pipe(takeUntil(this.destroy$))
              .subscribe((doc: any) => {
                //if page is not mounting and you are restaurant admin and restaurant is changed refresh page
                if (
                  this.restaurant.email &&
                  this.user.role == "admin" &&
                  this.restaurant.email == this.user.email
                ) {
                  // window.location.reload();
                }
              });


            const res = await this.afs
              .collection("restaurants")
              .doc(this.restaurant.id)
              .get()
              .toPromise();

            this.restaurant = res.data() as CompanyModel;

            this.menu = MENU_ITEMS;
            if (this.user.role == "user") {
              const pagesToHide = [
                "Network",
                "Dashboard",
                "Partners"
              ];
              pagesToHide.forEach((hide) => {
                this.menu = this.menu.filter((t) => t.title != hide);
                this.tempMenu = this.tempMenu.filter((t) => t.title != hide);
              });
            }
            if (this.user.role == "Partner") {
              console.log(this.user)

              const pagesToHide = [
                "Partners",
                "Support",

              ];
              pagesToHide.forEach((hide) => {
                this.menu = this.menu.filter((t) => t.title != hide);
                this.tempMenu = this.tempMenu.filter((t) => t.title != hide);
              });
            }


            if (this.user.role != "Super Admin" && this.user.role != "Partner") {
              this.menu = this.menu.filter((t) => t.title != "Restaurants");

              this.tempMenu = this.tempMenu.filter((t) => t.title != "Restaurants");
              this.router.navigate(["/pages/dashboard"]);
              this.checkLogin();
            }


            if (this.user.role == "admin") {
              //you are  admin
              const pagesToHide = [
                "Partners"
              ];


              pagesToHide.forEach((hide) => {
                this.menu = this.menu.filter((t) => t.title != hide);
                this.tempMenu = this.tempMenu.filter((t) => t.title != hide);
              });

            }

            if (this.user.role != "admin" && this.user.role != "Super Admin" && this.user.role != "Partner") {
              this.menu = this.menu.filter((t) => t.title != "Admin");
              this.tempMenu = this.tempMenu.filter((t) => t.title != "Admin");
              if (!this.user.channel) {
                this.menu = this.menu.filter((t) => t.title != "Channels");
                this.tempMenu = this.tempMenu.filter(
                  (t) => t.title != "Channels"
                );
                this.router.navigate(["/pages/dashboard"]);
                this.checkLogin();
              }
              if (!this.user.playlist) {
                this.menu = this.menu.filter((t) => t.title != "Playlists");
                this.tempMenu = this.tempMenu.filter(
                  (t) => t.title != "Playlists"
                );
                this.router.navigate(["/pages/dashboard"]);
                this.checkLogin();
              }
              if (!this.user.media) {
                this.menu = this.menu.filter((t) => t.title != "Media");
                this.tempMenu = this.tempMenu.filter((t) => t.title != "Media");
                this.checkLogin();
              }
            }
            if (
              !this.user.reports &&
              this.user.role != "Super Admin" &&
              this.user.role != "admin" &&
              this.user.role != "Partner"
            ) {
              this.menu = this.menu.filter(
                (t) => !t.title.toLowerCase().includes("reports")
              );
              this.tempMenu = this.tempMenu.filter(
                (t) => !t.title.toLowerCase().includes("reports")
              );
              this.checkLogin();
            }
            this.menuService.addItems(this.menu, "menu");
            this.translateMenu();
          });
      }
    });
    this.OnClickSubscribtion = this.menuService.onItemClick().subscribe(() => {
      this._CommonserviceService.ClickedOtherItem(true);
    });
    this.translate.onLangChange.subscribe((event: LangChangeEvent) => {
      //Live reload
      this.translateMenu();
      localStorage.setItem("Lang", this.translate.currentLang);
    });
  }
  checkLogin() {
    if (this.menu.length == 0) {
      this.toastrService.danger("You cannot acces the restaurant");
      this.router.navigate([""]);
    }
  }
  ngOnDestroy() {
    this.OnClickSubscribtion.unsubscribe();
  }
  translateMenu(): void {
    this.menu.forEach((menuItem: NbMenuItem, i) => {
      if (this.tempMenu[i] && this.tempMenu[i].title)
        menuItem.title = this.translate.instant(this.tempMenu[i].title);
    });
  }
}
