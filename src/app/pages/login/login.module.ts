import { NgModule } from '@angular/core';

import { ThemeModule } from '../../@theme/theme.module';
import { LoginComponent } from './login.component';
import {MainPipe} from '../../pipes/main-pipe.module';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http);
}
@NgModule({
  imports: [
    ThemeModule,
    MainPipe,
    TranslateModule.forRoot({
      loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
      }
  })
  ],
  declarations: [
    LoginComponent,
  ],
})
export class LoginModule { }
