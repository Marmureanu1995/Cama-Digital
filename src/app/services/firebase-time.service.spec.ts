import { TestBed } from '@angular/core/testing';

import { FirebaseTimeService } from './firebase-time.service';

describe('FirebaseTimeService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FirebaseTimeService = TestBed.get(FirebaseTimeService);
    expect(service).toBeTruthy();
  });
});
