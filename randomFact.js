const https = require("https");
const factURL = "https://nekos.life/api/v2/fact";
https.get(`${factURL}`, data => {
  console.log("\n");
  data.on("data", chunk => {
    let Fact = JSON.parse(chunk.toString());
    //reply(Fact.fact)
    console.log(Fact.fact,"\n");
  });
  data.on("error", err => {
    console.error(`Error: ${err}`);
  });
});