import fs from 'fs';

async function testTitleMatch() {
  const dxResponse = await fetch("https://raw.githubusercontent.com/gekichumai/dxrating/main/packages/dxdata/dxdata.json");
  const dxdata = await dxResponse.json();

  const otogeResponse = await fetch("https://raw.githubusercontent.com/zvuc/otoge-db/master/maimai/data/maimai_songs.json");
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
