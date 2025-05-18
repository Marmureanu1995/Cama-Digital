export class MediaModel {
  id: string;
  user_id: string;
  name: string;
  type: string;
  size: string;
  creationDate: any;
  length: string;
  path: string;
  url: string;
  width: number;
  height: number;
  thumbnailPath: string;
  thumbnailURL: string;

  location: string;
  scale: string;
  forecastdays: number;
  state: boolean = false;

  pictures: any;
  gerdenSize: string;
  groundArea: string;
  price: string;
  totalArea: string;
  totalBaths: string;
  totalToilets: string;
  isTemplate?: boolean;
  folderBelongsTo?:string;
}

export class ProgressBarModel {
  name: string;
  value: number;
}
