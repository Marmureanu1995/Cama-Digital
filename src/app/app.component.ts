/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
import { Component, OnInit, enableProdMode } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AnalyticsService } from './@core/utils/analytics.service';
import * as moment  from 'moment';

enableProdMode();

@Component({
  selector: 'ngx-app',
  template: '<router-outlet></router-outlet>',
})
export class AppComponent implements OnInit {

  constructor(private analytics: AnalyticsService, public translate: TranslateService) {
    translate.addLangs(['English', 'Deutsch', 'Francais', 'Nederlands']);
    translate.setDefaultLang('English');

    const browserLang = translate.getBrowserLang();
    if (localStorage.getItem('Lang') != null) {
      translate.setDefaultLang(localStorage.getItem('Lang'));
      translate.use(localStorage.getItem('Lang'));
    }
    else {
      translate.use('English');
    }
  }

  ngOnInit() {
    this.analytics.trackPageViews();
    //console.log(moment(1611898524*1000).toDate());
  }
}
