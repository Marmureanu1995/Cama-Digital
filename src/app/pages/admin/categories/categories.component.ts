import { Component, OnInit, TemplateRef } from '@angular/core';
import { NbDialogService, NbToastrService } from '@nebular/theme';
import { AngularFirestore, AngularFirestoreCollection } from "@angular/fire/firestore";
import { AngularFireAuth } from "@angular/fire/auth";
import { UserModel } from "../../../model/user.model";
import { map, finalize } from 'rxjs/operators';
import { ChannelModel } from "../../../model/channel.model";
import { PaginationService } from '../../../services/pagination.service';
import { Observable } from 'rxjs/internal/Observable';
import { SortPipe } from '../../../pipes/sort.pipe';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'ngx-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
})
export class CategoriesComponent implements OnInit {
  categoryName: string = '';
  dialogRef: any;
  companyID: any;
  categories: any;
  query: any;
  pagination: any = {};
  pagedItems: any[];
  private afsCategory: AngularFirestoreCollection<any>;
  constructor(private _paginationService: PaginationService, private dialogService: NbDialogService, private afs: AngularFirestore,
    public translate: TranslateService, private toastrService: NbToastrService, private afAuth: AngularFireAuth, private sortPipe: SortPipe) {

  }

  ngOnInit() {
    this.fectchCategories();
  }
  fectchCategories() {
    this.afAuth.authState.subscribe(res => {
      if (res && res.uid) {
        this.afs.collection('users').doc<UserModel>(res.uid).get().subscribe(userDoc => {
          this.companyID = userDoc.data().companyID;

          // Fetch Categories
          this.afsCategory = this.afs.collection('restaurants').doc(this.companyID).collection('category');
          this.afsCategory.snapshotChanges().pipe(
            map(actions => actions.map(a => {
              const data = a.payload.doc.data();
              const id = a.payload.doc.id;
              return { id, ...data };
            })),
          ).subscribe(docs => {
            this.categories = docs;
            this.categories = this.sortPipe.transform(this.categories, 'categoryName');
            this.setPage(1);
          });
        })
      }
    })
  }
  setPage(page: number) {
    this.pagination = this._paginationService.getPagination(this.categories.length, page);
    if (page < 1 || page > this.pagination.totalPages) {
      this.pagedItems = [];
      return;
    }
    // Get pagination object from service
    // Get current page of items
    this.pagedItems = this.categories.slice(this.pagination.startIndex, this.pagination.endIndex + 1);
  }
  edit(EditDialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(
      EditDialog,
      { context: JSON.parse(JSON.stringify(item)) });
  }
  updateCategoryName(item) {
    this.afs.collection('restaurants').doc(this.companyID).collection('category').doc(item.id).update({
      categoryName: item.categoryName,
      id: item.id,
    }).then(() => {
      this.dialogRef.close(); // close dialog
      this.toastrService.success('Category updated successfully', 'Update Category');
    });
  }

  add(CategoryDialog: TemplateRef<any>) {
    this.categoryName = '';
    this.dialogRef = this.dialogService.open(
      CategoryDialog,
      { context: 'New category is added.' });
  }
  createCategory() {
    if (this.categoryName === undefined || this.categoryName === null || this.categoryName === "") {
      this.toastrService.danger('Category Name must be Entered', 'INVALID CATEGORY NAME ');
      return;
    }
    let id = this.afs.createId();
    this.afs.collection('restaurants').doc(this.companyID).collection('category').doc(id).set({
      categoryName: this.categoryName,
      id: id,
    }).then(() => {
      this.dialogRef.close(); // close dialog
      this.toastrService.success('Category added successfully', 'Add Category');
    });
  }
  delete(DeleteDialog: TemplateRef<any>, item: any) {
    this.dialogRef = this.dialogService.open(
      DeleteDialog,
      { context: item });
  }
  deleteC(item) {
    this.afsCategory.doc(item.id).delete().then(() => {
      this.dialogRef.close(); // close dialog
      this.toastrService.success('Category deleted successfully', 'Delete Category');

    });
  }
}
