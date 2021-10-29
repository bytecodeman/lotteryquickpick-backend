const MongoClient = require("mongodb").MongoClient;

const url = `mongodb+srv://lotteryquickpick:${process.env.MONGODB_PASSWORD}@cluster0-dqwyv.mongodb.net/lotteryquickpicklog?retryWrites=true&w=majority`;

const logData = async (logData) => {
  const client = new MongoClient(url, { useUnifiedTopology: true });
  try {
    client.connect().then((client) => {
      const db = client.db();
      const result = db.collection("log").insertOne(logData);
    });
    return { message: "Success storing data" };
  } catch (error) {
    return { message: "Could not store data." };
  } finally {
    client.close();
  }
};

exports.logData = logData;
