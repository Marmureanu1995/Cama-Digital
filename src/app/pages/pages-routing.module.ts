import { RouterModule, Routes } from '@angular/router';
import { NgModule } from '@angular/core';

import { PagesComponent } from './pages.component';
import { ChannelComponent } from './channel/channel.component';
import { MediaComponent } from './media/media.component';
import { PlaylistComponent } from './playlist/playlist.component';
import { NetworkComponent } from './network/network.component';
import { AdminComponent } from './admin/admin.component';
import { CompanyComponent } from './restaurant/restaurant.component';
import { CompanychannelsComponent } from './companychannels/companychannels.component';
import { ProfileComponent } from './profile/profile.component';
import { PendingChangesComponent } from './pending-changes/pending-changes.component';
import { DashboardPage } from './dashboard/dashboard.component';
import { TemplatesComponent } from './templates/template.component';
import { PartnersComponent } from './partners/partners.component';
import { SupportComponent } from './support/support.component';


const routes: Routes = [{
  path: '',
  component: PagesComponent,
  children: [
    {
      path: 'dashboard',
      component: DashboardPage,
    },
    {
      path: 'channel',
      component: ChannelComponent,
    },
    {
      path: 'media',
      component: MediaComponent,
    },
    {
      path: 'playlist',
      component: PlaylistComponent,
    },
    {
      path: 'screens',
      component: NetworkComponent,
    },
    {
      path: 'templates',
      component: TemplatesComponent,
    },
    {
      path: 'admin',
      component: AdminComponent,
    },
    {
      path: 'restaurants',
      component: CompanyComponent,
    },
    {
      path: 'partners',
      component: PartnersComponent,
    },
    {
      path: 'companychannels',
      component: CompanychannelsComponent,
    },
    {
      path: 'profile',
      component: ProfileComponent,
    },
    {
      path: 'ChannelPendingChanges',
      component: PendingChangesComponent,
    },
    {
      path: '',
      redirectTo: 'channel',
      pathMatch: 'full',
    },
    {
      path: 'support',
      component: SupportComponent
    },
  ],
}];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class PagesRoutingModule {
}
