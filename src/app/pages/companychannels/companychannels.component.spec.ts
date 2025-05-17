import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanychannelsComponent } from './companychannels.component';

describe('CompanychannelsComponent', () => {
  let component: CompanychannelsComponent;
  let fixture: ComponentFixture<CompanychannelsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ CompanychannelsComponent ],
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CompanychannelsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
