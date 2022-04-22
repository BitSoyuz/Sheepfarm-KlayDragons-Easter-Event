const Caver = require("caver-js");
const caver = new Caver(new Caver.providers.WebsocketProvider("wss://klaytn-node.klu.bs:9091"));
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const cron = require("node-cron");
const superagent = require("superagent");
const fs = require("fs");
const RealWorldContract = new caver.kct.kip17("0xa9f07b1260bb9eebcbaba66700b00fe08b61e1e6");
const MetalandContract = new caver.kct.kip17("0xf28191e65F145dd5CffF98cfe8792501a11074cB");
const DragonContract = new caver.kct.kip17("0xcd8fbf9057666a60e59fcc4ee239a7fefdcae479");
const PastureList = require("./Pastures.json");

let HolderArray = [];
let CapturedDate;
let Initialized = false;

server.listen(1823);
app.use(express.static("./Web"));
app.set("view engine", "ejs");
app.set("views", "./Web");

io.on("connection", async (socket) => {
    socket.on("QueryList", async (req) => {
        socket.emit("QueryList", { "List" : HolderArray, "Date": CapturedDate, "Initialized": Initialized });
    });
});

async function Init(){
    let CaptureDate = (new Date()).toUTCString();
    let List = {};
    for(i=0;i<PastureList.length;i++){
        let Pasture = PastureList[i];
        let PastureNumber = Pasture[0];
        let Capacity = Pasture[1];

        let Holder = await RealWorldContract.ownerOf(caver.utils.toHex(PastureNumber));
        if(String(Holder).toLowerCase() == "0xf28191e65F145dd5CffF98cfe8792501a11074cB".toLowerCase()){
            Holder = await MetalandContract.ownerOf(caver.utils.toHex(PastureNumber));
        }
        if(typeof List[Holder] == "undefined") {List[Holder] = 0;}
        switch(Capacity){
            case 3:
                List[Holder] += 10;
                break;
            case 4:
                List[Holder] += 15;
                break;
            case 5:
                List[Holder] += 20;
                break;
        }
    }
    for(a=1;a<=10000;a++){
        let Holder = await DragonContract.ownerOf(caver.utils.toHex(a));
        if(Holder.toLowerCase() != "0x23bfEd3B571b56C29D1C9DB22D9A3e8486CC3C47".toLowerCase()){
            let Rarity = ((await superagent.get("https://fs.klaymysteryegg.io/Metadata/Dragon/" + a + ".json")).body)["attributes"][0]["value"];
            switch(Rarity){
                case "Unique":
                    Rarity = "Legendary";
                    break;
                case "Ancient":
                    Rarity = "Epic";
                    break;
            }
            if(typeof List[Holder] == "undefined") {List[Holder] = 0;}
            switch(Rarity){
                case "Legendary":
                    List[Holder] += 25;
                    break;
                case "Epic":
                    List[Holder] += 15;
                    break;
                case "Rare":
                    List[Holder] += 10;
                    break;
                case "Normal":
                    List[Holder] += 3;
                    break;
            }
        }
    }
    let Array = [];
    for(b=0;b<Object.keys(List).length;b++){
        Array.push({"Holder": Object.keys(List)[b], "Points": List[Object.keys(List)[b]]});
    }
    Array = Array.sort(function(a, b) {
        return b["Points"] - a["Points"];
    });
    CapturedDate = CaptureDate;
    HolderArray = Array;
    Initialized = true;
    fs.writeFileSync("Captured/" + CapturedDate + ".json", JSON.stringify(HolderArray, null, 4));
}

cron.schedule("*/15 * * * *", async() => {
    Init();
});

Init();