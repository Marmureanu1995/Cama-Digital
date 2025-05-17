import { TestBed } from '@angular/core/testing';

import { ChannelPendingChangeService } from './channel-pending-change.service';

describe('ChannelPendingChangeService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: ChannelPendingChangeService = TestBed.get(ChannelPendingChangeService);
    expect(service).toBeTruthy();
  });
});
