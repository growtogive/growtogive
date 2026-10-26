import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: 'growtogive-website',
  keyFilename: process.env.NODE_ENV === 'production'
    ? '/etc/secrets/gcs-service-account.json'
    : './gcs-service-account.json',
});

// Set your GCS bucket name (or define GCP_BUCKET_NAME in your environment variables)
const bucketName = process.env.GCP_BUCKET_NAME || 'media-gtg-website';
export const bucket = storage.bucket(bucketName);