/**
 * @license
 * Copyright Akveo. All Rights Reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 */
var config = require('../../env/firebase.json');


export const environment = {
  production: true,
  firebase : {
   ...config
  },
};