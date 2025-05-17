import { Component, OnInit } from "@angular/core";
import { AngularFirestore } from "@angular/fire/firestore";
import { NbToastrService } from "@nebular/theme";
import { CompanyModel } from "../../model/companyModel";
import { UserModel } from "../../model/user.model";
import { AngularFireAuth } from "@angular/fire/auth";
import { Subject } from "rxjs";
import { environment } from "../../../environments/environment.prod";

@Component({
  selector: "ngx-templateDesign",
  templateUrl: "./template.component.html",
  styleUrls: ["./template.component.scss"],
})
export class TemplatesComponent implements OnInit {
  destroy$: Subject<boolean> = new Subject<boolean>();

  templateName: string = "";
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

  createTemplate() {
    if (this.templateName === "" || this.templateName === " ") {
      this.toastrService.danger("Name Canot Be Empty", "Error");
      return;
    }
    if (!this.restaurant.id) {
      this.toastrService.danger("Restaurant Not Found", "Error");
      return;
    }

    this.afs
      .collection("restaurants")
      .doc(this.restaurant.id)
      .collection("media")
      .add({
        creationDate: new Date(),
        height: 0,
        length: "10",
        name: this.templateName,
        path: "/public/blank.png",
        size: "0",
        state: false,
        thumbnailPath: "http://" + environment.firebase.ip + ":3000/data/exports",
        type: "image/png",
        url: "http://" + environment.firebase.ip + ":3000/data/exports",
        user_id: this.user.id,
        with: 0,
        isTemplate: true,
      })
      .then((res) => {
        const id = res.id;
        res.update({
          id: id,
          thumbnailPath:
            "https://europe-west1-" + environment.firebase.projectId + ".cloudfunctions.net/getProxy?url=http://" + environment.firebase.ip + ":3000/data/exports/" + id + ".png",
          url: "https://europe-west1-" + environment.firebase.projectId + ".cloudfunctions.net/getProxy?url=http://" + environment.firebase.ip + ":3000/data/exports/" + id + ".png",
        });
        window.location.href = "http://" + environment.firebase.ip + ":3000/?templateId=" + id;
        this.toastrService.success("Template Created", "Success");
      });
  }
  nameChanged($event) {
    this.templateName = $event.target.value;
  }
}
