exports.handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  const params = new URLSearchParams(event.queryStringParameters || {});
  const store = params.get("store");
  const MASTER_KEY = "$2a$10$HW.QVbOQ4z990.l/tM2d/OVSj3TFfSD4c9KuKw/WTz/n17oPpXHxm";

  const bins = {
    clients: "6a01a71ec0954111d807ffd4",
    properties: "6a01a71ec0954111d807ffd5",
    tours: "6a01a71f250b1311c332eae6",
  };

  if (!store || !bins[store]) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid store" }) };
  }

  const binId = bins[store];
  const baseUrl = `https://api.jsonbin.io/v3/b/${binId}`;

  try {
    if (event.httpMethod === "GET") {
      const res = await fetch(baseUrl + "/latest", {
        headers: { "X-Master-Key": MASTER_KEY },
      });
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data.record) };
    }

    if (event.httpMethod === "PUT") {
      const res = await fetch(baseUrl, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": MASTER_KEY,
        },
        body: event.body,
      });
      const data = await res.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
