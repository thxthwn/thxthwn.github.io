import "dotenv/config";
import fs from 'fs';

async function testTitleMatch() {
  const dxdataUrl = process.env.VITE_DXDATA_URL;
  if (!dxdataUrl) throw new Error("VITE_DXDATA_URL is missing in .env");
  const dxResponse = await fetch(dxdataUrl);
  const dxdata = await dxResponse.json();

  const otogeDbUrl = process.env.VITE_OTOGE_DB_URL;
  if (!otogeDbUrl) throw new Error("VITE_OTOGE_DB_URL is missing in .env");
  const otogeResponse = await fetch(otogeDbUrl);
  const otogeData = await otogeResponse.json();

  const imageMap = new Map<string, string>();
  otogeData.forEach((s: any) => {
    if (s.title && s.image_url) {
      imageMap.set(s.title, s.image_url);
    }
  });

  let matchCount = 0;
  let mismatchCount = 0;
  
  dxdata.songs.forEach((song: any) => {
    if (imageMap.has(song.title)) {
      matchCount++;
    } else {
      mismatchCount++;
      if (mismatchCount < 10) console.log("Missing match:", song.title);
    }
  });

  console.log(`Matched: ${matchCount}, Mismatched: ${mismatchCount}`);
}

testTitleMatch();
