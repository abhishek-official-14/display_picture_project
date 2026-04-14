export const PLATFORM_SPECS = {
  whatsapp: [{ label: '640x640', width: 640, height: 640 }],
  instagram: [{ label: '320x320', width: 320, height: 320 }],
  facebook: [
    { label: '170x170', width: 170, height: 170 },
    { label: '720x720-hd', width: 720, height: 720 }
  ],
  snapchat: [{ label: '320x320', width: 320, height: 320 }],
  twitter: [{ label: '400x400', width: 400, height: 400 }],
  linkedin: [{ label: '400x400', width: 400, height: 400 }]
};

export const QUALITY_MAP = {
  jpg: { quality: 90, mozjpeg: true },
  jpeg: { quality: 90, mozjpeg: true },
  png: { compressionLevel: 9, quality: 95 },
  webp: { quality: 90 }
};
