import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import * as moment from "moment";
import * as mockdate from 'mockdate';

import { MediaComponent } from './media.component';

describe('PlaylistComponent', () => {
  let component: MediaComponent;
  let fixture: ComponentFixture<MediaComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ MediaComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(MediaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('set Date to next week and check console', () => {
    // Set the current date to next Monday
    const nextMonday = moment().add(1, 'week').startOf('isoWeek');
    mockdate.set(nextMonday.toDate());

    const array = component.getDateForCurrentAndNextWeek()
    
    console.log(array)

    expect(array[0]).toEqual(nextMonday.toDate());

    mockdate.reset();
  });


});
