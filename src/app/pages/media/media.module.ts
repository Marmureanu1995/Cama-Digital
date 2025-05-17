import { NgModule } from '@angular/core';
import { ThemeModule } from '../../@theme/theme.module';
import { MediaComponent } from './media.component';
import {MainPipe} from '../../pipes/main-pipe.module';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { NbDialogModule, NbSpinnerModule } from '@nebular/theme';
import {NgxImageCompressService} from 'ngx-image-compress';
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}
@NgModule({
  imports: [
    NbSpinnerModule,
    ThemeModule,
    MainPipe,
    NbDialogModule,
    TranslateModule.forRoot({
      loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
      }
    })
  ],
  providers: [NgxImageCompressService],
  declarations: [
    MediaComponent,
  ],
})
export class MediaModule { }
