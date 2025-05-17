import { NgModule } from '@angular/core';

import { ThemeModule } from '../../@theme/theme.module';
import {PlaylistComponent} from './playlist.component';
import {ResizableModule} from 'angular-resizable-element';
import {DragDropModule} from '@angular/cdk/drag-drop';
import {MainPipe} from '../../pipes/main-pipe.module';
import {DragulaModule} from 'ng2-dragula';
import { AngularDraggableModule } from 'angular2-draggable';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
// AoT requires an exported function for factories
export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient);

  //return new TranslateHttpLoader(httpClient, 
    //environment.feServerUrl + '/assets/i18n/', '.json'); 
}

@NgModule({
  imports: [
    ThemeModule,
    ResizableModule,
    DragDropModule,
    MainPipe,
    AngularDraggableModule,
    DragulaModule.forRoot(),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    })
  ],
  declarations: [
    PlaylistComponent,
  ],
})
export class PlaylistModule { }
