import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { AngularFirestore } from '@angular/fire/firestore';
import { map, take } from "rxjs/operators";
import * as moment from 'moment';
import { MediaModel } from "../model/media.model";
import { UserModel } from '../model/user.model';
import { FirebaseTimeService } from './firebase-time.service';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  playerLength: number;
  PlayerLimit: number;
  constructor(private afs: AngularFirestore, private afAuth: AngularFireAuth, private httpclient: HttpClient, private _firebaseServerTime: FirebaseTimeService) {
  }


  getUserUID() {
    return this.afAuth.authState;
  }
  updateuserpass(pass, user, restaurant) {
    user.pass = pass;
    user.confirmPass = pass;
    this.afs.collection('users').doc(user.id).update(user);
  }
  updatecompanypass(pass, user, restaurant) {
    restaurant.pass = pass;
    restaurant.confirmPass = pass;
    this.afs.collection('restaurants').doc(user.companyID).update(restaurant);

  }
  updateAllMedia(companyID) {
    this.afs.collection('restaurants').doc(companyID)
      .collection('media',
        ref => ref.orderBy('creationDate', 'desc')).snapshotChanges().pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as MediaModel;
            const id = a.payload.doc.id;
            return { id, ...data };
          })),
        ).pipe(take(1)).subscribe(docs => {
          docs.filter(d => d.width == null).forEach(doc => {
            this.afs.collection('restaurants').doc(companyID)
              .collection('media').doc(doc.id).update({
                width: 0,
                height: 0
              })
          })
        });

    this.afs.collection('restaurants').doc(companyID)
      .collection('media',
        ref => ref.where('width', '==', '0')).snapshotChanges().pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as MediaModel;
            const id = a.payload.doc.id;
            return { id, ...data };
          })),
        ).pipe(take(1)).subscribe(docs => {
          docs.forEach(doc => {
            this.afs.collection('restaurants').doc(companyID)
              .collection('media').doc(doc.id).update({
                width: 0,
                height: 0
              })
          })
        });
  }

  getChannelList(companyID) {
    return this.afs.collection('restaurants').doc(companyID).collection('channel', ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }


  getBannersSchedule(media) {
    return this.afs.firestore.collection('banners').doc(media.id).collection('schedule').doc(media.id).get();
  }

  getPlayList(companyID) {
    return this.afs.collection('restaurants').doc(companyID).collection('playlist', ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }

  getAllMedia(companyID) {
    return this.afs.collection('restaurants').doc(companyID).collection('media', ref => ref.orderBy('creationDate', 'desc')).valueChanges();
  }

  getAuthState() {
    return this.afAuth.authState;
  }

  getUserProfile(uid) {
    return this.afs.collection('users').doc<UserModel>(uid).valueChanges();
  }


  getPlaylist(companyID) {
    return this.afs.collection('restaurants').doc(companyID).collection('playlist').valueChanges();
  }


  getChannelPlayList(companyId, channelID) {
    return this.httpclient
      .get(`https://europe-west1-${environment.firebase.projectId}.cloudfunctions.net/getchannelplaylists?companyID=${companyId}&channelID=${channelID}`);
  }


  addNewChannel(companyId, channel) {
    channel.id = this.afs.createId();
    if (channel.creationDate && channel.creationDate.seconds) {
      channel.creationDate = moment(channel.creationDate.seconds * 1000).toDate();
    }
    if (typeof channel.creationDate == 'string') {
      channel.creationDate = new Date(channel.creationDate);
    }
    return this.afs.collection('restaurants').doc(companyId).collection('channel').doc(channel.id).set(channel);
  }


  deleteChannel(companyId, channelID) {
    return this.afs.collection('restaurants').doc(companyId).collection('channel').doc(channelID).delete();
  }


  updateChannelName(companyId, channel) {
    if (channel.creationDate && channel.creationDate.seconds) {
      channel.creationDate = moment(channel.creationDate.seconds * 1000).toDate();
    }
    if (typeof channel.creationDate == 'string') {
      channel.creationDate = new Date(channel.creationDate);
    }
    channel.lastUpdated = this._firebaseServerTime.firebaseServerTime()
    return this.afs.collection('restaurants').doc(companyId).collection('channel').doc(channel.id).update(channel)
  }

  getSchedule(companyID, ChannelId) {
    return this.afs.collection('restaurants').doc(companyID)
      .collection('channel').doc(ChannelId)
      .collection('schedule').valueChanges();
  }


  updateSchedule(companyID, channelID, schedule) {
    return this.afs.firestore.collection('restaurants').doc(companyID).collection('channel').doc(channelID)
      .collection('schedule').doc(schedule.id).set(Object.assign({}, schedule));
  }


  updateChannelSchedule(companyID, channel) {
    if (channel.creationDate && channel.creationDate.seconds) {
      channel.creationDate = moment(channel.creationDate.seconds * 1000).toDate();
    }
    if (typeof channel.creationDate == 'string') {
      channel.creationDate = new Date(channel.creationDate);
    }
    channel.lastUpdated = this._firebaseServerTime.firebaseServerTime()
    return this.afs.firestore.collection('restaurants').doc(companyID).collection('channel')
      .doc(channel.id).update(Object.assign({}, channel));
  }


  updateChannelSetting(companyID, channel) {
    if (channel.creationDate && channel.creationDate.seconds) {
      channel.creationDate = moment(channel.creationDate.seconds * 1000).toDate();
    }
    if (typeof channel.creationDate == 'string') {
      channel.creationDate = new Date(channel.creationDate);
    }
    channel.lastUpdated = this._firebaseServerTime.firebaseServerTime()
    return this.afs.firestore.collection('restaurants').doc(companyID).collection('channel')
      .doc(channel.id).update(Object.assign({}, channel));
  }

  updateChannel(companyID, channel) {
    if (channel.creationDate && channel.creationDate.seconds) {
      channel.creationDate = moment(channel.creationDate.seconds * 1000).toDate();
    }
    if (typeof channel.creationDate == 'string') {
      channel.creationDate = new Date(channel.creationDate);
    }
    channel.lastUpdated = this._firebaseServerTime.firebaseServerTime()
    return this.afs.firestore.collection('restaurants').doc(companyID).collection('channel')
      .doc(channel.id).set(Object.assign({}, channel));
  }

  addNewPlayList(companyID, playList) {
    if (playList.creationDate && playList.creationDate.seconds) {
      playList.creationDate = moment(playList.creationDate.seconds * 1000).toDate();
    }
    if (typeof playList.creationDate == 'string') {
      playList.creationDate = new Date(playList.creationDate);
    }
    return this.afs.firestore.collection('restaurants').doc(companyID)
      .collection('playlist').doc(playList.id).set(playList);
  }

  upDatePlayListName(companyID, playList) {
    if (playList.creationDate && playList.creationDate.seconds) {
      playList.creationDate = moment(playList.creationDate.seconds * 1000).toDate();
    }
    if (typeof playList.creationDate == 'string') {
      playList.creationDate = new Date(playList.creationDate);
    }
    return this.afs.collection('restaurants').doc(companyID).collection('playlist').doc(playList.id).update(playList)
  }

  getAllCompanyUsers(companyID) {
    return this.afs.collection('users',
      ref => ref.where('companyID', '==', companyID)).valueChanges();
  }

  deleteMedia(companyID, mediaID) {
    return this.afs.collection('restaurants').doc(companyID).collection('media').doc(mediaID).delete();
  }

  deletePlayList(companyId, playListID) {
    return this.afs.collection('restaurants').doc(companyId).collection('playlist').doc(playListID).delete();
  }

  getPlaylistMediaSchedule(media, companyID, selectedPlaylist) {
    return this.afs.firestore.collection('restaurants').doc(companyID).collection('playlist').doc(selectedPlaylist.id)
      .collection('schedule').doc(media.id).get();
  }

  updatePlayList(companyID, playList) {
    if (playList.creationDate && playList.creationDate.seconds) {
      playList.creationDate = moment(playList.creationDate.seconds * 1000).toDate();
    }
    if (typeof playList.creationDate == 'string') {
      playList.creationDate = new Date(playList.creationDate);
    }

    return this.afs.firestore.collection('restaurants').doc(companyID).collection('playlist').doc(playList.id)
      .update({ media: playList.media, previewTime: playList.previewTime })
  }




  getAppVersion() {
    return this.afs.collection('version').doc('version').valueChanges();
  }

  getCompanyDevices(companyID) {
    return this.afs.collection('networkDevices', ref => ref.where('companyID', '==', companyID)).valueChanges();
  }

  getCompanyDeviceStatistics(deviceID) {
    return this.afs.collection('networkDevices').doc(deviceID).collection('userstatistics').doc(deviceID).valueChanges();
  }

}
