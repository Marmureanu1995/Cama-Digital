import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeModule } from '../../../@theme/theme.module';
import {ResizableModule} from 'angular-resizable-element';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MainPipe} from '../../../pipes/main-pipe.module';
import {DragulaModule} from 'ng2-dragula';
import { AngularDraggableModule } from 'angular2-draggable';
import { NbDialogService } from '@nebular/theme';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}
@NgModule({
  imports: [
    ThemeModule,
    ResizableModule,
    DragDropModule,
    AngularDraggableModule,
    MainPipe,
    DragulaModule,
    TranslateModule.forRoot({
      loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
      }
  })
  ],
  declarations: [
  ],
  providers : [NbDialogService],
})
export class ChannelassociationModule { }

