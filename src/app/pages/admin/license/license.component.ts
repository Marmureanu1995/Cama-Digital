import { Component, OnInit, TemplateRef } from '@angular/core';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { AngularFirestore, AngularFirestoreCollection } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { UserModel } from "../../../model/user.model";
import { map } from "rxjs/operators";
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'ngx-license',
  templateUrl: './license.component.html',
  styleUrls: ['./license.component.scss'],
})
export class LicenseComponent implements OnInit {

  licenseName: any;
  dialogRef: any;
  companyID: any;
  licenses: any;
  query: any;
  private afsLicense: AngularFirestoreCollection<any>;
  constructor(private dialogService: NbDialogService, private afs: AngularFirestore,
    private toastrService: NbToastrService, private afAuth: AngularFireAuth, public translate: TranslateService) { }

  ngOnInit() {
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('users').doc<UserModel>(res.uid).get().subscribe(userDoc => {
          this.companyID = userDoc.data().companyID;

          // Fetch License
          this.afsLicense = this.afs.collection('restaurants').doc(this.companyID).collection('license');
          this.licenses = this.afsLicense.snapshotChanges().pipe(
            map(actions => actions.map(a => {
              const data = a.payload.doc.data();
              const id = a.payload.doc.id;
              return { id, ...data };
            })),
          );


        })
      }
    })
  }
  edit(EditDialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(
      EditDialog,
      { context: item });
  }
  updateLicenseName(item) {
    this.afs.collection('restaurants').doc(this.companyID).collection('license').doc(item.id).update({
      licenseName: this.licenseName,
      id: item.id,
    }).then(() => {
      this.dialogRef.close(); // close dialog
      this.toastrService.success('License updated successfully', 'Update License');
    });
  }
  add(LicenseDialog: TemplateRef<any>) {
    this.licenseName = '';
    this.dialogRef = this.dialogService.open(
      LicenseDialog,
      { context: 'New license is added.' });
  }
  createLicense() {
    let id = this.afs.createId();
    this.afs.collection('restaurants').doc(this.companyID).collection('license').doc(id).set({
      licenseName: this.licenseName,
      id: id,
    }).then(() => {
      this.dialogRef.close(); // close dialog
      this.toastrService.success('License added successfully', 'Add License');
    });
  }
  delete(DeleteDialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(
      DeleteDialog,
      { context: item });
  }
  deleteL(item) {
    this.afsLicense.doc(item.id).delete().then(() => {
      this.dialogRef.close(); // close dialog
      this.toastrService.success('License deleted successfully', 'Delete License');

    });
  }
  deactivate(DeactivateDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(
      DeactivateDialog,
      { context: item });
  }

}
