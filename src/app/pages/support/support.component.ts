import { Component, OnInit } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { NbToastrService } from "@nebular/theme";
import { CompanyModel } from "../../model/companyModel";
import { UserModel } from "../../model/user.model";
import { AngularFireAuth } from "@angular/fire/auth";
import { Subject } from "rxjs";

@Component({
  selector: "ngx-support",
  templateUrl: "./support.component.html",
  styleUrls: ["./support.component.scss"],
})

export class SupportComponent implements OnInit {
  destroy$: Subject<boolean> = new Subject<boolean>();
  data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  } = {
      name: "",
      email: "",
      subject: "",
      message: ""
    }
  restaurant: CompanyModel;
  user: UserModel;
  constructor(
    private toastrService: NbToastrService,
    private afs: AngularFirestore,
    private afAuth: AngularFireAuth
  ) { }

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
            // getting current restaurant
            this.getCompany(this.user.companyID);
          });
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next(true);
    this.destroy$.unsubscribe();
  }

  getCompany(companyID: string) {
    this.afs
      .collection("restaurants")
      .doc<CompanyModel>(companyID)
      .get()
      .takeUntil(this.destroy$)
      .subscribe((companyDoc) => {
        this.restaurant = companyDoc.data() as CompanyModel;
        console.log(this.restaurant);
      });
  }

  validateForm() {
    if (!this.data.email) {
      this.toastrService.danger("Please enter your email address", "Error");
      return false

    }
    else if (!this.data.subject) {
      this.toastrService.danger("Please enter the subject", "Error");
      return false

    }
    else if (!this.data.message) {
      this.toastrService.danger("Please enter the message", "Error");
      return false
    }
    return true;
  }

  sendEmail() {
    if (!this.validateForm()) return;
    this.afs.collection("support").add({
      ...this.data,
      adminEmail: this.restaurant.email,
      companyID: this.user.companyID,
      userID: this.user.id,
      companyName: this.restaurant.name,
      partnerId: this.restaurant.partnerId || "",

    }).then(() => {
      this.data = {
        name: "",
        email: "",
        subject: "",
        message: ""
      }
      this.toastrService.success("Your message has been sent successfully", "Success");
    })
  }
}
