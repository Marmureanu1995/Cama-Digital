import { NgModule } from '@angular/core';
import {CommonModule} from '@angular/common';

import {SafehtmlPipe} from './safehtml.pipe';
import { SortPipe } from './sort.pipe';
import { TruncatePipe } from './truncate.pipe';
import { ChangeFormatPipe } from './date-format-pipe.module';

@NgModule({
  declarations: [ SafehtmlPipe,SortPipe, TruncatePipe,ChangeFormatPipe ],
  imports: [ CommonModule],
  exports: [ SafehtmlPipe,SortPipe,TruncatePipe,ChangeFormatPipe],
})

export class MainPipe { }
