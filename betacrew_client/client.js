// Module Import
const net = require("net");

const PORT = 3000;
const PACKET_SIZE = 17;

let bufferCollector = Buffer.alloc(0);
let packetsRecieved = new Set();
let lastPacketReceived = 0;

const server = new net.Socket();

// All packets
function getAllPacketsRequest() {
  const requestPayload = createRequestPayload(1);
  server.write(requestPayload);
}

//Specific packet
function getResendPacketRequest(seq) {
  const requestPayload = createRequestPayload(2, seq);
  server.write(requestPayload);
}

const createRequestPayload = function (callType, seq) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt8(callType, 0);
  if (callType === 2) {
    buffer.writeUInt8(seq, 1);
  }
  return buffer;
};

// Function to process received packets
const processPackets = () => {
  while (bufferCollector.length >= PACKET_SIZE) {
    const symbol = bufferCollector.toString("ascii", 0, 4).trim();
    const buySellIndicator = String.fromCharCode(bufferCollector.readUInt8(4));
    const quantity = bufferCollector.readUInt32BE(5);
    const price = bufferCollector.readUInt32BE(9);
    const packetSeq = bufferCollector.readUInt32BE(13);

    console.log(`Symbol: ${symbol}`);
    console.log(`Buy/Sell Indicator: ${buySellIndicator}`);
    console.log(`Quantity: ${quantity}`);
    console.log(`Price: ${price}`);
    console.log(`Packet Sequence: ${packetSeq}`);
    console.log("\n Next Packet");

    packetsRecieved.add(packetSeq);
    lastPacketReceived = Math.max(lastPacketReceived, packetSeq);

    bufferCollector = bufferCollector.slice(PACKET_SIZE);
  }
};

server.on("data", (data) => {
  bufferCollector = Buffer.concat([bufferCollector, data]);
  processPackets();
});

// Handle errors
server.on("error", (err) => {
  console.error(`Error: ${err.message}`);
});

//Closing the connection
server.on("close", () => {
  console.log("Connection closed");

  //Missing sequences to be requested again
  const missingSequences = [];
  for (let i = 1; i <= lastPacketReceived; i++) {
    if (!packetsRecieved.has(i)) {
      missingSequences.push(i);
    }
  }
  missingSequences.forEach((seq) => {
    console.log(`Requesting missing packet sequence: ${seq}`);
    getResendPacketRequest(seq);
  });
});

// Connect to the server and make initial requests
server.connect(PORT, "localhost", () => {
  console.log("Connected to server.");

  getAllPacketsRequest();
});
