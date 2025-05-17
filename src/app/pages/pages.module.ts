import { NgModule } from '@angular/core';
import { PagesComponent } from './pages.component';
import { ChannelModule } from './channel/channel.module';
import { MediaModule } from './media/media.module';
import { PagesRoutingModule } from './pages-routing.module';
import { ThemeModule } from '../@theme/theme.module';
import { MiscellaneousModule } from './miscellaneous/miscellaneous.module';
import { PlaylistModule } from './playlist/playlist.module';
import { LoginModule } from './login/login.module';
import { NetworkComponent } from './network/network.component';
import { ChannelassociationComponent } from './network/channelassociation/channelassociation.component';
import { PlayerComponent } from './network/player/player.component';
import { NetworkhealthComponent } from './network/networkhealth/networkhealth.component';
import { AdminComponent } from './admin/admin.component';
import { UsersComponent } from './admin/users/users.component';
import { CompanyUsersComponent } from './restaurant/users/users.component';
import { CategoriesComponent } from './admin/categories/categories.component';
import { LicenseComponent } from './admin/license/license.component';
import { ChannelassociationModule } from './network/channelassociation/channelassociation.module';
import { DragulaModule } from 'ng2-dragula';
import { CompanyComponent } from './restaurant/restaurant.component';
import { CompanychannelsModule } from './companychannels/companychannels.module';
import { SearchPipe } from '.././search.pipe';
import { MainPipe } from "../pipes/main-pipe.module";
import { PaginationService } from '../services/pagination.service';
import { SortPipe } from '../pipes/sort.pipe';
import { ProfileComponent } from './profile/profile.component';
import { ChangePasswordComponent } from './change-password/change-password.component';
import { TruncatePipe } from '../pipes/truncate.pipe';
import { CompanyCategoriesComponent } from './restaurant/categories/categories.component';
import { CompanyLicenseComponent } from './restaurant/license/license.component';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { PendingChangesComponent } from './pending-changes/pending-changes.component';
import { ChangeFormatPipe } from '../pipes/date-format-pipe.module';
import { AgmCoreModule } from '@agm/core';
import { DashboardPage } from './dashboard/dashboard.component';
import { AgmMarkerClustererModule } from '@agm/markerclusterer';
import { Select2Module } from 'ng-select2-component';
import { environment } from '../../environments/environment';
import { TemplatesComponent } from './templates/template.component';
import { PartnersComponent } from './partners/partners.component';
import { PartnersUsersComponent } from './partners/users/users.component';
import { SupportComponent } from './support/support.component';


// AoT requires an exported function for factories
export function HttpLoaderFactory(httpClient: HttpClient) {
  return new TranslateHttpLoader(httpClient);

  //return new TranslateHttpLoader(httpClient, 
  //environment.feServerUrl + '/assets/i18n/', '.json'); 
}

const PAGES_COMPONENTS = [
  PagesComponent,
];

@NgModule({
  imports: [
    PagesRoutingModule,
    ThemeModule,
    ChannelModule,
    MediaModule,
    MiscellaneousModule,
    PlaylistModule,
    LoginModule,
    ChannelassociationModule,
    DragulaModule.forRoot(),
    CompanychannelsModule,
    MainPipe,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpClient]
      }
    }),
    AgmCoreModule.forRoot({
      apiKey: environment.firebase.apiKey,
      libraries: ['places']
    }),
    AgmMarkerClustererModule,
    Select2Module
  ],
  declarations: [
    //@ts-ignore
    ...PAGES_COMPONENTS,
    DashboardPage,
    NetworkComponent,
    ChannelassociationComponent,
    PlayerComponent,
    NetworkhealthComponent,
    AdminComponent,
    UsersComponent,
    CompanyUsersComponent,
    PartnersUsersComponent,
    CategoriesComponent,
    LicenseComponent,
    ChannelassociationComponent,
    CompanyComponent, SearchPipe, ProfileComponent, ChangePasswordComponent,
    CompanyCategoriesComponent,
    CompanyLicenseComponent,
    PendingChangesComponent,
    TemplatesComponent,
    PartnersComponent,
    SupportComponent
  ],
  providers: [
    PaginationService,
    SortPipe,
    TruncatePipe,
    ChangeFormatPipe
  ],
  entryComponents: [ChangePasswordComponent, ProfileComponent, PendingChangesComponent]
})
export class PagesModule {
}
