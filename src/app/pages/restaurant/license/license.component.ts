import {Component, OnInit, TemplateRef} from '@angular/core';
import {NbDialogService} from '@nebular/theme';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'ngx-companylicense',
  templateUrl: './license.component.html',
  styleUrls: ['./license.component.scss'],
})
export class CompanyLicenseComponent implements OnInit {

  constructor(private dialogService: NbDialogService,public translate: TranslateService) { }

  ngOnInit() {
  }
  edit(EditDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(
      EditDialog,
      { context: item });
  }
  add(LicenseDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(
      LicenseDialog,
      { context: item });
  }
  delete(DeleteDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(
      DeleteDialog,
      { context: item });
  }
  deactivate(DeactivateDialog: TemplateRef<any>, item: any) {
    this.dialogService.open(
      DeactivateDialog,
      { context: item });
  }

}
