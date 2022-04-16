const TABLE_NAME = process.env.GREETINGS_TABLE;
const AWS = require("aws-sdk");
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.saveHello = async (event: any) => {
  const name = event.queryStringParameters.name;

  const item = {
    id: name,
    name: name,
    date: Date.now(),
  };

  const savedItem = await saveItem(item);

  return {
    statusCode: 200,
    body: JSON.stringify(savedItem),
  };
};

async function saveItem(item: any) {
  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };

  return dynamo
    .put(params)
    .promise()
    .then(() => {
      return item;
    });
}

exports.getHello = async (event: any) => {
  const name = event.queryStringParameters.name;

  const item = await getHelloItem(name);

  return {
    statusCode: 200,
    body: JSON.stringify(item),
  };
};

exports.reactToEvent = async () => {
  const item = {
    id: "SAVED BY A TRIGGER",
    name: "SAVED BY A TRIGGER",
    date: new Date().toLocaleDateString(),
  };
  const params = {
    TableName: TABLE_NAME,
    Item: item,
  };

  await dynamo.put(params).promise();
};

async function getHelloItem(name: string) {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      id: name,
    },
  };

  try {
    const { Item } = await dynamo.get(params).promise();

    if (Item) {
      return Item;
    } else {
      return "This greeting not exists";
    }
  } catch (e) {
    return e;
  }
}

// const AWS = require("aws-sdk");
// const docClient = new AWS.DynamoDB.DocumentClient();

// async function getCartItemsById(cartItemsId: any) {
//     const params = {
//         TableName: process.env.table_cart_items,
//         Key: {
//             id: cartItemsId.id,
//             id_user: cartItemsId.id_user
//         },
//     };
//     try {
//         const { Item } = await docClient.get(params).promise();
//         return Item;
//     } catch (err) {
//         console.log("DynamoDB error: ", err);
//     }
// }
