import {Component, OnInit, TemplateRef} from '@angular/core';
import {NbDialogService} from '@nebular/theme';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'ngx-companycategories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
})
export class CompanyCategoriesComponent implements OnInit {

  constructor(private dialogService: NbDialogService,public translate: TranslateService) { }

  ngOnInit() {
  }
  edit(EditDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(
      EditDialog,
      { context: item });
  }
  add(CategoryDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(
      CategoryDialog,
      { context: item });
  }
  delete(DeleteDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(
      DeleteDialog,
      { context: item });
  }
}
