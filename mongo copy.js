const MongoClient = require("mongodb").MongoClient;

const url = `mongodb+srv://lotteryquickpick:${process.env.MONGODB_PASSWORD}@cluster0-dqwyv.mongodb.net/lotteryquickpicklog?retryWrites=true&w=majority`;

const logData = async (logData) => {
  const client = new MongoClient(url);

  try {
    await client.connect();
    const db = client.db();
    const result = db.collection("log").insertOne(logData);
  } catch (error) {
    return { message: "Could not store data." };
  }
  client.close();

  return { message: "Success storing data" };
};

exports.logData = logData;
