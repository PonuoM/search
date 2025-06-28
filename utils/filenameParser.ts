import type { CallMetadata } from '../types';

// Regex to capture parts from filename like: myrecordings_20250626_191131_out_%2B66945547266_%2B66928708750.WAV
// Supports common audio extensions like WAV, MP3, M4A, OGG, FLAC
const FILENAME_REGEX = /^myrecordings_(\d{8})_(\d{6})_(in|out)_([^_]+)_([^_.]+)\.(WAV|MP3|M4A|OGG|FLAC)$/i;

const formatPhoneNumber = (phone: string): string => {
  return phone.replace(/%2B/g, ''); // Remove %2B, do not prepend 0
};

export const parseCallFilename = (filename: string): CallMetadata | null => {
  const match = filename.match(FILENAME_REGEX);

  if (!match) {
    return null;
  }

  const [, dateStr, timeStr, callTypeRaw, sourcePhoneRaw, destinationPhoneRaw] = match;

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  const hour = timeStr.substring(0, 2);
  const minute = timeStr.substring(2, 4);
  const second = timeStr.substring(4, 6);

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
    callType: callTypeRaw.toLowerCase() === 'out' ? 'โทรออก' : 'โทรเข้า',
    sourcePhone: formatPhoneNumber(sourcePhoneRaw),
    destinationPhone: formatPhoneNumber(destinationPhoneRaw),
    originalFilename: filename,
  };
};